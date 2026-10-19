/*
 * 果果连连看 — 游戏逻辑
 * 依赖：window.ASSETS（assets.js）、window.GameAudio（audio.js）
 */
(() => {
const TILES = window.ASSETS.tiles;
const SND = window.GameAudio;
const TILE_SRC = Object.fromEntries(TILES.map(t => [t.id, t.src]));

// 每关轮换的玩法：消除后剩余方块向哪个方向靠拢
const MODES = [['none', '经典'], ['down', '下落'], ['up', '上浮'], ['left', '左靠'], ['right', '右靠']];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const LEVEL_COUNT = 20;      // 闯关模式关卡数
const ICE_FROM = 6;          // 从第几关开始出现冰冻方块
const COMBO_WINDOW = 3000;   // ms，连击判定间隔
const TIME_BONUS = 1.5;      // 每次消除回复的秒数
const BOMB_EVERY = 5;        // 每连击 5 次奖励一个炸弹

const $ = id => document.getElementById(id);
const board = $('board'), ov = $('ov'), wrap = $('wrap');

let R, C, H, W, grid, cell = 40;
let gameType = 'level';      // 'level' 闯关 | 'endless' 无尽
let level = 1, score = 0, timeLeft = 0, timeMax = 1, hints = 3, shufs = 3, bombs = 1;
let sel = null, busy = false, paused = false, running = false;
let combo = 0, lastMatch = 0, uid = 0, mode = 'none', lastTick = 0, hintTimer = 0;
const els = new Map();

/* ---------------- 存档 ---------------- */
// llk_save: { unlocked, stars: {关卡: 星数}, best: {关卡: 最高分}, endless: 无尽最高分 }
const save = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('llk_save')) || {}; } catch (e) {}
  s.unlocked = s.unlocked || 1; s.stars = s.stars || {}; s.best = s.best || {};
  if (s.endless == null) { s.endless = 0; try { s.endless = +localStorage.getItem('llk_best') || 0; } catch (e) {} }
  return s;
})();
const writeSave = () => { try { localStorage.setItem('llk_save', JSON.stringify(save)); } catch (e) {} };
const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);

// 预加载图片，避免开局闪烁
TILES.forEach(t => { const i = new Image(); i.src = t.src; });

/* ---------------- 棋盘逻辑 ---------------- */
const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 广度优先：最多 3 段直线（= 2 个拐弯）连通，外圈一层空格允许绕边
function findPath(a, b) {
  const key = (r, c) => r * W + c, prev = new Map([[key(a.r, a.c), null]]);
  let frontier = [a];
  for (let seg = 0; seg < 3; seg++) {
    const next = [];
    for (const p of frontier) for (const [dr, dc] of DIRS) {
      let r = p.r + dr, c = p.c + dc;
      while (r >= 0 && r < H && c >= 0 && c < W) {
        if (r === b.r && c === b.c) {
          const path = [b]; let q = p;
          while (q) { path.push(q); q = prev.get(key(q.r, q.c)); }
          return path;
        }
        if (grid[r][c]) break;
        const k = key(r, c);
        if (!prev.has(k)) { prev.set(k, p); next.push({ r, c }); }
        r += dr; c += dc;
      }
    }
    frontier = next;
  }
  return null;
}

function tilesList() {
  const out = [];
  for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) if (grid[r][c]) out.push({ r, c, t: grid[r][c] });
  return out;
}

// 按图案分组，冰冻的方块不能点，不算在内
function groupsByKind() {
  const by = {};
  for (const p of tilesList()) if (!p.t.ice) (by[p.t.k] = by[p.t.k] || []).push(p);
  return Object.values(by);
}

function findAnyPair() {
  for (const g of groupsByKind())
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (findPath(g[i], g[j])) return [g[i], g[j]];
  return null;
}

function reshuffle() {
  const ps = tilesList(); if (!ps.length) return;
  for (let tries = 0; tries < 60; tries++) {
    const ts = shuffleArr(ps.map(p => p.t));
    ps.forEach((p, i) => grid[p.r][p.c] = ts[i]);
    if (findAnyPair()) return;
  }
}

// 保证棋盘上至少有一对能消；重排也救不回来时把冰全部化掉
function ensureMove(announce) {
  if (findAnyPair()) return;
  reshuffle();
  if (!findAnyPair()) { thawAll(); reshuffle(); }
  render();
  if (announce) { SND.play('shuffle'); floatText('无解，自动重排', { r: H / 2 - .5, c: W / 2 - .5 }); }
}

function gravity() {
  if (mode === 'none') return;
  if (mode === 'down' || mode === 'up') {
    for (let c = 1; c <= C; c++) {
      const col = [];
      for (let r = 1; r <= R; r++) { if (grid[r][c]) col.push(grid[r][c]); grid[r][c] = null; }
      if (mode === 'down') { let r = R; for (let i = col.length - 1; i >= 0; i--) grid[r--][c] = col[i]; }
      else { let r = 1; for (const t of col) grid[r++][c] = t; }
    }
  } else {
    for (let r = 1; r <= R; r++) {
      const row = [];
      for (let c = 1; c <= C; c++) { if (grid[r][c]) row.push(grid[r][c]); grid[r][c] = null; }
      if (mode === 'right') { let c = C; for (let i = row.length - 1; i >= 0; i--) grid[r][c--] = row[i]; }
      else { let c = 1; for (const t of row) grid[r][c++] = t; }
    }
  }
}

/* ---------------- 冰冻方块 ---------------- */
function thaw(t) {
  if (!t || !t.ice) return;
  t.ice = false;
  const el = els.get(t.id); if (!el) return;
  el.classList.add('thaw');
  setTimeout(() => el.classList.remove('ice', 'thaw'), 380);
}
function thawAround(p) { for (const [dr, dc] of DIRS) thaw(grid[p.r + dr] && grid[p.r + dr][p.c + dc]); }
function thawAll() { for (const p of tilesList()) thaw(p.t); }

/* ---------------- 渲染 ---------------- */
function layout() {
  cell = Math.max(22, Math.floor(Math.min(wrap.clientWidth / W, wrap.clientHeight / H)));
  board.style.setProperty('--cell', cell + 'px');
  board.style.width = W * cell + 'px';
  board.style.height = H * cell + 'px';
  render();
}

function render() {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const t = grid[r][c]; if (!t) continue;
    const el = els.get(t.id); if (!el) continue;
    el.style.left = c * cell + 2 + 'px';
    el.style.top = r * cell + 2 + 'px';
  }
}

function build() {
  board.innerHTML = '<svg class="lines" id="svg"></svg>';
  els.clear();
  for (const p of tilesList()) {
    const el = document.createElement('div');
    el.className = 'tile enter' + (p.t.ice ? ' ice' : '');
    const d = (p.r + p.c) * 28;   // 开局从左上到右下依次落下
    el.style.setProperty('--d', d + 'ms');
    setTimeout(() => el.classList.remove('enter'), d + 450);
    el.tabIndex = 0;
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', p.t.k);
    const img = document.createElement('img');
    img.src = TILE_SRC[p.t.k]; img.alt = ''; img.draggable = false;
    el.appendChild(img);
    const id = p.t.id;
    el.addEventListener('pointerdown', e => { e.preventDefault(); clickTile(id); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickTile(id); } });
    board.appendChild(el); els.set(id, el);
  }
}

function posOf(id) {
  for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) if (grid[r][c] && grid[r][c].id === id) return { r, c };
  return null;
}

function drawLine(path) {
  const svg = $('svg');
  const pts = path.map(p => ((p.c + .5) * cell) + ',' + ((p.r + .5) * cell)).join(' ');
  const w = Math.max(3, cell * .1);
  svg.innerHTML =
    `<polyline points="${pts}" stroke="rgba(255,190,40,.45)" stroke-width="${w * 3}"/>` +
    `<polyline points="${pts}" stroke="#fff36b" stroke-width="${w}"/>` +
    `<polyline points="${pts}" stroke="#ffffff" stroke-width="${w * .35}"/>`;
  setTimeout(() => { svg.innerHTML = ''; }, 240);
}

function burst(p, n = 8, color) {
  const x = (p.c + .5) * cell, y = (p.r + .5) * cell;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div'); s.className = 'spark';
    if (color) s.style.setProperty('--spark', color);
    const a = i / n * Math.PI * 2, d = cell * (.6 + Math.random() * .5) * (n > 8 ? 1.5 : 1);
    s.style.left = x - 3 + 'px'; s.style.top = y - 3 + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    board.appendChild(s); setTimeout(() => s.remove(), 520);
  }
}

function floatText(txt, p) {
  const f = document.createElement('div'); f.className = 'float'; f.textContent = txt;
  f.style.left = (p.c + .5) * cell + 'px'; f.style.top = (p.r + .5) * cell + 'px';
  board.appendChild(f); setTimeout(() => f.remove(), 920);
}

function comboBanner(n) {
  const b = document.createElement('div'); b.className = 'combo-banner';
  b.innerHTML = `连击<b>×${n}</b>`;
  board.appendChild(b); setTimeout(() => b.remove(), 900);
}

function bump() {
  board.classList.remove('bump'); void board.offsetWidth; board.classList.add('bump');
}

function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#ffcf3f', '#ff6b8b', '#38e1ff', '#7dff8a', '#ffffff', '#ff9a3a'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--x', (Math.random() * 2 - 1) * 120 + 'px');
    c.style.setProperty('--r', (Math.random() * 2 - 1) * 720 + 'deg');
    c.style.animationDelay = Math.random() * .6 + 's';
    c.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
    box.appendChild(c);
  }
  wrap.appendChild(box); setTimeout(() => box.remove(), 3600);
}

function hud() {
  $('lvLabel').textContent = gameType === 'endless' ? '无尽' : '关卡';
  $('lv').textContent = level; $('sc').textContent = score;
  $('md').textContent = MODES.find(m => m[0] === mode)[1];
  $('nHint').textContent = hints; $('nShuf').textContent = shufs; $('nBomb').textContent = bombs;
  $('bHint').disabled = !hints; $('bShuf').disabled = !shufs; $('bBomb').disabled = !bombs;
}

function clearHint() { clearTimeout(hintTimer); els.forEach(e => e.classList.remove('hint')); }
function clearSel() {
  if (sel) { const t = grid[sel.r][sel.c]; t && els.get(t.id) && els.get(t.id).classList.remove('sel'); }
  sel = null;
}

/* ---------------- 操作 ---------------- */
function shake(el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 260); }

function clickTile(id) {
  if (!running || paused || busy) return;
  const p = posOf(id); if (!p) return;
  const el = els.get(id);
  if (grid[p.r][p.c].ice) { SND.play('fail'); shake(el); return; }   // 冰冻的方块要等旁边消除后才能点
  if (!sel) { sel = p; el.classList.add('sel'); SND.play('select'); return; }

  const sid = grid[sel.r][sel.c].id;
  if (sid === id) { el.classList.remove('sel'); sel = null; SND.play('select'); return; }

  const a = grid[sel.r][sel.c], b = grid[p.r][p.c];
  if (a.k !== b.k) { els.get(sid).classList.remove('sel'); sel = p; el.classList.add('sel'); SND.play('select'); return; }

  const path = findPath(sel, p);
  if (!path) {
    SND.play('fail'); shake(el);
    els.get(sid).classList.remove('sel'); sel = p; el.classList.add('sel');
    return;
  }

  // 消除
  busy = true; clearHint(); el.classList.add('sel');
  const now = performance.now();
  combo = (now - lastMatch < COMBO_WINDOW) ? combo + 1 : 1; lastMatch = now;
  const gain = 10 * combo;
  timeLeft = Math.min(timeMax, timeLeft + TIME_BONUS);
  drawLine(path);
  SND.play('match', { rate: Math.pow(2, Math.min(combo - 1, 6) / 12) });   // 连击时音调逐级升高

  const pa = sel;
  setTimeout(() => {
    if (combo >= 3) { comboBanner(combo); bump(); }
    let label = combo > 1 ? `+${gain} 连击×${combo}` : `+${gain}`;
    if (combo % BOMB_EVERY === 0) { bombs++; label += ' 炸弹+1'; }
    eliminate(pa, p, gain, label);
  }, 150);
}

// 消掉两块（普通消除和炸弹共用）
function eliminate(pa, pb, gain, label) {
  const a = grid[pa.r][pa.c], b = grid[pb.r][pb.c];
  const ea = els.get(a.id), eb = els.get(b.id);
  ea.classList.add('pop'); eb.classList.add('pop'); burst(pa); burst(pb);
  floatText(label, pb);
  score += gain;
  grid[pa.r][pa.c] = null; grid[pb.r][pb.c] = null; sel = null;
  thawAround(pa); thawAround(pb);
  setTimeout(() => { ea.remove(); eb.remove(); els.delete(a.id); els.delete(b.id); }, 330);
  gravity(); render(); hud();
  if (!tilesList().length) { busy = false; boardClear(); return; }
  setTimeout(() => { ensureMove(true); busy = false; }, mode === 'none' ? 0 : 300);
}

function useHint() {
  if (!running || paused || busy || !hints) return;
  const pr = findAnyPair(); if (!pr) return;
  hints--; hud(); clearHint(); SND.play('hint');
  pr.forEach(p => els.get(grid[p.r][p.c].id).classList.add('hint'));
  hintTimer = setTimeout(clearHint, 4000);
}

function useShuffle() {
  if (!running || paused || busy || !shufs) return;
  shufs--; clearHint(); clearSel();
  reshuffle(); SND.play('shuffle'); render(); hud();
}

// 炸弹：不看连线，直接炸掉一对（优先挑连不上的那对）
function useBomb() {
  if (!running || paused || busy || !bombs) return;
  let pick = null;
  for (const g of groupsByKind()) {
    if (g.length < 2) continue;
    pick = pick || [g[0], g[1]];
    const blocked = g.flatMap((x, i) => g.slice(i + 1).map(y => [x, y])).find(([x, y]) => !findPath(x, y));
    if (blocked) { pick = blocked; break; }
  }
  if (!pick) return;
  bombs--; busy = true; clearHint(); clearSel();
  SND.play('match', { rate: .6 }); SND.play('shuffle');
  bump(); burst(pick[0], 14, '#ff8a3a'); burst(pick[1], 14, '#ff8a3a');
  eliminate(pick[0], pick[1], 10, '炸弹 +10');
}

/* ---------------- 关卡流程 ---------------- */
function setupBoard() {
  const portrait = wrap.clientWidth < wrap.clientHeight * 1.05;
  if (portrait) { R = 10; C = 7; } else { R = 8; C = 14; }
  H = R + 2; W = C + 2;
  mode = MODES[(level - 1) % MODES.length][0];

  const n = R * C;
  const kinds = Math.min(TILES.length, Math.floor(n / 4) + level - 1);
  const pool = shuffleArr(TILES.map(t => t.id)).slice(0, kinds), list = [];
  for (let i = 0; i < n / 2; i++) { const k = pool[i % kinds]; list.push(k, k); }
  shuffleArr(list);

  grid = Array.from({ length: H }, () => Array(W).fill(null));
  let i = 0;
  for (let r = 1; r <= R; r++) for (let c = 1; c <= C; c++) grid[r][c] = { id: ++uid, k: list[i++], ice: false };

  const ice = level >= ICE_FROM ? Math.min(Math.floor(n * .3), (level - ICE_FROM + 1) * 3) : 0;
  shuffleArr(tilesList()).slice(0, ice).forEach(p => p.t.ice = true);
  els.clear();
  ensureMove(false);

  timeMax = Math.max(150, 280 - (level - 1) * 7); timeLeft = timeMax;
  sel = null; busy = false; combo = 0; paused = false; clearHint();
  build(); layout(); hud();
}

function begin() {
  running = true; paused = false; lastTick = performance.now(); hideOv();
  $('bPause').textContent = '暂停';
  SND.restartMusic(); SND.music(true);
}

function playLevel(lv) {
  gameType = 'level'; level = lv; score = 0; hints = 3; shufs = 3; bombs = 1;
  setupBoard(); begin();
}

function playEndless() {
  gameType = 'endless'; level = 1; score = 0; hints = 3; shufs = 3; bombs = 1;
  setupBoard(); begin();
}

const starsHtml = n => [1, 2, 3].map(i => `<span class="${i <= n ? 'on' : ''}" style="--i:${i}">★</span>`).join('');

function boardClear() {
  running = false; SND.music(false); clearHint();
  const frac = timeLeft / timeMax;
  const bonus = Math.round(timeLeft) * 5; score += bonus; hud(); SND.play('win'); confetti();

  if (gameType === 'endless') {
    showOv(`<h2>清盘！</h2><div class="big">时间奖励 +${bonus}</div>
      <p>总分 ${score} · 下一盘玩法：${MODES[level % MODES.length][1]}<br>额外获得提示 ×1、重排 ×1</p>
      <button class="btn" data-act="next">下一盘</button>`,
      { next: () => { level++; hints++; shufs++; setupBoard(); begin(); } });
    return;
  }

  const stars = frac >= .5 ? 3 : frac >= .25 ? 2 : 1;
  const newBest = score > (save.best[level] || 0);
  save.stars[level] = Math.max(save.stars[level] || 0, stars);
  save.best[level] = Math.max(save.best[level] || 0, score);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVEL_COUNT, level + 1));
  writeSave();

  const last = level >= LEVEL_COUNT;
  showOv(`<h2>${last ? '全部通关！' : `第 ${level} 关 过关！`}</h2>
    <div class="stars">${starsHtml(stars)}</div>
    <div class="big">得分 ${score}${newBest ? ' <em>新纪录</em>' : ''}</div>
    <p>含时间奖励 +${bonus}${last ? '' : ` · 下一关玩法：${MODES[level % MODES.length][1]}`}
      ${!last && level + 1 === ICE_FROM ? '<br>下一关开始出现冰冻方块！' : ''}</p>
    <div class="row">
      ${last ? '' : '<button class="btn" data-act="next">下一关</button>'}
      <button class="btn blue" data-act="again">重玩</button>
      <button class="btn blue" data-act="levels">选关</button>
    </div>`,
    { next: () => playLevel(level + 1), again: () => playLevel(level), levels: showLevels });
}

function gameOver() {
  running = false; SND.music(false); SND.play('lose'); clearHint(); clearSel();
  if (gameType === 'endless') {
    const rec = score > save.endless;
    if (rec) { save.endless = score; writeSave(); }
    showOv(`<h2>时间到</h2><div class="big">得分 ${score}${rec ? ' <em>新纪录</em>' : ''}</div>
      <p>撑到第 ${level} 盘 · 无尽最高分 ${save.endless}</p>
      <div class="row"><button class="btn" data-act="again">再来一局</button>
      <button class="btn blue" data-act="menu">主菜单</button></div>`,
      { again: playEndless, menu: showMenu });
    return;
  }
  showOv(`<h2>时间到</h2><div class="big">第 ${level} 关 未完成</div>
    <p>剩下 ${tilesList().length} 块。多用提示和炸弹，连击能回时间。</p>
    <div class="row"><button class="btn" data-act="again">再试一次</button>
    <button class="btn blue" data-act="levels">选关</button></div>`,
    { again: () => playLevel(level), levels: showLevels });
}

/* ---------------- 菜单 ---------------- */
function showMenu() {
  running = false; paused = false; SND.music(false); clearSel(); clearHint();
  $('bPause').textContent = '暂停';
  const demo = ['strawberry', 'panda', 'watermelon', 'frog'].map(k => `<img src="${TILE_SRC[k]}" alt="">`).join('');
  showOv(`<h2>果果连连看</h2><div class="demo">${demo}</div>
    <p>点两个相同的图案，能用不超过两个拐弯的线连起来就消除。3 秒内连续消除有连击加分，每连击 ${BOMB_EVERY} 次送一个炸弹。</p>
    <div class="row">
      <button class="btn" data-act="levels">闯关模式</button>
      <button class="btn blue" data-act="endless">无尽模式</button>
    </div>
    <p class="small">已获得 ★ ${totalStars()} / ${LEVEL_COUNT * 3} · 无尽最高分 ${save.endless}<br>
      快捷键：H 提示 · R 重排 · B 炸弹 · P 暂停</p>`,
    { levels: showLevels, endless: playEndless });
}

function showLevels() {
  running = false; SND.music(false);
  let btns = '';
  for (let lv = 1; lv <= LEVEL_COUNT; lv++) {
    const locked = lv > save.unlocked, st = save.stars[lv] || 0;
    btns += `<button class="lvbtn${locked ? ' locked' : ''}" data-act="play" data-lv="${lv}" ${locked ? 'disabled' : ''}
      aria-label="第 ${lv} 关${locked ? '，未解锁' : `，${st} 星`}"
      title="${MODES[(lv - 1) % MODES.length][1]}${lv >= ICE_FROM ? ' · 有冰冻' : ''}">
      <b>${lv}</b><span class="mini">${locked ? '🔒' : starsHtml(st)}</span></button>`;
  }
  showOv(`<h2>选择关卡</h2>
    <p class="small">★ ${totalStars()} / ${LEVEL_COUNT * 3} · 剩余时间过半三星，过四分之一两星<br>第 ${ICE_FROM} 关起出现冰冻方块：旁边有方块消除才会解冻</p>
    <div class="levels">${btns}</div>
    <button class="btn blue" data-act="menu">返回</button>`,
    { play: b => playLevel(+b.dataset.lv), menu: showMenu });
}

// handlers: { act名: fn(按钮) }，对应卡片里的 data-act
function showOv(html, handlers) {
  ov.innerHTML = '<div class="card">' + html + '</div>'; ov.hidden = false;
  ov.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
    SND.unlock();
    const fn = handlers[btn.dataset.act]; if (!fn) return;
    if (['play', 'next', 'again', 'endless'].includes(btn.dataset.act)) SND.play('start'); else SND.play('select');
    fn(btn);
  }));
  const first = ov.querySelector('.btn'); if (first) first.focus({ preventScroll: true });
}
function hideOv() { ov.hidden = true; ov.innerHTML = ''; }

function togglePause() {
  if (!running) return;
  paused = !paused; $('bPause').textContent = paused ? '继续' : '暂停';
  SND.music(!paused);
  if (paused) {
    showOv(`<h2>暂停中</h2><p>棋盘已隐藏，点继续回到游戏。</p>
      <div class="row"><button class="btn" data-act="resume">继续</button>
      <button class="btn blue" data-act="menu">主菜单</button></div>`,
      { resume: togglePause, menu: showMenu });
  } else { hideOv(); lastTick = performance.now(); }
}

/* ---------------- 计时 ---------------- */
let lastSec = -1;
function frame(now) {
  if (running && !paused) {
    timeLeft -= (now - lastTick) / 1000;
    if (timeLeft <= 0) { timeLeft = 0; gameOver(); }
    const s = Math.ceil(timeLeft);
    if (s !== lastSec) { lastSec = s; if (s <= 10 && s > 0) SND.play('tick'); }
  }
  lastTick = now;
  if (grid) {
    const f = timeLeft / timeMax;
    $('tf').style.transform = `scaleX(${f})`;
    $('tf').style.setProperty('--tfill', f > .5 ? '#3fd46a' : f > .2 ? '#ffc23a' : '#ff4b3a');
    $('tt').textContent = Math.ceil(timeLeft) + 's';
    $('tb').classList.toggle('low', f <= .2 && running);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------------- 控件 ---------------- */
$('bHint').onclick = useHint;
$('bShuf').onclick = useShuffle;
$('bBomb').onclick = useBomb;
$('bPause').onclick = togglePause;
$('bSfx').onclick = () => { SND.unlock(); SND.setSfx(!SND.sfxOn); $('bSfx').classList.toggle('off', !SND.sfxOn); SND.play('select'); };
$('bMus').onclick = () => { SND.unlock(); SND.setMusic(!SND.musicOn); $('bMus').classList.toggle('off', !SND.musicOn); };
addEventListener('resize', () => { if (grid) layout(); });
addEventListener('keydown', e => {
  if (e.key === 'h' || e.key === 'H') useHint();
  else if (e.key === 'r' || e.key === 'R') useShuffle();
  else if (e.key === 'b' || e.key === 'B') useBomb();
  else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
});

/* 首屏：先摆好棋盘，再盖上菜单 */
setupBoard();
showMenu();
})();
