<script setup>
// 橫向捲軸場景：左右走＋上下換排（路面 5 排），靠近人或物件出現放大鏡
// 每一區的畫面由 scene.theme 決定（themes/ 資料夾）
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import GamePad from './GamePad.vue'
import { GAME_TITLE, QUIZ_LABEL } from '@route'
import {
  TILE, objectCanvas, girlCanvas, boyCanvas, magnifierCanvas, itemCanvas,
} from '../sprites/sceneArt.js'
import { ROWS, LANES, laneY } from '../sprites/stage.js'
import { THEMES } from '../sprites/themes/index.js'
import { isDebug, isSeen, markSeen, hasFlag, setFlag, hasItem, addItem, itemIds } from '../composables/useProgress.js'

const props = defineProps({ scene: { type: Object, required: true } })
const emit = defineEmits(['title-tap', 'exit'])

const VIEW_W = 8 * TILE
const VIEW_H = ROWS * TILE
const WALK_SPEED = 72     // 主角每秒走幾像素
const LANE_SPEED = 7      // 主角每秒換幾排
const NPC_SPEED = 26      // 路人每秒走幾像素
const REACH = 22          // 離人多近會出現放大鏡（像素）
const SPRITE_W = 24
const SPRITE_H = 37

const scene = props.scene
const theme = THEMES[scene.theme || 'park']
const worldW = scene.width * TILE
const doorX = scene.exit.x * TILE // 走到這裡就是這一區的終點
const key = (id) => `${scene.id}:${id}`
const rand = (a, b) => a + Math.random() * (b - a)

const canvas = ref(null)

// ---------- 主角 ----------
const startLane = scene.start.lane ?? 2
const player = {
  x: scene.start.x * TILE,  // 人物左邊緣
  lane: startLane,          // 目前位置（換排中會是小數）
  laneTarget: startLane,
  facing: scene.start.facing || 'right',
  moving: false, step: 0, stepClock: 0,
}
const centerX = (a) => a.x + SPRITE_W / 2

// 門的柱子之類的障礙物：實心，不能穿過
const obstacles = theme.obstacles(scene)
function blocked(cx, lane) {
  return obstacles.some((p) => Math.abs(lane - p.lane) < 0.6 && cx > p.x - 7 && cx < p.x + p.w + 7)
}

// ---------- 場景裡的人和物件 ----------
const actors = scene.objects.map((o) => ({
  ...o,
  x: o.x * TILE,
  lane: o.lane ?? 0,
  laneTarget: o.lane ?? 0,
  facing: 'right',
  moving: false, step: 0, stepClock: 0,
  pause: rand(0, 2000),
  targetX: o.x * TILE,
}))
const talkable = (a) => !!a.lines

function inReach(a) {
  const dx = Math.abs(centerX(a) - centerX(player))
  if (a.inStall) return player.lane <= 0.5 && dx <= REACH + 4 // 攤位裡的人：要走到最裡面那排
  return dx <= REACH && Math.abs(a.lane - player.lane) <= 1.01
}
function nearest() {
  let best = null, bestD = Infinity
  actors.forEach((a) => {
    if (!talkable(a) || !inReach(a)) return
    const d = Math.abs(centerX(a) - centerX(player)) + Math.abs(a.lane - player.lane) * 10
    if (d < bestD) { best = a; bestD = d }
  })
  return best
}
const atDoor = () => centerX(player) >= doorX - 4

// ---------- 對話框 ----------
const dialog = reactive({ open: false, name: '', lines: [], index: 0, shown: 0, onClose: null })
let typeTimer = null

function openDialog(name, lines, onClose = null) {
  held.length = 0
  Object.assign(dialog, { open: true, name, lines, index: 0, shown: 0, onClose })
  typeLine()
}
function typeLine() {
  clearInterval(typeTimer)
  dialog.shown = 0
  const full = dialog.lines[dialog.index]
  typeTimer = setInterval(() => {
    dialog.shown++
    if (dialog.shown >= full.length) clearInterval(typeTimer)
  }, 35)
}
const currentText = computed(() => (dialog.open ? dialog.lines[dialog.index].slice(0, dialog.shown) : ''))
const lineDone = computed(() => dialog.open && dialog.shown >= dialog.lines[dialog.index].length)

function advance() {
  if (!dialog.open) return
  if (!lineDone.value) {
    clearInterval(typeTimer)
    dialog.shown = dialog.lines[dialog.index].length
    return
  }
  if (dialog.index < dialog.lines.length - 1) {
    dialog.index++
    typeLine()
  } else {
    dialog.open = false
    const cb = dialog.onClose
    dialog.onClose = null
    cb?.()
  }
}

let talkingTo = null
function inspect(a) {
  talkingTo = a // 對話中這個人會停下來面向她
  if (a.quiz) {
    if (isSeen(key(a.id))) return openDialog(a.name, a.afterLines || a.lines)
    return openDialog(a.name, a.lines, () => openQuiz(a))
  }
  markSeen(key(a.id))
  if (a.setFlag) setFlag(a.setFlag)
  openDialog(a.name, a.lines)
}

function tryExit() {
  const ex = scene.exit
  if (ex.requireFlag && !hasFlag(ex.requireFlag)) {
    player.x -= 6 // 往回退一點，避免一直觸發
    return openDialog('', ex.lockedLines)
  }
  openDialog('', ex.doneLines, () => emit('exit', scene.id))
}

// ---------- 答題 ----------
const quiz = reactive({ open: false, obj: null, selected: 0, wrong: 0 })

function openQuiz(obj) {
  held.length = 0
  Object.assign(quiz, { open: true, obj, selected: 0 })
}

function choose(i) {
  const q = quiz.obj.quiz
  const obj = quiz.obj
  quiz.open = false
  if (i !== q.answer) {
    const hint = q.hints[Math.min(quiz.wrong, q.hints.length - 1)]
    quiz.wrong++
    return openDialog(obj.name, [hint], () => openQuiz(obj))
  }
  quiz.wrong = 0
  markSeen(key(obj.id))
  if (obj.setFlag) setFlag(obj.setFlag)
  openDialog(obj.name, q.successLines, () => {
    if (q.reward && !hasItem(q.reward.id)) addItem(q.reward.id)
    if (q.reward) showItem(q.reward)
  })
}

// ---------- 獲得道具 ----------
const itemPopup = reactive({ open: false, reward: null })
const itemCanvasEl = ref(null)

let afterItem = null
async function showItem(reward, then = null) {
  held.length = 0
  afterItem = then
  Object.assign(itemPopup, { open: true, reward })
  await nextTick()
  const img = itemCanvas(reward.id)
  const el = itemCanvasEl.value
  if (!img || !el) return
  el.width = img.width * 4
  el.height = img.height * 4
  const ctx = el.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, el.width, el.height)
}
function closeItem() {
  itemPopup.open = false
  const then = afterItem
  afterItem = null
  if (then) then()
}

const busy = () => dialog.open || quiz.open || itemPopup.open

// ---------- 輸入 ----------
const held = []
function press(dir) {
  if (quiz.open) { // 出題中：上下選答案
    const n = quiz.obj.quiz.options.length
    if (dir === 'up') quiz.selected = (quiz.selected + n - 1) % n
    if (dir === 'down') quiz.selected = (quiz.selected + 1) % n
    return
  }
  if (busy()) return
  const i = held.indexOf(dir)
  if (i >= 0) held.splice(i, 1)
  held.push(dir)
}
function release(dir) {
  const i = held.indexOf(dir)
  if (i >= 0) held.splice(i, 1)
}
function onA() {
  if (itemPopup.open) return closeItem()
  if (quiz.open) return choose(quiz.selected)
  if (dialog.open) return advance()
  if (atDoor()) return tryExit()
  const a = nearest()
  if (a) inspect(a)
}

const magnifierBoxes = []
let camX = 0
function onCanvasTap(e) {
  if (dialog.open) return advance()
  if (busy()) return
  const rect = canvas.value.getBoundingClientRect()
  const sx = ((e.clientX - rect.left) / rect.width) * VIEW_W
  const sy = ((e.clientY - rect.top) / rect.height) * VIEW_H
  const b = peek.box
  if (b && sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return catchPeek()
  const hit = magnifierBoxes.find((b) => sx >= b.x - 6 && sx <= b.x + 19 && sy >= b.y - 6 && sy <= b.y + 19)
  if (hit) inspect(hit.actor)
}

const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }
function onKeyDown(e) {
  if (KEYMAP[e.key]) { e.preventDefault(); if (!e.repeat) press(KEYMAP[e.key]) }
  if ([' ', 'Enter', 'z', 'j'].includes(e.key)) { e.preventDefault(); if (!e.repeat) onA() }
}
function onKeyUp(e) {
  if (KEYMAP[e.key]) release(KEYMAP[e.key])
}

// ---------- 更新 ----------
function lastOf(dirs) {
  for (let i = held.length - 1; i >= 0; i--) if (dirs.includes(held[i])) return held[i]
  return null
}

function approach(v, target, maxStep) {
  return Math.abs(target - v) <= maxStep ? target : v + Math.sign(target - v) * maxStep
}

function animateStep(a, dt, every) {
  a.stepClock += dt
  if (a.stepClock > every) { a.stepClock = 0; a.step ^= 1 }
}

function updatePlayer(dt) {
  const h = busy() ? null : lastOf(['left', 'right'])
  const v = busy() ? null : lastOf(['up', 'down'])

  if (v && player.lane === player.laneTarget) { // 換排：到達目前這排後才接受下一次
    const next = Math.max(0, Math.min(LANES - 1, player.laneTarget + (v === 'up' ? -1 : 1)))
    if (!blocked(centerX(player), next)) player.laneTarget = next
  }
  const wasLane = player.lane
  player.lane = approach(player.lane, player.laneTarget, LANE_SPEED * (dt / 1000))

  if (h) {
    player.facing = h
    const dx = (h === 'right' ? 1 : -1) * WALK_SPEED * (dt / 1000)
    const nx = Math.max(0, Math.min(player.x + dx, doorX - SPRITE_W / 2 + 2))
    if (!blocked(nx + SPRITE_W / 2, player.lane)) player.x = nx
    if (h === 'right' && atDoor()) tryExit()
  } else if (v && wasLane !== player.lane) {
    player.facing = v
  }

  player.moving = !!h || wasLane !== player.lane
  if (player.moving) animateStep(player, dt, 150)
}

function updateWalker(a, dt) {
  if (talkingTo === a && busy()) { // 被搭話：停下來面向她
    a.moving = false
    return
  }
  a.lane = approach(a.lane, a.laneTarget, 3 * (dt / 1000))
  if (a.pause > 0) {
    a.pause -= dt
    a.moving = false
    if (a.pause <= 0) {
      a.targetX = rand(a.walk.from, a.walk.to) * TILE
      if (Math.random() < 0.35) {
        a.laneTarget = Math.max(0, Math.min(LANES - 1, a.laneTarget + (Math.random() < 0.5 ? -1 : 1)))
      }
    }
    return
  }
  const dx = a.targetX - a.x
  if (Math.abs(dx) < 1) {
    a.pause = rand(800, 3500)
    a.moving = false
    return
  }
  a.facing = dx > 0 ? 'right' : 'left'
  a.x = approach(a.x, a.targetX, NPC_SPEED * (dt / 1000))
  a.moving = true
  animateStep(a, dt, 220)
}

// ---------- 畫面 ----------
let raf = null
let last = 0
let clock = 0

// ---------- 彩蛋：他偶爾從樹後面、畫面邊邊探頭偷看 ----------
//   設定在場景檔的 peek（沒有設定就不會出現）
//   點到他：第一次拿到 peek.reward，之後再點只會說 peek.againLines
const PEEK = scene.peek
const peek = reactive({ phase: 'wait', t: 0, wait: 0, kind: 'edge', side: 'right', tx: 0, y: 0, box: null })
function nextPeekWait() { return (PEEK?.everyMs || [12000, 22000]).reduce((a, b) => a + Math.random() * (b - a)) }
peek.wait = nextPeekWait()
const peekTrees = actors.filter((a) => a.sprite === 'bigtree') // 可以躲的大樹
const pick = (list) => list[Math.floor(Math.random() * list.length)]
function startPeek(forceKind, forceSide) {
  //   tree   路邊的大銀杏（場景裡 sprite: 'bigtree' 的物件）
  //   bgtree 後排的細銀杏（主題有提供 peekSpots 才有，例如公園）
  //   edge   畫面的上下左右邊框
  const spots = (PEEK.spots || ['edge']).filter((k) => (k !== 'tree' || peekTrees.length) && (k !== 'bgtree' || theme.peekSpots))
  let kind = forceKind || pick(spots)
  let side = forceSide || pick(kind === 'edge' ? ['left', 'right', 'top', 'bottom'] : ['left', 'right'])
  let tree = null, tx = 0
  if (kind === 'tree') { // 挑一棵在畫面裡的大樹
    tree = pick(peekTrees.filter((t) => t.x > camX + 8 && t.x + 36 < camX + VIEW_W)) || null
  } else if (kind === 'bgtree') { // 挑一棵在畫面裡的後排樹
    const hiddenByBigTree = (t) => peekTrees.some((b) => t * TILE + 24 > b.x && t * TILE < b.x + 44) // 被路邊大樹擋住的不要
    tx = pick(theme.peekSpots(scene).filter((t) => t * TILE > camX + 16 && t * TILE + 40 < camX + VIEW_W && !hiddenByBigTree(t))) ?? -1
  }
  if ((kind === 'tree' && !tree) || (kind === 'bgtree' && tx < 0)) { kind = 'edge'; side = forceSide || pick(['left', 'right', 'top', 'bottom']) }
  const lane = 1 + Math.floor(Math.random() * 3)
  const ex = 30 + Math.random() * (VIEW_W - 84) // 上下邊框探頭的位置（畫面座標）
  Object.assign(peek, { phase: 'out', t: 0, kind, side, tree, tx, lane, ex, box: null })
}
function updatePeek(dt) {
  if (!PEEK) return
  if (peek.phase === 'wait') {
    if (busy()) return
    peek.wait -= dt
    if (peek.wait <= 0) startPeek()
    return
  }
  peek.t += dt
  if (peek.phase === 'out' && peek.t > 500) Object.assign(peek, { phase: 'stay', t: 0 })
  else if (peek.phase === 'stay' && peek.t > (PEEK.stayMs || 2600)) Object.assign(peek, { phase: 'in', t: 0 })
  else if (peek.phase === 'in' && peek.t > 350) Object.assign(peek, { phase: 'wait', t: 0, wait: nextPeekWait(), box: null })
}
// 探出來的比例：0 = 完全躲起來，1 = 探到最出來（慢慢探出、快快縮回）
function peekAmount() {
  if (peek.phase === 'out') return Math.sin((peek.t / 500) * Math.PI / 2)
  if (peek.phase === 'stay') return 1
  if (peek.phase === 'in') return 1 - peek.t / 350
  return 0
}
// 他整個人（正面），以腳底為中心往旁邊歪，像在偷看
function drawLeaning(ctx, x, feet, lean, upsideDown = false) {
  const img = boyCanvas('idle', Math.floor(clock / 500) % 2)
  ctx.save()
  ctx.translate(Math.round(x + 12), feet)
  ctx.rotate(lean)
  if (upsideDown) ctx.scale(1, -1) // 從上面倒掛下來
  ctx.drawImage(img, -12, -img.height)
  ctx.restore()
}
// 後排的樹：他站在樹根旁邊，再把那棵樹畫一次蓋住躲著的部分（畫在背景層，世界座標）
function drawPeekBgTree(ctx) {
  if (!PEEK || peek.phase === 'wait' || peek.kind !== 'bgtree') return
  const k = peekAmount()
  const dir = peek.side === 'right' ? 1 : -1
  const feet = theme.treeBase
  const x = peek.tx * TILE + dir * 6 * k
  drawLeaning(ctx, x, feet, dir * 0.13 * k)
  theme.peekCover(ctx, peek.tx)
  if (peek.phase === 'stay') peek.box = { x: x - camX - 2, y: feet - SPRITE_H - 4, w: 28, h: SPRITE_H + 6 }
}
// 上下邊框：從畫面底下冒出頭，或從上面倒掛下來（畫面座標，畫在最上層）
function drawPeekVertical(ctx) {
  if (!PEEK || peek.phase === 'wait' || peek.kind !== 'edge' || !['top', 'bottom'].includes(peek.side)) return
  const k = peekAmount()
  const x = peek.ex
  const wobble = Math.sin(clock / 300) * 0.06 * k
  if (peek.side === 'bottom') {
    const feet = VIEW_H + SPRITE_H - 22 * k // 露出上面 22px（頭和肩膀）
    drawLeaning(ctx, x, feet, 0.12 * k + wobble)
    if (peek.phase === 'stay') peek.box = { x: x - 4, y: VIEW_H - 26, w: 32, h: 26 }
  } else {
    const top = -SPRITE_H + 24 * k // 倒掛：頭朝下露出 24px
    drawLeaning(ctx, x, top, -0.1 * k + wobble, true)
    if (peek.phase === 'stay') peek.box = { x: x - 4, y: 0, w: 32, h: 28 }
  }
}
// 回傳要排進人物圖層的探頭（跟其他人一起依前後排序）
function peekLayer() {
  if (!PEEK || peek.phase === 'wait') return null
  const k = peekAmount()
  const dir = peek.side === 'right' ? 1 : -1
  if (peek.kind === 'tree' && peek.tree) {
    // 躲在大樹幹後面：往旁邊探出半個身體
    const t = peek.tree
    const feet = feetOf(t) - 1
    const x = t.x + 10 + dir * 11 * k
    if (peek.phase === 'stay') peek.box = { x: x - camX - 2, y: feet - SPRITE_H - 4, w: 28, h: SPRITE_H + 6 }
    return { feet: feet - 0.5, draw: () => drawLeaning(ctx2d(), x, feet, dir * 0.13 * k) }
  }
  if (peek.kind !== 'edge' || !['left', 'right'].includes(peek.side)) return null
  // 畫面邊框：從左右邊邊探出半個身體，往畫面裡面歪
  const feet = Math.round(laneY(peek.lane))
  const x = peek.side === 'right' ? camX + VIEW_W - 14 * k : camX - 24 + 14 * k
  if (peek.phase === 'stay') peek.box = { x: peek.side === 'right' ? VIEW_W - 22 : 0, y: feet - SPRITE_H - 4, w: 22, h: SPRITE_H + 6 }
  return { feet: feet + 0.3, draw: () => drawLeaning(ctx2d(), x, feet, -dir * 0.15 * k) }
}
const ctx2d = () => canvas.value.getContext('2d')
// 測試用：網址加 ?debug，在主控台打 __peek('tree', 'right') 會馬上探頭
if (isDebug && PEEK) window.__peek = (kind, side) => startPeek(kind, side)
function catchPeek() {
  Object.assign(peek, { phase: 'in', t: 0, box: null })
  held.length = 0
  const first = PEEK.reward && !hasItem(PEEK.reward.id)
  openDialog(PEEK.name || '他', first ? PEEK.lines : (PEEK.againLines || PEEK.lines), () => {
    if (!first) return
    addItem(PEEK.reward.id)
    showItem(PEEK.reward)
  })
}

function drawSprite(ctx, img, x, y, flip) {
  if (!flip) return ctx.drawImage(img, x, y)
  ctx.save()
  ctx.translate(x + img.width, y)
  ctx.scale(-1, 1)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

const feetOf = (a) => (a.inStall ? theme.stallFeet : Math.round(laneY(a.lane)))

// 街上的人現在該用哪個姿勢
function poseOf(a) {
  if (talkingTo === a && busy()) return { img: objectCanvas(a, 0), flip: false } // 跟她說話：轉正面
  if (a.moving) return { img: objectCanvas(a, a.step, 'side'), flip: a.facing === 'left' }
  if (a.shop) {
    // 在攤位前挑東西：大部分時間背對鏡頭，偶爾轉頭看旁邊
    const t = (clock + a.x * 37) % 5200
    if (t < 900) return { img: objectCanvas(a, 1, 'side'), flip: Math.floor((clock + a.x * 37) / 5200) % 2 === 0 }
    return { img: objectCanvas(a, 0, 'back'), flip: false }
  }
  if (a.walk && a.lane < 0.5) return { img: objectCanvas(a, 0, 'back'), flip: false } // 走到攤位前停下來逛
  return { img: objectCanvas(a, 0), flip: false }
}

// 主角這一幀的樣子
function playerSprite() {
  const idle = Math.floor(clock / 550) % 2
  const frame = player.moving ? player.step : idle
  return { img: girlCanvas(player.facing, player.moving, frame), flip: player.facing === 'left' }
}
function render() {
  const ctx = canvas.value.getContext('2d')
  ctx.imageSmoothingEnabled = false
  camX = Math.round(Math.max(0, Math.min(centerX(player) - VIEW_W / 2, worldW - VIEW_W)))
  const x0 = Math.floor(camX / TILE), x1 = Math.min(Math.ceil((camX + VIEW_W) / TILE), scene.width)

  // 天空 → 遠景（畫面座標）
  theme.sky(ctx, camX, VIEW_W, clock, scene)
  theme.far?.(ctx, camX, VIEW_W, clock, scene)

  ctx.save()
  ctx.translate(-camX, 0)

  for (let tx = x0; tx < x1; tx++) theme.back(ctx, tx, scene, clock)
  drawPeekBgTree(ctx)
  theme.extras(ctx, scene, clock, worldW)

  // 攤位裡的人：站在櫃檯後面
  actors.filter((a) => a.inStall).forEach((a) => {
    drawSprite(ctx, objectCanvas(a, 0), Math.round(a.x), theme.stallFeet - SPRITE_H, false)
  })

  for (let tx = x0; tx < x1; tx++) theme.front(ctx, tx, scene)

  // 街上的人＋柱子：依前後排排序，靠鏡頭的蓋住後面的
  const layer = actors.filter((a) => !a.inStall).map((a) => {
    const { img, flip } = poseOf(a)
    const feet = feetOf(a)
    return { feet, draw: () => drawSprite(ctx, img, Math.round(a.x), feet - img.height, flip) }
  })
  const pFeet = Math.round(laneY(player.lane))
  const me = playerSprite()
  layer.push({ feet: pFeet + 0.5, draw: () => drawSprite(ctx, me.img, Math.round(player.x), pFeet - SPRITE_H, me.flip) })
  obstacles.forEach((p) => layer.push({ feet: p.foot - 1, draw: () => p.draw(ctx) }))
  const pk = peekLayer()
  if (pk) layer.push(pk)
  layer.sort((a, b) => a.feet - b.feet)
  layer.forEach((e) => e.draw())

  theme.overlay(ctx, scene) // 門的橫樑和招牌：在所有人上方

  // 放大鏡：還沒查過、而且在範圍內的人
  magnifierBoxes.length = 0
  if (!busy()) {
    const bob = Math.round(Math.sin(clock / 180) * 2)
    actors.forEach((a) => {
      if (!talkable(a) || isSeen(key(a.id)) || !inReach(a)) return
      const mx = Math.round(a.x) + 6
      const my = feetOf(a) - SPRITE_H - 15 + bob
      ctx.drawImage(magnifierCanvas(), mx, my)
      magnifierBoxes.push({ x: mx - camX, y: my, actor: a })
    })
  }
  ctx.restore()
  drawPeekVertical(ctx)

  // 右上角的道具欄
  let iy = 6
  itemIds.value.forEach((id) => {
    const img = itemCanvas(id)
    if (!img) return
    const s = img.height > 20 ? 0.5 : 1 // 大的道具縮小一半
    const w = Math.round(img.width * s), h = Math.round(img.height * s)
    const x = VIEW_W - w - 6
    ctx.fillStyle = 'rgba(20,26,51,0.75)'
    ctx.fillRect(x - 3, iy - 3, w + 6, h + 6)
    ctx.drawImage(img, x, iy, w, h)
    iy += h + 8
  })
}

function loop(t) {
  const dt = last ? Math.min(t - last, 50) : 16
  last = t
  clock += dt
  updatePlayer(dt)
  actors.forEach((a) => { if (a.walk) updateWalker(a, dt) })
  updatePeek(dt)
  render()
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  if (scene.intro && !isSeen(key('intro'))) {
    openDialog(scene.introName || '', scene.intro, () => markSeen(key('intro')))
  }
  raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(typeTimer)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div class="console">
    <h1 class="title" @click="emit('title-tap')">{{ scene.title === GAME_TITLE ? GAME_TITLE : `${GAME_TITLE}・${scene.title}` }}</h1>

    <div class="screen">
      <canvas ref="canvas" class="game" :width="VIEW_W" :height="VIEW_H" @pointerdown="onCanvasTap" />

      <div v-if="dialog.open" class="dialog" @pointerdown="advance">
        <p v-if="dialog.name" class="name">{{ dialog.name }}</p>
        <p class="text">{{ currentText }}</p>
        <span v-if="lineDone" class="next">▼</span>
      </div>

      <!-- 答題 -->
      <div v-if="quiz.open" class="quiz">
        <p class="name">{{ QUIZ_LABEL }}</p>
        <p class="question">{{ quiz.obj.quiz.question }}</p>
        <button
          v-for="(opt, i) in quiz.obj.quiz.options"
          :key="i"
          class="option"
          :class="{ on: quiz.selected === i }"
          @pointerdown.prevent="quiz.selected = i; choose(i)"
        >
          {{ opt }}
        </button>
      </div>

      <!-- 獲得道具 -->
      <div v-if="itemPopup.open" class="item-pop" @pointerdown.prevent="closeItem">
        <p class="got">獲得道具！</p>
        <canvas ref="itemCanvasEl" class="item-img" />
        <p class="item-name">{{ itemPopup.reward.name }}</p>
        <p class="note">{{ itemPopup.reward.note }}</p>
        <p class="tap">點一下繼續</p>
      </div>

    </div>

    <GamePad @press="press" @release="release" @a="onA" />
  </div>
</template>

<style scoped>
/* 整個遊戲剛好一個螢幕高：標題、畫面在上面，按鈕固定在最下面；在遊戲上滑手指不會捲動頁面 */
.console {
  max-width: 440px; margin: 0 auto; user-select: none; -webkit-user-select: none; touch-action: none;
  display: flex; flex-direction: column; height: calc(100vh - 14px); height: calc(100dvh - 14px);
}
.title { font-size: 15px; line-height: 18px; text-align: center; letter-spacing: 2px; margin-bottom: 4px; }
.screen {
  /* 畫面能多大就多大，但要留位置給按鈕：扣掉上下留白 14、標題 22、邊框 8、按鈕 190、畫面和按鈕之間至少 8，共 242px */
  width: min(100%, calc((100vh - 242px) * 192 / 264)); width: min(100%, calc((100dvh - 242px) * 192 / 264)); margin: 0 auto; flex: none;
  position: relative; border: 4px solid #f3efe8; background: #000; touch-action: none; overflow: hidden; }
.game { display: block; width: 100%; aspect-ratio: 192 / 264; image-rendering: pixelated; }
/* 對話框固定在畫面上方：主角走在下面的路上，不會被擋住 */
.dialog {
  position: absolute; left: 6px; right: 6px; top: 6px; min-height: 26%;
  background: #f3efe8; color: #1b2140; border: 4px solid #1b2140; outline: 3px solid #f3efe8;
  padding: 10px 12px 18px; cursor: pointer; z-index: 5;
}
.name { font-size: 13px; font-weight: 700; color: #c23b4a; margin-bottom: 4px; }
.text { font-size: 16px; line-height: 1.6; }
.next { position: absolute; right: 10px; bottom: 4px; font-size: 12px; animation: blink 0.6s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }

.quiz {
  position: absolute; inset: 6px; background: #f3efe8; color: #1b2140;
  border: 4px solid #1b2140; outline: 3px solid #f3efe8;
  padding: 12px; display: flex; flex-direction: column; gap: 8px; z-index: 5;
}
.question { font-size: 16px; line-height: 1.5; margin-bottom: 4px; }
.option {
  font: inherit; font-size: 15px; text-align: left; padding: 9px 12px; cursor: pointer;
  background: #fff; color: #1b2140; border: 3px solid #1b2140;
}
.option.on { background: #1b2140; color: #f3efe8; }
.option.on::before { content: '▶ '; }

.item-pop {
  position: absolute; inset: 0; background: rgba(12, 16, 36, 0.92); color: #f3efe8;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 20px; text-align: center; cursor: pointer; z-index: 6;
}
.got { font-size: 14px; color: #ffd166; letter-spacing: 2px; animation: pop 0.4s ease-out; }
.item-img { display: block; width: 136px; height: auto; image-rendering: pixelated; animation: pop 0.5s ease-out; }
.item-name { font-size: 18px; font-weight: 700; }
.note {
  white-space: pre-line; font-size: 15px; line-height: 1.7; color: #1b2140;
  background: #fff8e8; border: 3px solid #c9a46a; padding: 10px 14px; max-width: 90%;
}
.tap { font-size: 12px; opacity: 0.6; animation: blink 1s steps(2) infinite; }
@keyframes pop { 0% { transform: scale(0.3); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }

</style>
