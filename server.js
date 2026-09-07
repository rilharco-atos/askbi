/* ─── ASBKI Covilhã — CMS Server ─────────────────────────────────────── */
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const log = require('./server/log');
const { securityHeaders } = require('./server/security');
const { requestLogger } = require('./server/request-log');
const { rateLimit } = require('./server/rate-limit');
const { checkAdminPassword, isAdminConfigured, getTokenSecret } = require('./server/auth');
const { validateContent, findPlaceholders } = require('./server/schema');
const contentStore = require('./server/content-store');
const { client: blob, blobOpts } = require('./server/blob');
const { createLeadsRouter } = require('./server/leads');
const { createPagesRouter } = require('./server/pages-router');

const app  = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR  = path.join(__dirname, 'assets', 'images', 'uploads');
const IMAGES_ROOT  = path.join(__dirname, 'assets', 'images');
const PAGES_DIR    = path.join(__dirname, 'pages');

const ADMIN_CONFIGURED = isAdminConfigured();
if (!ADMIN_CONFIGURED) {
  log.warn('auth.admin.disabled', { message: 'ADMIN_PASSWORD/ADMIN_PASSWORD_HASH não definidas — rotas de admin desativadas' });
}

/* ─── JWT stateless (não precisa de estado em memória) ───────────────── */
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function createToken() {
  const secret  = getTokenSecret();
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts;
  const secret = getTokenSecret();
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  let a, b;
  try { a = Buffer.from(sig, 'base64url'); b = Buffer.from(expected, 'base64url'); } catch { return false; }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return !exp || exp > Date.now();
  } catch { return false; }
}

function authRequired(req, res, next) {
  if (!ADMIN_CONFIGURED) return res.status(503).json({ error: 'CMS desativado' });
  if (verifyToken(req.headers['x-admin-token'])) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

/* ─── Middleware global ───────────────────────────────────────────────── */
app.use(requestLogger);
app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));

app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (/[?&]v=/.test(filePath) || /\.[a-f0-9]{8,}\./i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
  },
}));

if (!ADMIN_CONFIGURED) {
  app.use('/admin', (_req, res) => {
    res.status(503).setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(PAGES_DIR, '503.html'));
  });
  app.use('/api/admin', (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
  app.post('/api/content', (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
  app.use('/api/upload',   (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
  app.use('/api/images',   (_req, res) => res.status(503).json({ error: 'CMS desativado' }));
} else {
  app.use('/admin', express.static(path.join(__dirname, 'admin')));
}

/* ─── Multer (memória — funciona em Vercel e localmente) ──────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens JPEG, PNG, WebP, GIF ou SVG são permitidas'));
  },
});

const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Demasiadas tentativas de login. Tenta novamente mais tarde.' });
const uploadRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: 'Demasiados envios. Tenta novamente mais tarde.' });

/* ─── API: conteúdo ────────────────────────────────────────────────────── */

app.get('/api/content', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await contentStore.readContent());
  } catch (err) { next(err); }
});

app.post('/api/admin/login', loginRateLimit, (req, res) => {
  const { password } = req.body || {};
  if (!checkAdminPassword(password)) return res.status(401).json({ error: 'Password incorreta' });
  res.json({ token: createToken() });
});

app.post('/api/content', authRequired, async (req, res, next) => {
  try {
    const content = req.body;
    const { ok, errors } = validateContent(content);
    if (!ok) return res.status(400).json({ error: 'Conteúdo inválido', errors });

    if (!req.body.allowPlaceholders) {
      const placeholders = findPlaceholders(content);
      if (placeholders.length) {
        return res.status(400).json({
          error: 'O conteúdo tem valores por preencher (placeholders). Corrige-os ou publica na mesma com allowPlaceholders:true.',
          placeholders,
        });
      }
    }

    await contentStore.writeContent(content);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.get('/api/admin/versions', authRequired, async (_req, res, next) => {
  try { res.json(await contentStore.listVersions()); }
  catch (err) { next(err); }
});

app.post('/api/admin/restore', authRequired, async (req, res, next) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Falta o identificador da versão' });
    const result = await contentStore.restoreVersion(id);
    if (!result) return res.status(404).json({ error: 'Versão não encontrada' });
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

/* ─── API: leads (inscrição / contacto) ───────────────────────────────── */
app.use(createLeadsRouter({ authRequired, readContent: contentStore.readContent }));

/* ─── API: uploads e biblioteca de imagens ─────────────────────────────── */

app.post('/api/upload', uploadRateLimit, authRequired, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res, next) => {
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
  } catch (err) { next(err); }
});

app.delete('/api/upload', authRequired, async (req, res, next) => {
  const { filename } = req.body || {};
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
  } catch (err) { next(err); }
});

app.get('/api/images', authRequired, async (_req, res, next) => {
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
  } catch (err) { next(err); }
});

/* ─── Páginas ─────────────────────────────────────────────────────────── */
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

const { router: pagesRouter, renderNotFound } = createPagesRouter({ readContent: contentStore.readContent });
app.use(pagesRouter);

/* Redirecionamentos permanentes das URLs que desapareceram */
for (const [from, to] of Object.entries(contentStore.REDIRECTS)) {
  app.get(from, (_req, res) => res.redirect(301, to));
  app.get(from + '/*', (_req, res) => res.redirect(301, to));
}

/* 404 */
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Não encontrado' });
  try {
    const content = await contentStore.readContent();
    await renderNotFound(res, content, req);
  } catch (err) { next(err); }
});

/* ─── Handler de erro final ───────────────────────────────────────────── */
app.use((err, req, res, _next) => {
  log.error('http.error', {
    requestId: req.requestId,
    path: req.path,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  const status = err.status || 500;
  if (req.path.startsWith('/api/')) {
    const body = { error: 'Erro interno do servidor' };
    if (process.env.NODE_ENV !== 'production') body.detail = err.message;
    return res.status(status).json(body);
  }
  res.status(status).setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PAGES_DIR, '500.html'));
});

/* ─── Start (local) / Export (Vercel serverless) ─────────────────────── */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nASBKI Covilhã CMS`);
    console.log(`   Website: http://localhost:${PORT}`);
    console.log(`   Admin:   http://localhost:${PORT}/admin\n`);
  });
}

module.exports = app;
module.exports._migrate = contentStore.migrate;
module.exports._redirects = contentStore.REDIRECTS;
