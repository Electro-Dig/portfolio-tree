// ============================================================================================================
//  Your portfolio tree. Edit this file, put your images / videos in content/media/, then run
//      python tools/scan_media.py
//  (it records the size of every file in content/media.js, which the layout needs).
//
//  Everything below is DEMO content — fictional works with generated pictures. Replace it with your own.
//
//  Dates are "YYYY.MM" (or "YYYY.MM.DD"). The trunk is time: site.start is at the root, site.end at the top.
//  tier: "F" = highlight (big card, the camera lingers), "N" = normal (default), "P" = small, passed quickly.
//  media: file names inside content/media/ — images (.jpg .png .webp) or videos (.mp4 .webm). Several = a small grid.
// ============================================================================================================
window.CONTENT = {
  site: {
    name: "我的作品树",                         // top-left label (the project count is added automatically)
    title: "一颗种子，长成一棵树",                // opening / closing title of the growth animation
    subtitle: "2024.01–2025.06 个人项目汇总",
    coverTitle: ["一颗种子", "长成一棵树"],       // the cover title, one entry per line
    start: "2024.01", end: "2025.06",
    theme: "sketch",                           // visual style: "sketch" or "crayon" (try ?theme=crayon)
    duration: 120,                             // length of the growth animation, seconds
    music: null,                               // optional: "content/music.mp3" — plays with the growth animation
    film: null,                                // optional: a pre-rendered video of the animation, e.g. "content/film.mp4"
    // beats: [ … ],                           // optional: beat times (s) of your music, for a small pulse on the beat
  },
  // the root of the tree: your first work
  seed: { title: "第一个作品", date: "2024.01", media: "seed.jpg", note: "一切从这里开始" },

  // big branches (fields) → groups (sub-branches, themes) → items (works)
  branches: [
    { label: "声音实验", from: "2024.02", groups: [
      { label: "合成器小玩具", items: [
        { title: "口袋鼓机", date: "2024.02", tier: "F", media: ["clip01.mp4"], note: "八个格子，点一下就是一段节奏", stamp: "精选",
          play: [["在线试玩", "https://example.com/"]] },
        { title: "单音合成器", date: "2024.04", media: ["work01.jpg"] },
        { title: "滤波器旋钮", date: "2024.07", tier: "P", media: ["work02.jpg"] },
      ] },
      { label: "节奏图形", items: [
        { title: "圆上的节拍", date: "2024.03", tier: "F", media: ["clip04.mp4"], note: "把节拍均匀地放在一个圆上" },
        { title: "多边形节奏", date: "2024.06", media: ["work03.jpg", "work04.jpg"] },
        { title: "复节奏练习", date: "2024.11", tier: "P", media: ["work05.jpg"] },
      ] },
      { label: "声音地图", items: [
        { title: "城市声音采集", date: "2024.08", media: ["work06.jpg"], note: "一周录下的街道声音" },
        { title: "风格关系图", date: "2025.02", tier: "P", media: ["work07.jpg"] },
      ] },
    ] },
    { label: "交互装置", from: "2024.04", groups: [
      { label: "身体与动作", items: [
        { title: "挥手乐队", date: "2024.05", tier: "F", media: ["clip02.mp4"], note: "摄像头识别手势，双手各控制一个声部", stamp: "展出" },
        { title: "跳舞的光点", date: "2024.09", media: ["work08.jpg"] },
        { title: "呼吸灯", date: "2025.01", tier: "P", media: ["work09.jpg"] },
      ] },
      { label: "光与影", items: [
        { title: "投影花园", date: "2024.07", media: ["clip05.mp4"], note: "投影随着人的影子生长" },
        { title: "彩色玻璃", date: "2024.12", tier: "P", media: ["work10.jpg"] },
      ] },
      { label: "纸与物件", items: [
        { title: "纸上的乐器", date: "2024.10", tier: "F", media: ["work11.jpg", "work12.jpg", "work13.jpg"], note: "画在纸上的颜色变成可以弹的键" },
        { title: "积木音序器", date: "2025.03", media: ["work14.jpg"] },
      ] },
    ] },
    { label: "数据可视化", from: "2024.08", groups: [
      { label: "城市数据", items: [
        { title: "公交的一天", date: "2024.09", tier: "F", media: ["clip03.mp4"], note: "一天里所有公交车的轨迹" },
        { title: "雨量年轮", date: "2024.12", media: ["work15.jpg"] },
        { title: "夜晚的灯", date: "2025.04", tier: "P", media: ["work16.jpg"] },
      ] },
      { label: "阅读笔记", items: [
        { title: "书架地图", date: "2025.01", media: ["work17.jpg"], note: "读过的书按主题连成网" },
        { title: "句子星座", date: "2025.05", tier: "P", media: ["work18.jpg"] },
      ] },
    ] },
    { label: "工具与插件", from: "2025.01", groups: [
      { label: "写作工具", items: [
        { title: "大纲生长器", date: "2025.02", media: ["work19.jpg"], note: "从一句话长出一份大纲" },
        { title: "灵感收集箱", date: "2025.04", tier: "P", media: ["work20.jpg"] },
      ] },
      { label: "设计工具", items: [
        { title: "配色抽屉", date: "2025.03", tier: "F", media: ["clip06.mp4"], note: "从一张照片里取出一套配色", play: [["打开工具", "https://example.com/"]] },
        { title: "图标小样", date: "2025.06", media: ["work21.jpg"] },
      ] },
      { label: "小实验", items: [
        { title: "番茄钟", date: "2025.02", tier: "P", media: ["work22.jpg"] },
        { title: "每日一图", date: "2025.05", tier: "P", media: ["work23.jpg", "work24.jpg"] },
      ] },
    ] },
  ],

  // events, talks, exhibitions — they ripen as fruit beside the trunk in their month
  events: { label: "项目 / 活动经验", items: [
    { date: "2024.03", title: "开放工作室", media: ["event01.jpg"] },
    { date: "2024.05", title: "城市创客节", media: ["event02.jpg"] },
    { date: "2024.08", title: "高校分享会", media: ["event03.jpg"] },
    { date: "2024.10", title: "社区工作坊", media: ["event04.jpg"] },
    { date: "2024.12", title: "年终展览", media: ["event05.jpg"] },
    { date: "2025.02", title: "线上分享", media: ["event06.jpg"] },
    { date: "2025.04", title: "设计周", media: ["event07.jpg"] },
    { date: "2025.06", title: "毕业展客座", media: ["event08.jpg"] },
  ] },

  // the poster wall: a separate page with every poster
  posterWall: { title: "海报墙", subtitle: "工作坊、分享与活动海报" },
  posters: [
    { media: "poster01.jpg", title: "开放工作室", date: "2024.03" },
    { media: "poster02.jpg", title: "声音游乐场 工作坊", date: "2024.05" },
    { media: "poster03.jpg", title: "用数据画画 分享会", date: "2024.08" },
    { media: "poster04.jpg", title: "创客之夜", date: "2024.10" },
    { media: "poster05.jpg", title: "光与纸 展览", date: "2024.12" },
    { media: "poster06.jpg", title: "一个人的工具 演示日", date: "2025.04" },
  ],
};
