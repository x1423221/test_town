<script setup>
// 區域之間的轉場畫面：「下一站：○○」
//   mode = 'next'   可以出發（按鈕「出發！」）
//   mode = 'locked' 時間還沒到，顯示倒數
//   mode = 'wip'    這一區還沒做好
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { drawTrain, TRAIN_LENGTH } from '../sprites/sceneArt.js'
import { GAME_TITLE } from '@route'

const props = defineProps({
  entry: { type: Object, required: true },
  mode: { type: String, required: true },
  msLeft: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'title-tap'])

const W = 192, H = 72
const canvas = ref(null)
let raf = null
let start = 0

function draw(t) {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#141a33'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 18; i++) { // 星星
    ctx.fillStyle = '#4a5490'
    ctx.fillRect((i * 37) % W, (i * 23) % 30, 1, 1)
  }
  ctx.fillStyle = '#6b6f80'; ctx.fillRect(0, 50, W, 22)   // 高架
  ctx.fillStyle = '#a8acb8'; ctx.fillRect(0, 50, W, 1)
  ctx.fillStyle = '#b8bece'; ctx.fillRect(0, 52, W, 1)   // 鐵軌
  // 可以出發時電車一直開；鎖住或製作中時電車停在月台
  const len = TRAIN_LENGTH(2)
  const x = props.mode === 'next' ? ((t - start) / 12) % (W + len) - len : (W - len) / 2
  drawTrain(ctx, Math.round(x), 33, 2, true)
  raf = requestAnimationFrame(draw)
}
onMounted(() => { start = performance.now(); raf = requestAnimationFrame(draw) })
onBeforeUnmount(() => cancelAnimationFrame(raf))

const countdown = computed(() => {
  const s = Math.floor(props.msLeft / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d} 天 ${h} 小時 ${m} 分`
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
})

const openTime = computed(() =>
  new Date(props.entry.unlockAt).toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }),
)
</script>

<template>
  <section class="card">
    <h1 class="title" @click="emit('title-tap')">{{ GAME_TITLE }}</h1>
    <canvas ref="canvas" :width="W" :height="H" class="train" />

    <p class="label">{{ entry.label ?? '下一站' }}</p>
    <p class="place">{{ entry.title }}</p>

    <template v-if="mode === 'next'">
      <button class="go" @click="emit('go')">出發！</button>
    </template>

    <template v-else-if="mode === 'locked'">
      <p class="wait">這一站在 {{ openTime }}開放</p>
      <p class="count">{{ countdown }}</p>
    </template>

    <template v-else>
      <template v-if="entry.message">
        <p v-for="(line, i) in entry.message" :key="i" class="wait">{{ line }}</p>
      </template>
      <p v-else class="wait">這一站還在準備中……</p>
    </template>
  </section>
</template>

<style scoped>
.card { max-width: 420px; margin: 0 auto; text-align: center; display: grid; gap: 12px; justify-items: center; }
.title { font-size: 18px; letter-spacing: 2px; user-select: none; }
.train { width: 100%; image-rendering: pixelated; border: 4px solid #f3efe8; }
.label { font-size: 13px; opacity: 0.7; letter-spacing: 4px; margin-top: 12px; }
.place { font-size: 32px; font-weight: 700; letter-spacing: 6px; }
.go {
  margin-top: 12px; font: inherit; font-size: 18px; font-weight: 700; padding: 12px 40px; cursor: pointer;
  background: #8cc63f; color: #1b2140; border: 4px solid #f3efe8; box-shadow: 0 4px 0 #4a7a1e;
}
.go:active { transform: translateY(3px); box-shadow: 0 1px 0 #4a7a1e; }
.wait { font-size: 14px; opacity: 0.8; }
.count { font-size: 28px; font-variant-numeric: tabular-nums; letter-spacing: 2px; color: #ffd166; }
</style>
