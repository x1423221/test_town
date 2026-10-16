// 像素人物資料：長大衣 + 笑眼版
// 每個 draw 函式回傳 { w, h, pixels }，pixels 是一維陣列，null 代表透明

const C = {
  skin: '#f7d3b8', blush: '#f2a2a0', mouthBoy: '#b8564e', mouthGirl: '#d9606e',
  boyHair: '#1f1b26', boyHairHi: '#3d3850',
  girlHair: '#2b1e24', girlHairHi: '#4d3843',
  eye: '#2a2230', pants: '#3c4258', shoe: '#4a3c32', outline: '#2b2233',
}
const BOY_COAT = { main: '#b5895a', shade: '#96704a', button: '#5a4030', scarf: '#8a8a94', scarfShade: '#6e6e78' }
const GIRL_COAT = { main: '#e6d6bf', shade: '#cbb99f', button: '#7a5e44', beret: '#c23b4a', beretShade: '#9e2e3c' }

const W = 24
const H = 37

function createBuffer(w = W, h = H) {
  return { w, h, pixels: new Array(w * h).fill(null) }
}

// 回傳一個「畫矩形」的函式，offsetY 用來做上下跳動
function painter(buf, offsetY = 0) {
  return (x, y, w, h, color) => {
    if (!color) return
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const X = x + i
        const Y = y + j + offsetY
        if (X >= 0 && X < buf.w && Y >= 0 && Y < buf.h) buf.pixels[Y * buf.w + X] = color
      }
    }
  }
}

// 在外圍加一圈描邊
function addOutline(buf, color) {
  const out = buf.pixels.slice()
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      if (buf.pixels[y * buf.w + x]) continue
      const touching = dirs.some(([dx, dy]) => {
        const X = x + dx, Y = y + dy
        return X >= 0 && X < buf.w && Y >= 0 && Y < buf.h && buf.pixels[Y * buf.w + X]
      })
      if (touching) out[y * buf.w + x] = color
    }
  }
  buf.pixels = out
  return buf
}

function smileEyes(r) {
  ;[7, 14].forEach((x) => {
    r(x, 13, 1, 1, C.eye); r(x + 1, 12, 1, 1, C.eye); r(x + 2, 13, 1, 1, C.eye)
  })
}

function surprisedEyes(r) {
  ;[8, 14].forEach((x) => {
    r(x, 12, 2, 2, C.eye); r(x, 12, 1, 1, '#ffffff')
  })
}

// ---------- 男生 ----------
function boyHead(r) {
  r(6, 8, 12, 9, C.skin); r(5, 10, 1, 5, C.skin); r(18, 10, 1, 5, C.skin)
  r(6, 2, 12, 1, C.boyHair); r(5, 3, 14, 1, C.boyHair); r(4, 4, 16, 6, C.boyHair)
  ;[6, 7, 9, 11, 12, 14, 16, 17].forEach((x) => r(x, 10, 1, 1, C.boyHair)) // 瀏海
  r(4, 10, 2, 3, C.boyHair); r(18, 10, 2, 3, C.boyHair)
  r(8, 4, 4, 1, C.boyHairHi); r(7, 5, 2, 1, C.boyHairHi)
  smileEyes(r)
  r(7, 14, 2, 1, C.blush); r(15, 14, 2, 1, C.blush)
  r(11, 15, 2, 1, C.mouthBoy)
}

function boyCoat(r) {
  const o = BOY_COAT
  r(5, 18, 14, 12, o.main)
  r(12, 19, 1, 11, o.shade)
  ;[20, 23, 26].forEach((y) => { r(10, y, 1, 1, o.button); r(14, y, 1, 1, o.button) })
  r(7, 17, 10, 2, o.scarf); r(7, 18, 10, 1, o.scarfShade)
  r(14, 19, 2, 5, o.scarf); r(14, 24, 1, 1, o.scarf); r(15, 24, 1, 1, o.scarfShade)
}

// ---------- 男生：側面（面向右，往左時整張翻轉） ----------
function drawBoySide(walking, frame) {
  const buf = createBuffer()
  const r = painter(buf, walking ? 0 : frame)
  const o = BOY_COAT
  const stride = walking && frame === 0
  if (stride) {
    r(13, 28, 4, 4, C.pants); r(13, 32, 5, 1, C.shoe)
    r(7, 28, 4, 4, C.pants); r(6, 32, 5, 1, C.shoe)
  } else {
    r(10, 28, 5, 4, C.pants); r(10, 32, 6, 1, C.shoe)
  }
  r(8, 18, 10, 12, o.main)                 // 大衣側面
  r(16, 19, 1, 11, o.shade)
  r(17, 21, 1, 1, o.button); r(17, 25, 1, 1, o.button)
  if (walking) {
    if (frame === 0) { r(14, 19, 3, 6, o.main); r(16, 25, 2, 1, C.skin) }
    else { r(9, 19, 3, 6, o.main); r(8, 25, 2, 1, C.skin) }
  } else {
    r(11, 19, 3, 7, o.main); r(11, 26, 3, 1, C.skin)
  }
  r(9, 17, 9, 2, o.scarf); r(9, 18, 9, 1, o.scarfShade) // 圍巾
  r(7, 19, 3, 5, o.scarf)                               // 圍巾尾巴垂在背後
  r(8, 8, 10, 9, C.skin)                                // 臉
  r(18, 11, 1, 2, C.skin)                               // 鼻子
  r(7, 2, 11, 1, C.boyHair); r(6, 3, 13, 6, C.boyHair)  // 頭髮
  r(6, 9, 4, 5, C.boyHair)
  r(15, 9, 4, 2, C.boyHair)                             // 瀏海
  r(9, 4, 4, 1, C.boyHairHi)
  r(13, 13, 1, 1, C.eye); r(14, 12, 1, 1, C.eye); r(15, 13, 1, 1, C.eye) // 笑眼
  r(14, 14, 2, 1, C.blush)
  r(16, 15, 1, 1, C.mouthBoy)
  return addOutline(buf, C.outline)
}

export function drawBoy(pose = 'idle', frame = 0) {
  if (pose === 'side-walk') return drawBoySide(true, frame)
  if (pose === 'side-idle') return drawBoySide(false, frame)
  const buf = createBuffer()

  const r = painter(buf, pose === 'idle' ? frame : 0)
  const walking = pose === 'walk'
  const legL = walking && frame ? 3 : 4
  const legR = walking && !frame ? 3 : 4
  r(7, 28, 4, legL, C.pants); r(6, 28 + legL, 5, 1, C.shoe)
  r(13, 28, 4, legR, C.pants); r(13, 28 + legR, 5, 1, C.shoe)

  const armL = walking ? (frame ? 5 : 6) : 6
  const armR = walking ? (frame ? 6 : 5) : 6
  r(3, 19, 2, armL, BOY_COAT.main); r(3, 19 + armL, 2, 1, C.skin)
  r(19, 19, 2, armR, BOY_COAT.main); r(19, 19 + armR, 2, 1, C.skin)

  boyCoat(r)
  boyHead(r)
  return addOutline(buf, C.outline)
}

// ---------- 女生：背面（往上走時用） ----------
function drawGirlBack(walking, frame) {
  const buf = createBuffer()
  const r = painter(buf, (walking ? 0 : 1 - frame) + 2)
  const o = GIRL_COAT

  const legL = walking && frame ? 1 : 2
  const legR = walking && !frame ? 1 : 2
  r(8, 28, 3, legL, C.pants); r(7, 28 + legL, 4, 1, C.shoe)
  r(13, 28, 3, legR, C.pants); r(13, 28 + legR, 4, 1, C.shoe)

  const armL = walking ? (frame ? 6 : 7) : 7
  const armR = walking ? (frame ? 7 : 6) : 7
  r(4, 19, 2, armL, o.main); r(4, 19 + armL, 2, 1, C.skin)
  r(18, 19, 2, armR, o.main); r(18, 19 + armR, 2, 1, C.skin)

  r(6, 18, 12, 12, o.main)
  r(12, 24, 1, 6, o.shade) // 背後開衩

  // 整片長髮蓋住後腦和背
  r(6, 2, 12, 1, C.girlHair); r(5, 3, 14, 1, C.girlHair)
  r(4, 4, 16, 14, C.girlHair)
  r(5, 18, 14, 6, C.girlHair)
  r(6, 24, 12, 1, C.girlHair)
  r(8, 6, 2, 10, C.girlHairHi); r(14, 6, 1, 8, C.girlHairHi)
  r(4, 10, 1, 4, C.skin); r(19, 10, 1, 4, C.skin) // 耳朵露一點

  r(6, 0, 11, 1, o.beret); r(4, 1, 15, 2, o.beret); r(3, 2, 2, 1, o.beret)
  r(4, 3, 16, 1, o.beretShade); r(12, -1, 1, 1, o.beretShade)
  return addOutline(buf, C.outline)
}

// ---------- 女生：側面（面向右，往左走時整張翻轉） ----------
function drawGirlSide(walking, frame) {
  const buf = createBuffer()
  const r = painter(buf, (walking ? 0 : 1 - frame) + 2)
  const o = GIRL_COAT
  const stride = walking && frame === 0

  // 後髮（在身後，往左飄）
  r(5, 6, 6, 18, C.girlHair); r(4, 10, 2, 12, C.girlHair); r(6, 24, 4, 1, C.girlHair)

  // 腿
  if (stride) {
    r(13, 28, 3, 2, C.pants); r(13, 30, 4, 1, C.shoe) // 前腳
    r(8, 28, 3, 2, C.pants); r(7, 30, 4, 1, C.shoe)   // 後腳
  } else {
    r(10, 28, 4, 2, C.pants); r(10, 30, 5, 1, C.shoe)
  }

  // 身體（大衣側面）
  r(8, 18, 9, 12, o.main)
  r(15, 19, 1, 11, o.shade)
  r(16, 21, 1, 1, o.button); r(16, 25, 1, 1, o.button)
  r(9, 17, 6, 2, o.shade) // 領口

  // 手臂擺動
  if (walking) {
    if (frame === 0) { r(13, 19, 3, 6, o.main); r(15, 25, 2, 1, C.skin) }
    else { r(9, 19, 3, 6, o.main); r(8, 25, 2, 1, C.skin) }
  } else {
    r(11, 19, 3, 7, o.main); r(11, 26, 3, 1, C.skin)
  }

  // 頭
  r(8, 7, 10, 10, C.skin)
  r(18, 11, 1, 2, C.skin) // 鼻子
  r(6, 2, 12, 1, C.girlHair); r(5, 3, 13, 4, C.girlHair)
  r(5, 7, 5, 9, C.girlHair)     // 側邊頭髮蓋住耳朵後方
  r(15, 7, 3, 2, C.girlHair)    // 瀏海
  r(7, 4, 3, 1, C.girlHairHi)
  // 笑眼（側面只看得到一隻）
  r(13, 12, 1, 1, C.eye); r(14, 11, 1, 1, C.eye); r(15, 12, 1, 1, C.eye)
  r(14, 14, 2, 1, C.blush)
  r(16, 15, 1, 1, C.mouthGirl)

  // 貝蕾帽（往前斜）
  r(6, 0, 11, 1, o.beret); r(4, 1, 15, 2, o.beret); r(17, 2, 2, 1, o.beret)
  r(4, 3, 15, 1, o.beretShade); r(10, -1, 1, 1, o.beretShade)
  return addOutline(buf, C.outline)
}

// ---------- 女生 ----------
export function drawGirl(pose = 'idle', frame = 0) {
  if (pose === 'back-idle') return drawGirlBack(false, frame)
  if (pose === 'back-walk') return drawGirlBack(true, frame)
  if (pose === 'side-idle') return drawGirlSide(false, frame)
  if (pose === 'side-walk') return drawGirlSide(true, frame)
  const buf = createBuffer()
  const r = painter(buf, (pose === 'idle' ? 1 - frame : 0) + 2)
  const o = GIRL_COAT
  const walking = pose === 'walk'
  const surprised = pose === 'surprise'

  r(3, 8, 3, 18, C.girlHair); r(18, 8, 3, 18, C.girlHair) // 後髮

  const legL = walking && frame ? 1 : 2
  const legR = walking && !frame ? 1 : 2
  r(8, 28, 3, legL, C.pants); r(7, 28 + legL, 4, 1, C.shoe)
  r(13, 28, 3, legR, C.pants); r(13, 28 + legR, 4, 1, C.shoe)

  if (!surprised) {
    const armL = walking ? (frame ? 6 : 7) : 7
    const armR = walking ? (frame ? 7 : 6) : 7
    r(4, 19, 2, armL, o.main); r(4, 19 + armL, 2, 1, C.skin)
    r(18, 19, 2, armR, o.main); r(18, 19 + armR, 2, 1, C.skin)
  }

  r(6, 18, 12, 12, o.main)
  r(12, 19, 1, 11, o.shade)
  ;[20, 23, 26].forEach((y) => { r(10, y, 1, 1, o.button); r(14, y, 1, 1, o.button) })
  r(9, 17, 6, 2, o.shade)

  r(6, 7, 12, 10, C.skin)
  // 中分長髮
  r(6, 2, 12, 1, C.girlHair); r(5, 3, 14, 1, C.girlHair); r(4, 4, 16, 3, C.girlHair)
  r(6, 7, 5, 1, C.girlHair); r(13, 7, 5, 1, C.girlHair)
  r(6, 8, 3, 1, C.girlHair); r(15, 8, 3, 1, C.girlHair)
  r(5, 8, 2, 10, C.girlHair); r(17, 8, 2, 10, C.girlHair)
  r(5, 18, 2, 5, C.girlHair); r(17, 18, 2, 5, C.girlHair)
  r(7, 4, 3, 1, C.girlHairHi); r(15, 4, 2, 1, C.girlHairHi)
  // 貝蕾帽
  r(6, 0, 11, 1, o.beret); r(4, 1, 15, 2, o.beret); r(3, 2, 2, 1, o.beret)
  r(4, 3, 16, 1, o.beretShade); r(12, -1, 1, 1, o.beretShade)

  r(7, 14, 2, 1, C.blush); r(15, 14, 2, 1, C.blush)

  if (surprised) {
    surprisedEyes(r)
    // 雙手摀嘴
    r(5, 19, 3, 3, o.main); r(16, 19, 3, 3, o.main)
    r(8, 17, 2, 2, o.main); r(14, 17, 2, 2, o.main)
    r(10, 15, 2, 2, C.skin); r(12, 15, 2, 2, C.skin)
  } else {
    smileEyes(r)
    r(11, 15, 2, 1, C.mouthGirl)
  }
  return addOutline(buf, C.outline)
}

export const CHARACTERS = { boy: drawBoy, girl: drawGirl }
