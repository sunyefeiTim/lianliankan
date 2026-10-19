"""生成应用图标：用无头 Edge/Chrome 截 tools/icon.html，再用 Pillow 缩放。

用法：python tools/gen_icons.py
输出：assets/icons/icon-512.png、icon-192.png、apple-touch-icon.png（180）
"""
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons'

BROWSERS = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    shutil.which('chromium') or '', shutil.which('google-chrome') or '',
]


def main():
    browser = next((b for b in BROWSERS if b and os.path.exists(b)), None)
    if not browser:
        raise SystemExit('找不到 Edge 或 Chrome')
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        shot = Path(tmp) / 'shot.png'
        subprocess.run([
            browser, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--force-device-scale-factor=1', '--allow-file-access-from-files',
            f'--user-data-dir={tmp}', '--window-size=512,512',
            f'--screenshot={shot}', (ROOT / 'tools' / 'icon.html').as_uri(),
        ], check=True, timeout=60)
        img = Image.open(shot).convert('RGB').crop((0, 0, 512, 512))
    img.save(OUT / 'icon-512.png', optimize=True)
    for size, name in [(192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
        img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
    print('写入', OUT)


if __name__ == '__main__':
    main()
