/* ─── Tags de favicon / apple-touch-icon / manifest ─────────────────────
   Os ficheiros são gerados uma vez por scripts/generate-icons.mjs e
   ficam versionados em assets/icons/. Este módulo só produz o HTML. */

const ICONS_HTML = [
  '<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">',
  '<link rel="icon" href="/assets/icons/icon-192.png" sizes="192x192" type="image/png">',
  '<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">',
  '<link rel="manifest" href="/assets/icons/site.webmanifest">',
].join('\n  ');

module.exports = { ICONS_HTML };
