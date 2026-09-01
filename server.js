/* ─── ASBKI Covilhã — CMS Server ─────────────────────────────────────── */
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  console.warn('AVISO: ADMIN_PASSWORD não definida — rotas de admin desativadas.');
  /* Bloqueia /admin e /api/* antes de registar qualquer rota protegida */
  app.use(['/admin', '/api/admin', '/api/content', '/api/upload', '/api/images'],
    (_req, res) => res.status(503).json({ error: 'CMS desativado: ADMIN_PASSWORD não configurada' }));
}

const CONTENT_FILE   = path.join(__dirname, 'content.json');
const UPLOADS_DIR    = path.join(__dirname, 'assets', 'images', 'uploads');
const IMAGES_ROOT    = path.join(__dirname, 'assets', 'images');

/* ─── In-memory token store (token → expiry timestamp) ───────────────── */
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
const activeTokens = new Map();

/* ─── Middleware ──────────────────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

/* ─── Multer (image upload) ───────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens JPEG, PNG, WebP, GIF ou SVG são permitidas'));
  },
});

/* ─── Auth middleware ─────────────────────────────────────────────────── */
function authRequired(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'CMS desativado' });
  const token = req.headers['x-admin-token'];
  const expiry = token && activeTokens.get(token);
  if (expiry && expiry > Date.now()) return next();
  if (expiry) activeTokens.delete(token); // expirado — limpar
  res.status(401).json({ error: 'Não autorizado' });
}

/* ─── Routes ──────────────────────────────────────────────────────────── */

/* Public: get content */
app.get('/api/content', (req, res) => {
  try {
    const data = fs.readFileSync(CONTENT_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'Erro ao ler conteúdo' });
  }
});

/* Admin: login */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password incorreta' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.set(token, Date.now() + TOKEN_TTL_MS);
  res.json({ token });
});

/* Admin: save content */
app.post('/api/content', authRequired, (req, res) => {
  try {
    const content = req.body;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ error: 'Conteúdo inválido' });
    }
    /* Backup first */
    const backup = CONTENT_FILE.replace('.json', `.backup-${Date.now()}.json`);
    if (fs.existsSync(CONTENT_FILE)) fs.copyFileSync(CONTENT_FILE, backup);
    /* Write new content */
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf-8');
    /* Keep only last 3 backups */
    const dir     = path.dirname(CONTENT_FILE);
    const backups = fs.readdirSync(dir)
      .filter(f => f.startsWith('content.backup-'))
      .sort()
      .reverse();
    backups.slice(3).forEach(f => fs.unlinkSync(path.join(dir, f)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Admin: upload image */
app.post('/api/upload', authRequired, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  const url = `/assets/images/uploads/${req.file.filename}`;
  res.json({ url });
});

/* Admin: delete uploaded image */
app.delete('/api/upload', authRequired, (req, res) => {
  const { filename } = req.body;
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Nome de ficheiro inválido' });
  }
  const filePath = path.join(UPLOADS_DIR, path.basename(filename));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

/* Admin: list uploaded images + root SVGs */
app.get('/api/images', authRequired, (req, res) => {
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
});

/* Serve admin panel */
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

/* ─── Start (local) / Export (Vercel serverless) ─────────────────────── */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nASBKI Covilhã CMS`);
    console.log(`   Website: http://localhost:${PORT}`);
    console.log(`   Admin:   http://localhost:${PORT}/admin\n`);
  });
}

module.exports = app;
