"""
果果连连看 资源生成器
生成 assets/tiles/*.svg（方块图案）和 assets/sfx/*.wav（音效 + 背景音乐）。

用法:  python tools/gen_assets.py
依赖:  numpy
所有图案和声音都是原创的程序化素材，可随意替换：
直接用同名文件覆盖 assets/ 里的文件即可，或修改 js/assets.js 指向新文件。
"""
import math
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILE_DIR = os.path.join(ROOT, "assets", "tiles")
SFX_DIR = os.path.join(ROOT, "assets", "sfx")


# --------------------------------------------------------------------------
# Tiles (SVG, viewBox 0 0 100 100)
# --------------------------------------------------------------------------
def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            + body + '</svg>\n')


def eyes(x1, x2, y, r=5.5):
    out = ""
    for x in (x1, x2):
        out += (f'<circle cx="{x}" cy="{y}" r="{r}" fill="#2a1a12"/>'
                f'<circle cx="{x + r * .35}" cy="{y - r * .35}" r="{r * .38}" fill="#fff"/>')
    return out


def cheeks(x1, x2, y, r=5, c="#ff8fa3"):
    return (f'<ellipse cx="{x1}" cy="{y}" rx="{r}" ry="{r * .6}" fill="{c}" opacity=".7"/>'
            f'<ellipse cx="{x2}" cy="{y}" rx="{r}" ry="{r * .6}" fill="{c}" opacity=".7"/>')


def shine(x, y, rx=7, ry=11, rot=-30):
    return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" opacity=".38" '
            f'transform="rotate({rot} {x} {y})"/>')


def leaf(path, c="#45b03c"):
    return f'<path d="{path}" fill="{c}" stroke="#2e7d27" stroke-width="2"/>'


TILES = {}

TILES["apple"] = svg(
    '<path d="M50 30 Q56 18 58 10" stroke="#6b3a1a" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + leaf("M56 22 Q68 6 82 13 Q70 28 56 22Z")
    + '<path d="M50 30 C35 18 12 26 14 52 C16 78 34 92 50 85 C66 92 84 78 86 52 C88 26 65 18 50 30Z" '
      'fill="#e8352b" stroke="#a81c16" stroke-width="2.5"/>'
    + shine(31, 46))

TILES["orange"] = svg(
    '<circle cx="50" cy="56" r="35" fill="#ff9a1f" stroke="#d86a00" stroke-width="2.5"/>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="1.6" fill="#e07800"/>'
              for x, y in [(38, 62), (60, 70), (66, 50), (46, 78), (30, 48), (55, 56)])
    + '<circle cx="50" cy="22" r="3.5" fill="#6b8e23"/>'
    + leaf("M52 22 Q62 8 76 12 Q66 26 52 22Z") + shine(34, 44))

TILES["lemon"] = svg(
    '<path d="M10 54 Q12 38 26 30 Q50 16 74 30 Q88 38 90 54 Q88 70 74 78 Q50 92 26 78 Q12 70 10 54Z" '
    'fill="#ffd93b" stroke="#d1a800" stroke-width="2.5" transform="rotate(-18 50 54)"/>'
    + leaf("M58 22 Q70 10 84 16 Q72 30 58 22Z") + shine(34, 46, 6, 12, -50))

TILES["grape"] = svg(
    '<path d="M50 24 Q50 14 56 8" stroke="#6b3a1a" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + leaf("M52 18 Q66 4 80 12 Q68 26 52 18Z")
    + ''.join(f'<circle cx="{x}" cy="{y}" r="12" fill="#8e4fd1" stroke="#5d2a99" stroke-width="2"/>'
              f'<circle cx="{x - 4}" cy="{y - 4}" r="3.2" fill="#fff" opacity=".45"/>'
              for x, y in [(30, 38), (50, 36), (70, 38), (40, 56), (60, 56), (50, 74)]))

TILES["watermelon"] = svg(
    '<path d="M8 34 A42 42 0 0 0 92 34 Z" fill="#2f9a3e"/>'
    '<path d="M14 34 A36 36 0 0 0 86 34 Z" fill="#d8f5a8"/>'
    '<path d="M19 34 A31 31 0 0 0 81 34 Z" fill="#f2405a"/>'
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="2.4" ry="3.8" fill="#2a1a12"/>'
              for x, y in [(34, 44), (50, 48), (66, 44), (42, 56), (58, 56), (50, 64)]))

TILES["strawberry"] = svg(
    '<path d="M50 90 C22 74 12 50 22 34 C32 22 68 22 78 34 C88 50 78 74 50 90Z" '
    'fill="#ef2f45" stroke="#b0142a" stroke-width="2.5"/>'
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="1.8" ry="2.8" fill="#ffe27a"/>'
              for x, y in [(34, 44), (50, 42), (66, 44), (40, 58), (60, 58), (50, 70), (30, 56), (70, 56)])
    + '<path d="M30 28 L42 32 L50 20 L58 32 L70 28 L62 38 L50 34 L38 38Z" fill="#45b03c" stroke="#2e7d27" stroke-width="2" stroke-linejoin="round"/>')

TILES["cherry"] = svg(
    '<path d="M34 64 Q38 36 62 16 M68 62 Q66 38 62 16" stroke="#3c8a2e" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + leaf("M62 16 Q76 6 88 14 Q76 26 62 16Z")
    + '<circle cx="32" cy="70" r="17" fill="#d81b3a" stroke="#930c22" stroke-width="2.5"/>'
      '<circle cx="68" cy="68" r="17" fill="#d81b3a" stroke="#930c22" stroke-width="2.5"/>'
    + shine(25, 64, 4, 6) + shine(61, 62, 4, 6))

TILES["pear"] = svg(
    '<path d="M50 20 Q50 12 54 6" stroke="#6b3a1a" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + leaf("M54 14 Q66 2 78 8 Q68 20 54 14Z")
    + '<path d="M50 20 C42 20 40 30 40 38 C40 46 22 54 22 70 C22 84 36 93 50 93 C64 93 78 84 78 70 '
      'C78 54 60 46 60 38 C60 30 58 20 50 20Z" fill="#a5d43a" stroke="#6f9a16" stroke-width="2.5"/>'
    + shine(36, 66, 6, 10))

TILES["banana"] = svg(
    '<path d="M20 22 Q20 72 60 84 Q82 90 90 76 Q70 78 52 66 Q32 52 32 22 Z" '
    'fill="#ffd23b" stroke="#c99a12" stroke-width="2.5" stroke-linejoin="round"/>'
    '<path d="M26 30 Q30 64 62 78" stroke="#e6b222" stroke-width="2.5" fill="none"/>'
    '<rect x="19" y="14" width="13" height="10" rx="3" fill="#6b4a1a"/>')

TILES["carrot"] = svg(
    '<path d="M50 30 Q40 12 30 10 M50 30 Q50 10 50 6 M50 30 Q60 12 70 10" stroke="#3c9a2e" stroke-width="6" fill="none" stroke-linecap="round"/>'
    '<path d="M34 34 Q50 24 66 34 L54 90 Q50 96 46 90Z" fill="#ff7f1e" stroke="#c75300" stroke-width="2.5" stroke-linejoin="round"/>'
    '<path d="M40 46 L48 46 M52 58 L60 58 M44 70 L51 70" stroke="#c75300" stroke-width="2.5" stroke-linecap="round"/>')

TILES["mushroom"] = svg(
    '<path d="M36 56 L64 56 Q67 80 60 90 L40 90 Q33 80 36 56Z" fill="#fff2d6" stroke="#cdb48a" stroke-width="2.5"/>'
    + eyes(44, 56, 70, 3.5)
    + '<path d="M10 58 Q12 16 50 14 Q88 16 90 58 Z" fill="#e8352b" stroke="#a81c16" stroke-width="2.5" stroke-linejoin="round"/>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff"/>'
              for x, y, r in [(32, 38, 7), (56, 28, 6), (72, 44, 5), (48, 48, 4)]))

TILES["panda"] = svg(
    '<circle cx="23" cy="26" r="13" fill="#222"/><circle cx="77" cy="26" r="13" fill="#222"/>'
    '<circle cx="50" cy="55" r="37" fill="#fff" stroke="#c9c9c9" stroke-width="2.5"/>'
    '<ellipse cx="35" cy="50" rx="10" ry="13" fill="#222" transform="rotate(30 35 50)"/>'
    '<ellipse cx="65" cy="50" rx="10" ry="13" fill="#222" transform="rotate(-30 65 50)"/>'
    '<circle cx="37" cy="49" r="4" fill="#fff"/><circle cx="63" cy="49" r="4" fill="#fff"/>'
    '<ellipse cx="50" cy="66" rx="6" ry="4" fill="#222"/>'
    '<path d="M43 74 Q50 80 57 74" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    + cheeks(28, 72, 68))

TILES["frog"] = svg(
    '<circle cx="30" cy="32" r="17" fill="#5cc24a" stroke="#2f8a22" stroke-width="2.5"/>'
    '<circle cx="70" cy="32" r="17" fill="#5cc24a" stroke="#2f8a22" stroke-width="2.5"/>'
    '<ellipse cx="50" cy="62" rx="42" ry="30" fill="#5cc24a" stroke="#2f8a22" stroke-width="2.5"/>'
    '<circle cx="30" cy="32" r="10" fill="#fff"/><circle cx="70" cy="32" r="10" fill="#fff"/>'
    + eyes(31, 69, 33, 5.5)
    + '<path d="M30 64 Q50 80 70 64" stroke="#1f5e16" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + cheeks(22, 78, 62, 6))

TILES["cat"] = svg(
    '<path d="M16 46 L22 12 L44 30Z" fill="#ffa64d" stroke="#c76b12" stroke-width="2.5" stroke-linejoin="round"/>'
    '<path d="M84 46 L78 12 L56 30Z" fill="#ffa64d" stroke="#c76b12" stroke-width="2.5" stroke-linejoin="round"/>'
    '<path d="M24 34 L26 22 L36 30Z M76 34 L74 22 L64 30Z" fill="#ffc6c6"/>'
    '<ellipse cx="50" cy="58" rx="38" ry="33" fill="#ffa64d" stroke="#c76b12" stroke-width="2.5"/>'
    '<path d="M42 30 L46 42 M50 28 L50 42 M58 30 L54 42" stroke="#d9802a" stroke-width="3" stroke-linecap="round"/>'
    + eyes(36, 64, 56)
    + '<path d="M46 66 L54 66 L50 71Z" fill="#ff6f8a"/>'
      '<path d="M8 64 L30 66 M8 74 L30 70 M92 64 L70 66 M92 74 L70 70" stroke="#7a4310" stroke-width="2" stroke-linecap="round"/>')

TILES["pig"] = svg(
    '<path d="M18 40 L20 14 L42 28Z M82 40 L80 14 L58 28Z" fill="#ff9fb8" stroke="#d95f80" stroke-width="2.5" stroke-linejoin="round"/>'
    '<circle cx="50" cy="56" r="37" fill="#ffb3c6" stroke="#d95f80" stroke-width="2.5"/>'
    + eyes(34, 66, 46)
    + '<ellipse cx="50" cy="66" rx="16" ry="11" fill="#ff8fab" stroke="#d95f80" stroke-width="2.5"/>'
      '<ellipse cx="44" cy="66" rx="3" ry="4.5" fill="#a83a5a"/><ellipse cx="56" cy="66" rx="3" ry="4.5" fill="#a83a5a"/>')

TILES["chick"] = svg(
    '<path d="M44 20 Q46 6 52 10 Q54 2 60 10" stroke="#e8a800" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<circle cx="50" cy="56" r="36" fill="#ffd84a" stroke="#d6a400" stroke-width="2.5"/>'
    + eyes(37, 63, 50)
    + '<path d="M42 60 L58 60 L50 72Z" fill="#ff8a1f" stroke="#c75a00" stroke-width="2" stroke-linejoin="round"/>'
    + cheeks(26, 74, 62, 6))

TILES["bear"] = svg(
    '<circle cx="22" cy="28" r="14" fill="#b07a4a" stroke="#7a4e26" stroke-width="2.5"/>'
    '<circle cx="78" cy="28" r="14" fill="#b07a4a" stroke="#7a4e26" stroke-width="2.5"/>'
    '<circle cx="22" cy="28" r="7" fill="#e8c49a"/><circle cx="78" cy="28" r="7" fill="#e8c49a"/>'
    '<circle cx="50" cy="56" r="37" fill="#b07a4a" stroke="#7a4e26" stroke-width="2.5"/>'
    + eyes(36, 64, 48)
    + '<ellipse cx="50" cy="68" rx="17" ry="13" fill="#e8c49a"/>'
      '<ellipse cx="50" cy="63" rx="6" ry="4.5" fill="#3a2212"/>'
      '<path d="M44 72 Q50 77 56 72" stroke="#3a2212" stroke-width="2.5" fill="none" stroke-linecap="round"/>')

TILES["fish"] = svg(
    '<path d="M72 50 L94 30 L92 70Z" fill="#2c84d6" stroke="#185a9a" stroke-width="2.5" stroke-linejoin="round"/>'
    '<ellipse cx="44" cy="50" rx="36" ry="25" fill="#3aa0f0" stroke="#185a9a" stroke-width="2.5"/>'
    '<path d="M40 26 Q52 12 62 30" fill="#2c84d6" stroke="#185a9a" stroke-width="2"/>'
    '<path d="M48 36 Q56 50 48 64 M58 38 Q64 50 58 62" stroke="#7cc6ff" stroke-width="3" fill="none"/>'
    + eyes(24, 24, 46, 5)
    + '<circle cx="16" cy="20" r="4" fill="none" stroke="#7cc6ff" stroke-width="2"/>'
      '<circle cx="8" cy="10" r="2.5" fill="none" stroke="#7cc6ff" stroke-width="2"/>')

pts = []
for i in range(10):
    a = -math.pi / 2 + i * math.pi / 5
    r = 42 if i % 2 == 0 else 19
    pts.append(f"{50 + r * math.cos(a):.1f},{54 + r * math.sin(a):.1f}")
TILES["star"] = svg(
    f'<polygon points="{" ".join(pts)}" fill="#ffcf2b" stroke="#d98a00" stroke-width="3" stroke-linejoin="round"/>'
    + eyes(42, 58, 54, 4) + '<path d="M45 63 Q50 67 55 63" stroke="#7a3c00" stroke-width="2.5" fill="none" stroke-linecap="round"/>')

petals = ''.join(
    f'<circle cx="{50 + 24 * math.cos(-math.pi / 2 + i * 2 * math.pi / 5):.1f}" '
    f'cy="{50 + 24 * math.sin(-math.pi / 2 + i * 2 * math.pi / 5):.1f}" r="17" fill="#ff7eb6" stroke="#d13f80" stroke-width="2.5"/>'
    for i in range(5))
TILES["flower"] = svg(petals + '<circle cx="50" cy="50" r="15" fill="#ffd84a" stroke="#d6a400" stroke-width="2.5"/>'
                      + eyes(45, 55, 49, 2.6))

TILES["heart"] = svg(
    '<path d="M50 88 C20 66 8 50 12 32 C16 16 38 12 50 30 C62 12 84 16 88 32 C92 50 80 66 50 88Z" '
    'fill="#ff3b6b" stroke="#c0123e" stroke-width="3" stroke-linejoin="round"/>' + shine(28, 36, 6, 10, -40))

TILES["balloon"] = svg(
    '<path d="M50 76 Q42 86 52 92 Q60 98 54 100" stroke="#7a7a7a" stroke-width="2" fill="none"/>'
    '<ellipse cx="50" cy="40" rx="30" ry="35" fill="#3fb8ff" stroke="#1a7fc4" stroke-width="2.5"/>'
    '<path d="M45 74 L55 74 L50 80Z" fill="#1a7fc4"/>' + shine(36, 28, 6, 12))

TILES["candy"] = svg(
    '<path d="M28 50 L6 32 L10 50 L6 68Z" fill="#ffd23b" stroke="#c99a12" stroke-width="2.5" stroke-linejoin="round"/>'
    '<path d="M72 50 L94 32 L90 50 L94 68Z" fill="#ffd23b" stroke="#c99a12" stroke-width="2.5" stroke-linejoin="round"/>'
    '<circle cx="50" cy="50" r="24" fill="#ff5a8a" stroke="#c0245a" stroke-width="2.5"/>'
    '<path d="M50 50 m-12 0 a12 12 0 1 1 12 12 a8 8 0 1 1 -8 -8 a4 4 0 1 1 4 4" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>')

clover = ''.join(
    f'<g transform="rotate({r} 50 46)"><path d="M50 46 C38 40 30 26 38 18 C44 12 50 18 50 24 C50 18 56 12 62 18 C70 26 62 40 50 46Z" '
    f'fill="#3bb54a" stroke="#22802e" stroke-width="2.5" stroke-linejoin="round"/></g>'
    for r in (0, 90, 180, 270))
TILES["clover"] = svg('<path d="M50 50 Q54 76 66 92" stroke="#22802e" stroke-width="5" fill="none" stroke-linecap="round"/>' + clover)

TILES["moon"] = svg(
    '<path d="M64 10 A40 40 0 1 0 90 66 A32 32 0 1 1 64 10Z" fill="#ffe066" stroke="#d1a800" stroke-width="3" stroke-linejoin="round"/>'
    + eyes(36, 50, 56, 3.4) + cheeks(32, 54, 64, 3.6))

TILES["sun"] = svg(
    ''.join(f'<path d="M50 50 L{50 + 46 * math.cos(a - .18):.1f} {50 + 46 * math.sin(a - .18):.1f} '
            f'L{50 + 46 * math.cos(a + .18):.1f} {50 + 46 * math.sin(a + .18):.1f}Z" fill="#ff9f1a"/>'
            for a in [i * math.pi / 4 for i in range(8)])
    + '<circle cx="50" cy="50" r="28" fill="#ffcf2b" stroke="#e08a00" stroke-width="2.5"/>'
    + eyes(41, 59, 46, 4) + '<path d="M42 58 Q50 65 58 58" stroke="#7a3c00" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    + cheeks(34, 66, 56, 4))


# --------------------------------------------------------------------------
# Sounds (WAV, mono 16-bit)
# --------------------------------------------------------------------------
SR = 44100


def osc(typ, phase):
    if typ == "sine":
        return np.sin(phase)
    if typ == "square":     # softened square: first odd harmonics only
        return sum(np.sin(phase * k) / k for k in (1, 3, 5, 7)) * 0.9
    if typ == "triangle":
        return 2 / np.pi * np.arcsin(np.sin(phase))
    raise ValueError(typ)


def tone(buf, f, d, typ="sine", v=.25, w=0., to=None, sr=SR):
    n = int(d * sr)
    t = np.arange(n) / sr
    freq = f * (to / f) ** (t / d) if to else np.full(n, f)
    phase = np.cumsum(2 * np.pi * freq / sr)
    att = np.minimum(t / .006, 1)
    env = v * att * np.exp(np.log(.0001 / v) * t / d)
    s = int(w * sr)
    seg = osc(typ, phase) * env
    end = min(len(buf), s + n)
    buf[s:end] += seg[:end - s]


def noise(buf, d, v, w=0., hp=4000, sr=SR):
    n = int(d * sr)
    x = (np.random.rand(n) * 2 - 1) * np.linspace(1, 0, n)
    a = 1 / (1 + 2 * np.pi * hp / sr)
    y = np.zeros(n)
    for i in range(1, n):
        y[i] = a * (y[i - 1] + x[i] - x[i - 1])
    s = int(w * sr)
    end = min(len(buf), s + n)
    buf[s:end] += y[:end - s] * v


def write_wav(name, buf, sr=SR, peak=.85):
    m = np.max(np.abs(buf)) or 1
    buf = buf * (peak / m)
    data = (np.clip(buf, -1, 1) * 32767).astype("<i2").tobytes()
    with wave.open(os.path.join(SFX_DIR, name), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(data)


def make_sfx():
    np.random.seed(7)
    sounds = {}

    b = np.zeros(int(SR * .12)); tone(b, 1175, .06, "triangle", .28); tone(b, 2350, .04, "sine", .08, .01)
    sounds["select.wav"] = (b, .55)

    b = np.zeros(int(SR * .4)); noise(b, .12, .12, 0, 5000)
    tone(b, 1046, .08, "square", .1); tone(b, 1568, .12, "square", .1, .06); tone(b, 2093, .25, "sine", .18, .11)
    sounds["match.wav"] = (b, .8)

    b = np.zeros(int(SR * .25)); tone(b, 240, .15, "square", .1, 0, 150); tone(b, 160, .12, "square", .08, .08, 110)
    sounds["fail.wav"] = (b, .6)

    b = np.zeros(int(SR * .5))
    for i, f in enumerate([1568, 2093, 2637, 3136]): tone(b, f, .3, "sine", .12, i * .05)
    sounds["hint.wav"] = (b, .6)

    b = np.zeros(int(SR * .5))
    for i in range(10): tone(b, 500 + i * 140 + (i % 2) * 90, .06, "triangle", .12, i * .035)
    noise(b, .35, .06, 0, 2500)
    sounds["shuffle.wav"] = (b, .7)

    b = np.zeros(int(SR * .05)); tone(b, 1900, .03, "square", .05)
    sounds["tick.wav"] = (b, .4)

    b = np.zeros(int(SR * 1.5))
    for i, f in enumerate([523, 659, 784, 1046, 0, 784, 1046, 1318]):
        if f: tone(b, f, .6 if i == 7 else .16, "square", .1, i * .11)
    sounds["win.wav"] = (b, .75)

    b = np.zeros(int(SR * 1.8))
    for i, f in enumerate([659, 622, 587, 554, 523]): tone(b, f, .7 if i == 4 else .25, "triangle", .22, i * .22)
    sounds["lose.wav"] = (b, .75)

    b = np.zeros(int(SR * .45))
    for i, f in enumerate([784, 988, 1175, 1568]): tone(b, f, .12, "square", .09, i * .07)
    sounds["start.wav"] = (b, .7)

    for name, (buf, pk) in sounds.items():
        write_wav(name, buf, peak=pk)


NOTE_IDX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note(n):
    if n == "-":
        return 0
    m = NOTE_IDX[n[0]] + 12 * (int(n[-1]) + 1)
    return 440 * 2 ** ((m - 69) / 12)


def make_bgm():
    sr = 22050
    mel = ("E5 G5 A5 G5 E5 D5 C5 D5 E5 - G5 E5 D5 - - - A4 C5 D5 E5 G5 E5 D5 C5 D5 - E5 D5 C5 - - - "
           "E5 G5 A5 C6 A5 G5 E5 G5 A5 - G5 E5 G5 - - - C6 A5 G5 E5 D5 E5 G5 E5 D5 - C5 D5 C5 - - -").split()
    bas = "C3 G3 C3 G3 A2 E3 A2 E3 F2 C3 F2 C3 G2 D3 G2 D3".split()
    step = .19
    total = len(mel) * step
    b = np.zeros(int(sr * (total + .4)))
    for i, n in enumerate(mel):
        w = i * step
        f = note(n)
        if f: tone(b, f, step * .9, "square", .5, w, sr=sr)
        if i % 2 == 0: tone(b, note(bas[(i // 2) % len(bas)]), step * 1.6, "triangle", .9, w, sr=sr)
        if i % 4 == 2: tone(b, 3000, .02, "square", .15, w, sr=sr)
    # fold the tail back onto the start so the loop is seamless
    n = int(sr * total)
    tail = b[n:]
    b = b[:n]
    b[:len(tail)] += tail
    write_wav("bgm.wav", b, sr=sr, peak=.7)


def main():
    os.makedirs(TILE_DIR, exist_ok=True)
    os.makedirs(SFX_DIR, exist_ok=True)
    for name, data in TILES.items():
        with open(os.path.join(TILE_DIR, name + ".svg"), "w", encoding="utf-8") as f:
            f.write(data)
    make_sfx()
    make_bgm()
    print(f"tiles: {len(TILES)}  ->  {TILE_DIR}")
    print(f"sfx:   {len(os.listdir(SFX_DIR))}  ->  {SFX_DIR}")


if __name__ == "__main__":
    main()
