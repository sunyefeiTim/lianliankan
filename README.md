# 果果连连看

纯前端网页小游戏，双击 `index.html` 就能玩，不需要服务器和安装。

## 目录结构

```
index.html            页面入口
css/style.css         外观样式
js/assets.js          资源配置表（图标、音效、音乐路径和音量）
js/audio.js           音频播放
js/game.js            游戏逻辑（连线判定、关卡、计时、计分）
assets/tiles/*.svg    方块图案，26 种
assets/sfx/*.wav      音效 9 个 + 背景音乐 bgm.wav
tools/gen_assets.py   重新生成上面所有图案和声音（需要 numpy）
manifest.webmanifest  安装到手机用的应用信息（名字、图标、颜色）
sw.js                 离线缓存，装到手机后断网也能玩
assets/icons/         应用图标
tools/icon.html       图标模板，python tools/gen_icons.py 重新生成图标（需要 Pillow 和 Edge/Chrome）
archive/              早期的单文件版本，留作参考
```

## 替换素材

- 换图案：用同名文件覆盖 `assets/tiles/xxx.svg`，PNG 也可以，在 `js/assets.js` 里改扩展名即可。
- 加图案：放进 `assets/tiles/`，然后把名字加进 `js/assets.js` 的 tiles 列表。
- 换声音：覆盖 `assets/sfx/` 里的同名文件（wav、mp3、ogg 都行），音量在 `js/assets.js` 调。
- 重新生成默认素材：`python tools/gen_assets.py`

## 玩法

- 两个相同图案之间的连线拐弯不超过两次，就能消除，允许从棋盘外圈绕过去。
- **闯关模式**：20 关，过一关解锁下一关。按剩余时间给星：过半三星，过四分之一两星，否则一星。每关提示 3、重排 3、炸弹 1。
- **无尽模式**：一盘接一盘，分数累计，每清一盘多送一次提示和重排，记录最高分。
- 每关轮换玩法：经典、下落、上浮、左靠、右靠。
- 第 6 关起出现**冰冻方块**：不能点，旁边（上下左右）有方块被消除就解冻。
- 3 秒内连续消除算连击，得分翻倍，音调升高；连击 3 次以上有大字和震屏，每连击 5 次送一个**炸弹**。
- 炸弹：不管连线，直接炸掉一对相同图案（优先炸连不上的那对）。
- 快捷键：H 提示，R 重排，B 炸弹，P 或 Esc 暂停。
- 进度存在浏览器 localStorage（键名 `llk_save`），清浏览器数据会丢。

## 安装到手机（PWA）

1. 把整个文件夹发布到一个 HTTPS 网址（比如 GitHub Pages）。
2. 手机用 Chrome 打开这个网址，菜单里选“添加到主屏幕”或“安装应用”。
3. 装好后从桌面图标打开是全屏的，打开过一次之后断网也能玩。

想要 APK 安装包：把网址填进 https://www.pwabuilder.com ，选 Android 打包下载。

本机测试安装效果要用 `python -m http.server 5500` 开服务器再访问 http://localhost:5500 ，双击 file:// 打开不会启用离线缓存。
联网时总是加载最新文件；只有增删了文件才需要改 `sw.js` 里的 `VERSION`。

## 说明

- 脚本用普通 `<script>` 加载，没用 ES module，这样通过 file:// 打开也能运行。
- 标题字体从 Google Fonts 在线加载，离线时会换成系统字体。
