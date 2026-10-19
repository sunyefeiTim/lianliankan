/*
 * 音频播放：用 <audio> 元素加载 assets.js 里的文件。
 * 选 HTMLAudio 而不是 fetch + WebAudio，是为了双击 index.html（file://）时也能正常发声。
 */
window.GameAudio = (() => {
  const cfg = window.ASSETS;
  const base = {};
  let sfxOn = true, musicOn = true, unlocked = false;

  for (const [name, s] of Object.entries(cfg.sfx)) {
    const a = new Audio(s.src);
    a.preload = 'auto';
    base[name] = { el: a, volume: s.volume ?? 1 };
  }
  const bgm = new Audio(cfg.music.src);
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = cfg.music.volume ?? 0.3;
  let wantMusic = false;

  /** name: key in ASSETS.sfx; opts.rate: playback speed / pitch (1 = original) */
  function play(name, opts = {}) {
    if (!sfxOn || !unlocked) return;
    const b = base[name];
    if (!b) return;
    const a = b.el.cloneNode();
    a.volume = Math.min(1, b.volume * (opts.volume ?? 1));
    if (opts.rate) {
      a.playbackRate = opts.rate;
      a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false;
    }
    a.play().catch(() => {});
  }

  function syncMusic() {
    if (musicOn && wantMusic && unlocked) bgm.play().catch(() => {});
    else bgm.pause();
  }

  return {
    /** call from a click/tap handler: browsers only allow sound after user input */
    unlock() { unlocked = true; syncMusic(); },
    play,
    music(on) { wantMusic = on; syncMusic(); },
    restartMusic() { bgm.currentTime = 0; syncMusic(); },
    setSfx(on) { sfxOn = on; },
    setMusic(on) { musicOn = on; syncMusic(); },
    get sfxOn() { return sfxOn; },
    get musicOn() { return musicOn; }
  };
})();
