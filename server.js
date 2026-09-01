/* ─── ASBKI Covilhã — CMS Server ─────────────────────────────────────── */
require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'asbki2026';
const CONTENT_FILE   = path.join(__dirname, 'content.json');
const UPLOADS_DIR    = path.join(__dirname, 'assets', 'images', 'uploads');

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
    if (/image\/(jpeg|png|webp|gif|svg)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  },
});

/* ─── Auth middleware ─────────────────────────────────────────────────── */
function authRequired(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token && token === process.env.ADMIN_TOKEN) return next();
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
  const token = Buffer.from(`${Date.now()}:${ADMIN_PASSWORD}`).toString('base64');
  process.env.ADMIN_TOKEN = token;
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

/* Admin: list uploaded images */
app.get('/api/images', authRequired, (req, res) => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
    .map(f => ({
      filename: f,
      url: `/assets/images/uploads/${f}`,
      size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
    }));
  res.json(files);
});

/* Serve admin panel */
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

/* ─── Start ───────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🥋 ASBKI Covilhã CMS`);
  console.log(`   Website: http://localhost:${PORT}`);
  console.log(`   Admin:   http://localhost:${PORT}/admin`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);
});
