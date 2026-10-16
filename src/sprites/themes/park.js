// 小鎮公園：傍晚的天空、黃色銀杏、草地、車站入口
//   0-4 夕陽天空   3-6 銀杏樹＋草地＋路燈   7-10 碎石步道（有落葉）
import { TILE, px, hash } from '../sceneArt.js'
import { laneY, ground, bandedSky } from '../stage.js'

// ---------- 夕陽、遠方大樓剪影（視差） ----------
function sky(ctx, camX, viewW, clock, scene) {
  bandedSky(ctx, viewW, [[16, '#4a5aa0'], [16, '#6a6ab4'], [16, '#9a78b8'], [16, '#d488a8'], [16, '#f2a08a'], [16, '#f8c08a'], [24, '#fcd89a']])
  // 遠方大樓剪影
  const off = camX * 0.25
  for (let i = Math.floor(off / 12) - 1; i < off / 12 + viewW / 12 + 2; i++) {
    const h = 14 + Math.floor(hash(i, 3) * 26)
    px(ctx, i * 12 - off, 5 * TILE - h, 11, h, '#7a5a8a')
    if (hash(i, 5) > 0.6) px(ctx, i * 12 - off + 4, 5 * TILE - h + 4, 2, 2, '#ffd88a')
  }
}

// 銀杏（每一格都有一棵，交錯高低）；樹幹粗一點，探頭彩蛋可以躲在後面
function drawGinkgo(ctx, tx) {
  const X = tx * TILE
  const ty = 3 * TILE + (tx % 2 ? 6 : 0)
  const h = TREE_BASE - ty - 24
  px(ctx, X + 8, ty + 24, 8, h, '#5a4030')        // 樹幹
  px(ctx, X + 8, ty + 24, 2, h, '#6a4e3a')
  px(ctx, X + 14, ty + 24, 2, h, '#4a3426')
  px(ctx, X + 6, TREE_BASE - 2, 12, 2, '#4a3426')  // 樹根
  const leaf = ['#f2c230', '#e8a820', '#fbe07a']
  px(ctx, X + 1, ty + 6, 22, 20, leaf[1])
  px(ctx, X + 4, ty, 16, 8, leaf[0])
  px(ctx, X - 2, ty + 10, 6, 10, leaf[0]); px(ctx, X + 20, ty + 10, 6, 10, leaf[0])
  for (let i = 0; i < 8; i++) px(ctx, X + 2 + Math.floor(hash(tx, i + 20) * 18), ty + 2 + Math.floor(hash(tx, i + 30) * 20), 2, 2, leaf[2])
}
const TREE_BASE = 5 * TILE + 30 // 後排樹的樹根在畫面上的高度

// 探頭彩蛋：告訴遊戲哪些格子的樹可以躲（路燈那格不行），躲完再把那棵樹畫一次蓋在他前面
const peekSpots = (scene) => [...scene.stalls].map((c, tx) => (c === 'S' ? -1 : tx)).filter((tx) => tx >= 0)
const peekCover = (ctx, tx) => drawGinkgo(ctx, tx)

// ---------- 後層：銀杏樹、草地、矮欄杆、路燈 ----------
function back(ctx, tx, scene) {
  const X = tx * TILE
  px(ctx, X, 5 * TILE, TILE, 2 * TILE, '#5a7a42')  // 草地
  px(ctx, X, 5 * TILE, TILE, 2, '#6a8a4a')
  for (let i = 0; i < 6; i++) px(ctx, X + Math.floor(hash(tx, i) * TILE), 5 * TILE + 4 + Math.floor(hash(tx, i + 5) * 40), 1, 2, '#7a9a52')
  drawGinkgo(ctx, tx)
  // 矮欄杆
  px(ctx, X, 6 * TILE + 10, TILE, 2, '#3a3a48')
  for (let sx = 2; sx < TILE; sx += 8) px(ctx, X + sx, 6 * TILE + 10, 2, 14, '#3a3a48')
  // 路燈（S 的位置）
  if (scene.stalls[tx] === 'S') {
    px(ctx, X + 11, 4 * TILE, 2, 3 * TILE, '#2a3a32')
    px(ctx, X + 7, 4 * TILE - 8, 10, 9, '#2a3a32')
    px(ctx, X + 9, 4 * TILE - 6, 6, 5, '#ffe2a0')
    px(ctx, X + 8, 7 * TILE - 2, 8, 2, '#2a3a32')
  }
}

function front(ctx, tx) {
  ground(ctx, tx, {
    base: '#d8c8a8', edge: '#a8987a', curb: '#9a8a6a', curbHi: '#e8dcc0',
    dots: ['#f2c230', '#e8a820', '#c0b090', '#f2c230', '#b8a888'], dotSize: 2,
  })
}

// ---------- 飄落的銀杏葉＋車站入口 ----------
function extras(ctx, scene, clock, worldW) {
  // 車站入口
  if (scene.gate) {
    const X = scene.gate.x * TILE, W = 3 * TILE, bottom = laneY(0)
    px(ctx, X, 3 * TILE, W, bottom - 3 * TILE, '#e8e8ec')
    px(ctx, X, 3 * TILE, W, 3, '#c8c8d0')
    for (let sx = 0; sx < W; sx += 8) px(ctx, X + sx, 3 * TILE + 3, 4, 8, '#e8582a') // 紅白遮雨棚
    px(ctx, X, 3 * TILE + 11, W, 1, '#9a3a1e')
    px(ctx, X + 8, 3 * TILE + 18, W - 16, 10, '#2a3048')   // 招牌（車票圖示）
    px(ctx, X + W / 2 - 9, 3 * TILE + 20, 18, 6, '#ffd166')
    px(ctx, X + W / 2 - 1, 3 * TILE + 20, 2, 6, '#2a3048')
    const doorY = bottom - 46
    px(ctx, X + 10, doorY, W - 20, 46, '#2a3048')
    px(ctx, X + 12, doorY + 3, (W - 26) / 2, 43, '#5a7aa8'); px(ctx, X + W / 2 + 1, doorY + 3, (W - 26) / 2, 43, '#5a7aa8')
    px(ctx, X + 14, doorY + 5, 6, 14, '#bfe0ff'); px(ctx, X + W / 2 + 3, doorY + 5, 6, 14, '#bfe0ff')
  }
  // 飄落的葉子（世界座標，跟著畫面捲動）
  for (let i = 0; i < 26; i++) {
    const speed = 14 + hash(i, 1) * 12
    const y = ((clock / 1000) * speed + hash(i, 2) * 400) % 220 - 20
    const x = (hash(i, 3) * worldW + Math.sin(clock / 700 + i) * 10) % worldW
    px(ctx, Math.round(x), Math.round(y), 2, 1, i % 3 ? '#f2c230' : '#e8a820')
  }
}

export default { sky, back, front, extras, obstacles: () => [], overlay: () => {}, stallFeet: 7 * TILE - 9, treeBase: TREE_BASE, peekSpots, peekCover }
