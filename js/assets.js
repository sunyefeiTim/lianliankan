/*
 * 资源配置表：换素材只需要改这里或直接覆盖同名文件。
 * 路径相对 index.html。双击打开（file://）也能加载。
 */
window.ASSETS = {
  tiles: [
    'apple', 'orange', 'lemon', 'grape', 'watermelon', 'strawberry', 'cherry', 'pear',
    'banana', 'carrot', 'mushroom', 'panda', 'frog', 'cat', 'pig', 'chick',
    'bear', 'fish', 'star', 'flower', 'heart', 'balloon', 'candy', 'clover',
    'moon', 'sun'
  ].map(id => ({ id, src: 'assets/tiles/' + id + '.svg' })),

  sfx: {
    select:  { src: 'assets/sfx/select.wav',  volume: 0.7 },
    match:   { src: 'assets/sfx/match.wav',   volume: 0.8 },
    fail:    { src: 'assets/sfx/fail.wav',    volume: 0.7 },
    hint:    { src: 'assets/sfx/hint.wav',    volume: 0.7 },
    shuffle: { src: 'assets/sfx/shuffle.wav', volume: 0.7 },
    tick:    { src: 'assets/sfx/tick.wav',    volume: 0.5 },
    win:     { src: 'assets/sfx/win.wav',     volume: 0.8 },
    lose:    { src: 'assets/sfx/lose.wav',    volume: 0.8 },
    start:   { src: 'assets/sfx/start.wav',   volume: 0.7 }
  },

  music: { src: 'assets/sfx/bgm.wav', volume: 0.32 }
};
