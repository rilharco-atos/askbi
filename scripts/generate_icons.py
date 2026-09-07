#!/usr/bin/env python3
"""Gera os ícones do site (favicon, apple-touch-icon, PWA) a partir do
emblema oficial da ASBKI já usado no cabeçalho do site
(assets/images/uploads/1788272307296-n3jzhn7bi8.png).

Uso: python scripts/generate_icons.py
Sem dependências além do Pillow (já disponível no ambiente de desenvolvimento).
Os ficheiros gerados ficam versionados em assets/icons/ — este script não
precisa de correr no deploy, só quando o emblema mudar.
"""
import base64
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "images", "uploads", "1788272307296-n3jzhn7bi8.png")
OUT_DIR = os.path.join(ROOT, "assets", "icons")


def load_source():
    im = Image.open(SOURCE).convert("RGBA")
    # Recorta para quadrado a partir do centro, caso a imagem não seja já quadrada
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return im.crop((left, top, left + side, top + side))


def save_png_transparent(im, size, filename):
    resized = im.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(OUT_DIR, filename), "PNG", optimize=True)
    print(f"  {filename} ({size}x{size}, fundo transparente)")


def save_png_on_white(im, size, filename):
    bg = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    resized = im.resize((size, size), Image.LANCZOS)
    bg.alpha_composite(resized)
    bg.convert("RGB").save(os.path.join(OUT_DIR, filename), "PNG", optimize=True)
    print(f"  {filename} ({size}x{size}, fundo branco)")


def save_favicon_svg(im, filename):
    small = im.resize((128, 128), Image.LANCZOS)
    buf = io.BytesIO()
    small.save(buf, "PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
        f'<image width="128" height="128" href="data:image/png;base64,{b64}"/>'
        "</svg>\n"
    )
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"  {filename} ({len(svg)} bytes)")


def save_manifest(filename):
    manifest = """{
  "name": "ASBKI Covilhã",
  "short_name": "ASBKI",
  "description": "Karate Shotokan na Covilhã. Turmas para todas as idades.",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0d0d0d",
  "background_color": "#0f0d10",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
"""
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(manifest)
    print(f"  {filename}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    im = load_source()
    print("A gerar ícones a partir de", os.path.relpath(SOURCE, ROOT))
    save_png_transparent(im, 192, "icon-192.png")
    save_png_transparent(im, 512, "icon-512.png")
    save_png_on_white(im, 180, "apple-touch-icon.png")
    save_favicon_svg(im, "favicon.svg")
    save_manifest("site.webmanifest")
    print("Concluído.")


if __name__ == "__main__":
    main()
