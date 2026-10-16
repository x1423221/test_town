// 像素小鎮（傍晚、銀杏、路燈）
// x 是第幾格、lane 是第幾排（0 最裡面、4 最靠鏡頭）

export default {
  id: 'town',
  title: '像素小鎮',
  theme: 'park',
  width: 18,

  // 背景每一格：, 銀杏樹   S 路燈
  stalls: ',,,,S,,,,,S,,,,,,,',

  gate: { x: 15 },   // 小鎮車站（佔 3 格）

  start: { x: 0.5, lane: 2, facing: 'right' },

  introName: '他的信',
  intro: [
    '歡迎來到「像素小鎮」！',
    '這是我做的小遊戲，玩玩看吧。',
    '用方向鍵往左右走，往上下可以換一排。',
    '靠近別人的時候，頭上會出現放大鏡——點它，或按 A，就能說話。',
  ],

  // 彩蛋：他偶爾會從樹後面、畫面邊邊探頭偷看，點到他可以多拿一顆星星
  //   spots：tree 路邊的大樹（sprite: 'bigtree'）/ bgtree 後排的細樹 / edge 畫面上下左右邊框；everyMs：隔多久出現一次（隨機範圍）；stayMs：探頭多久
  peek: {
    spots: ['tree', 'bgtree', 'bgtree', 'edge', 'edge'], // 寫兩次＝比較常出現
    everyMs: [12000, 22000],
    stayMs: 2600,
    name: '他',
    lines: ['唉唷，不錯喔！', '被妳發現了～這顆給妳。'],
    againLines: ['嘿嘿，又被妳抓到了。'],
    reward: { id: 'star-pink', name: '躲起來的星星', note: '偷看被抓到的獎勵。' },
  },

  objects: [
    {
      id: 'sign', sprite: 'sign', x: 0.8, lane: 0,
      name: '看板',
      lines: ['像素小鎮　→ 往車站', '（方向鍵：移動／換排　A：調查、說話）'],
    },
    {
      id: 'baker', sprite: 'npc', colors: { hair: '#6a3a2a', coat: '#f3efe8', apron: '#e58fa6' }, x: 4, lane: 1,
      name: '麵包店阿姨',
      lines: ['歡迎來到像素小鎮～', '今天的麵包剛出爐喔！', '對了，長椅那邊的爺爺好像在找人陪他玩猜謎呢。'],
    },
    {
      id: 'kid', sprite: 'npc', colors: { hair: '#3a2a20', coat: '#f2c230' }, x: 6, lane: 3, walk: { from: 3, to: 10 },
      name: '小朋友',
      lines: ['大姐姐，妳的帽子好可愛！', '爺爺口袋裡有一個亮亮的東西喔，猜謎贏了就會送妳！'],
    },
    {
      id: 'bench', sprite: 'bench', x: 7.2, lane: 0,
      name: '長椅',
      lines: ['長椅上刻著小小的字：', '「走累了，休息一下也沒關係。」'],
    },
    {
      id: 'grandpa',
      sprite: 'npc',
      colors: { hair: '#c8c8d0', coat: '#5a6a4a', cap: '#3a4a32' },
      x: 9.6, lane: 1,
      name: '散步的爺爺',
      lines: [
        '小姐，要不要陪我玩個猜謎？',
        '答對的話，送妳一樣小東西。',
      ],
      quiz: {
        question: '他的生日是幾月幾號？',
        options: ['5 月 31 日', '3 月 14 日', '12 月 25 日', '7 月 7 日'],
        answer: 0,
        hints: ['咦，好像不是這天喔。', '他說：「這題答錯，我會難過喔。」'],
        successLines: ['答對了！看來妳很了解他呢。', '這個送妳。'],
        reward: {
          id: 'star',
          name: '小鎮的星星',
          note: '亮晶晶的，好漂亮。',
        },
      },
      afterLines: ['車站就在前面喔，路上小心。'],
      setFlag: 'gotStar',
    },
    {
      id: 'jogger', sprite: 'npc', colors: { hair: '#2a2a3a', coat: '#2e6ad0' }, x: 2, lane: 4, walk: { from: 1, to: 14 },
      name: '慢跑的大哥', lines: ['呼……呼……', '這個小鎮的傍晚最漂亮了！'],
    },
    {
      id: 'staff', sprite: 'npc', colors: { hair: '#2a2a3a', coat: '#e8582a', cap: '#e8582a' }, x: 14, lane: 1,
      name: '車站的站務員',
      lines: ['電車馬上就要進站了喔。', '回家路上小心～'],
    },

    // 路邊的大銀杏（他會躲在樹幹後面探頭）；lane 設成負的，讓樹站在最裡面那排的後面
    { id: 'bigtree-1', sprite: 'bigtree', x: 1.9, lane: -0.3 },
    { id: 'bigtree-2', sprite: 'bigtree', x: 11.6, lane: -0.3 },

    // 背景路人
    { id: 'crowd-1', sprite: 'npc', colors: { hair: '#8a6a4a', coat: '#7a4a4a' }, x: 11, lane: 3, walk: { from: 6, to: 14 } },
    { id: 'crowd-2', sprite: 'npc', colors: { hair: '#1f1b26', coat: '#c8b89a' }, x: 12, lane: 2, walk: { from: 8, to: 15 } },
  ],

  exit: {
    x: 16.4, // 車站門口
    requireFlag: 'gotStar',
    lockedLines: ['車站到了……', '咦，好像還有什麼東西沒拿到？先在鎮上逛逛吧。'],
    doneLines: ['（嗶——）', '搭上電車，回家囉。'],
  },
}
