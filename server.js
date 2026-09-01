/* ─── ASBKI Covilhã — CMS Server ─────────────────────────────────────── */
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─── Vercel Blob (quando ASBKI_READ_WRITE_TOKEN está definido) ────────── */
let blob = null;
const BLOB_TOKEN = process.env.ASBKI_READ_WRITE_TOKEN || '';
try {
  if (BLOB_TOKEN) blob = require('@vercel/blob');
} catch { /* blob fica null — usa sistema de ficheiros local */ }

/* Opções com token explícito (necessário quando o prefix não é BLOB) */
const blobOpts = (extra = {}) => ({ ...extra, token: BLOB_TOKEN });

const CONTENT_FILE = path.join(__dirname, 'content.json');
const UPLOADS_DIR  = path.join(__dirname, 'assets', 'images', 'uploads');
const IMAGES_ROOT  = path.join(__dirname, 'assets', 'images');

/* ─── Leitura/escrita do conteúdo (local ou Blob) ─────────────────────── */
async function readContent() {
  if (blob) {
    /* Lê sempre a versão mais recente (URL único por gravação = sem cache CDN) */
    const { blobs } = await blob.list(blobOpts({ prefix: 'cms/content-v' }));
    if (blobs.length) {
      const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const r = await fetch(latest.url);
      return r.json();
    }
  }
  return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
}

async function writeContent(data) {
  const json = JSON.stringify(data, null, 2);
  if (blob) {
    /* Cria versão nova com timestamp — URL diferente em cada gravação */
    await blob.put(`cms/content-v${Date.now()}.json`, json, blobOpts({
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    }));
    /* Mantém apenas as últimas 5 versões */
    const { blobs: all } = await blob.list(blobOpts({ prefix: 'cms/content-v' }));
    const sorted = all.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    await Promise.all(sorted.slice(5).map(b => blob.del(b.url, blobOpts())));
  } else {
    const backup = CONTENT_FILE.replace('.json', `.backup-${Date.now()}.json`);
    if (fs.existsSync(CONTENT_FILE)) fs.copyFileSync(CONTENT_FILE, backup);
    fs.writeFileSync(CONTENT_FILE, json, 'utf-8');
    const dir = path.dirname(CONTENT_FILE);
    const backups = fs.readdirSync(dir)
      .filter(f => f.startsWith('content.backup-')).sort().reverse();
    backups.slice(3).forEach(f => fs.unlinkSync(path.join(dir, f)));
  }
}

/* ─── JWT stateless (não precisa de estado em memória) ───────────────── */
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function createToken() {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig     = crypto.createHmac('sha256', ADMIN_PASSWORD).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts;
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(`${header}.${payload}`).digest('base64url');
  const a = Buffer.from(sig, 'base64url');
  const b = Buffer.from(expected, 'base64url');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return !exp || exp > Date.now();
  } catch { return false; }
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  console.warn('AVISO: ADMIN_PASSWORD não definida — rotas de admin desativadas.');
  app.use('/admin', (_req, res) => res.status(503).send('CMS desativado'));
  app.use('/api/admin', (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
  app.post('/api/content', (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
  app.use('/api/upload',   (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
  app.use('/api/images',   (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
}

/* ─── Middleware ──────────────────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

/* ─── Multer (memória — funciona em Vercel e localmente) ──────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens JPEG, PNG, WebP, GIF ou SVG são permitidas'));
  },
});

/* ─── Auth middleware ─────────────────────────────────────────────────── */
function authRequired(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'CMS desativado' });
  if (verifyToken(req.headers['x-admin-token'])) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

/* ─── Routes ──────────────────────────────────────────────────────────── */

app.get('/api/content', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await readContent());
  } catch {
    res.status(500).json({ error: 'Erro ao ler conteúdo' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password incorreta' });
  res.json({ token: createToken() });
});

app.post('/api/content', authRequired, async (req, res) => {
  try {
    const content = req.body;
    if (!content || typeof content !== 'object')
      return res.status(400).json({ error: 'Conteúdo inválido' });
    await writeContent(content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', authRequired, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  const ext      = path.extname(req.file.originalname).toLowerCase();
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;

  try {
    if (blob) {
      const result = await blob.put(`uploads/${filename}`, req.file.buffer, blobOpts({
        access: 'public',
        contentType: req.file.mimetype,
      }));
      res.json({ url: result.url });
    } else {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
      res.json({ url: `/assets/images/uploads/${filename}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/upload', authRequired, async (req, res) => {
  const { filename } = req.body;
  if (!filename || (!blob && filename.includes('..')))
    return res.status(400).json({ error: 'Nome de ficheiro inválido' });

  try {
    if (blob) {
      await blob.del(filename, blobOpts()); // filename é a URL completa do Blob
    } else {
      const filePath = path.join(UPLOADS_DIR, path.basename(filename));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/images', authRequired, async (_req, res) => {
  try {
    if (blob) {
      const { blobs: items } = await blob.list(blobOpts({ prefix: 'uploads/' }));
      return res.json(items.map(b => ({
        filename: path.basename(b.pathname),
        url: b.url,
        size: b.size,
        deletable: true,
      })));
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const uploaded = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
      .map(f => ({
        filename: f,
        url: `/assets/images/uploads/${f}`,
        size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
        deletable: true,
      }));
    const rootSvgs = fs.readdirSync(IMAGES_ROOT)
      .filter(f => /\.svg$/i.test(f))
      .map(f => ({
        filename: f,
        url: `/assets/images/${f}`,
        size: fs.statSync(path.join(IMAGES_ROOT, f)).size,
        deletable: false,
      }));
    res.json([...uploaded, ...rootSvgs]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

/* ─── Start (local) / Export (Vercel serverless) ─────────────────────── */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nASBKI Covilhã CMS`);
    console.log(`   Website: http://localhost:${PORT}`);
    console.log(`   Admin:   http://localhost:${PORT}/admin\n`);
  });
}

module.exports = app;
