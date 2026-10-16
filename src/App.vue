<script setup>
import { ref, computed } from 'vue'
import SceneView from './components/SceneView.vue'
import StationCard from './components/StationCard.vue'
import { ROUTE } from '@route'
import {
  routeIndex, goToRoute, msUntilUnlock, ignoreTimeLock, resetProgress, isDebug, now, restartGame,
} from './composables/useProgress.js'

// 流程：轉場畫面（下一站）→ 按「出發」→ 場景 → 走到出口 → 下一區的轉場畫面……
const showCard = ref(true) // 一打開先顯示轉場畫面，當作開場
const sceneKey = ref(0)    // 換區或重置時用來重建場景

const entry = computed(() => ROUTE[routeIndex.value])
const msLeft = computed(() => (now.value, msUntilUnlock(entry.value)))
const cardMode = computed(() => {
  if (msLeft.value > 0) return 'locked'
  if (!entry.value.scene) return 'wip'
  return 'next'
})

function depart() {
  showCard.value = false
  sceneKey.value++
}

function onSceneExit() {
  if (routeIndex.value < ROUTE.length - 1) goToRoute(routeIndex.value + 1)
  showCard.value = true
}

// ---------- 後門：連點標題 5 下打開管理面板 ----------
const showAdmin = ref(isDebug)
let taps = 0
let tapTimer = null
function onTitleTap() {
  taps++
  clearTimeout(tapTimer)
  tapTimer = setTimeout(() => { taps = 0 }, 1500)
  if (taps >= 5) { showAdmin.value = !showAdmin.value; taps = 0 }
}

function jumpTo(i) {
  goToRoute(i)
  showCard.value = true
}

// ---------- 重新開始（每個畫面右上角都有） ----------
const askRestart = ref(false)
function confirmRestart() {
  askRestart.value = false
  restartGame()
  showCard.value = true
  sceneKey.value++
}

function restart() {
  resetProgress()
  showCard.value = true
  sceneKey.value++
}

function fmtNow() {
  return new Date(now.value).toLocaleString('zh-TW', { hour12: false })
}
</script>

<template>
  <main class="page">
    <button class="restart-btn" @click="askRestart = true">↺ 重新開始</button>
    <div v-if="askRestart" class="confirm" @click.self="askRestart = false">
      <div class="confirm-box">
        <p class="confirm-title">要重新開始嗎？</p>
        <p class="confirm-note">會回到第一關，目前的進度都會清掉。</p>
        <div class="confirm-row">
          <button class="confirm-no" @click="askRestart = false">取消</button>
          <button class="confirm-yes" @click="confirmRestart">重新開始</button>
        </div>
      </div>
    </div>
    <StationCard
      v-if="showCard || !entry.scene"
      :entry="entry"
      :mode="cardMode"
      :ms-left="msLeft"
      @go="depart"
      @title-tap="onTitleTap"
    />
    <SceneView
      v-else
      :key="`${entry.id}-${sceneKey}`"
      :scene="entry.scene"
      @title-tap="onTitleTap"
      @exit="onSceneExit"
    />

    <aside v-if="showAdmin" class="admin">
      <p>管理面板・{{ fmtNow() }}</p>
      <div class="row">
        <button v-for="(r, i) in ROUTE" :key="r.id" :class="{ on: i === routeIndex }" @click="jumpTo(i)">
          跳到{{ r.title }}
        </button>
      </div>
      <label class="check">
        <input v-model="ignoreTimeLock" type="checkbox" />
        無視時間鎖（測試用）
      </label>
      <button @click="restart">重置進度並重新開始</button>
    </aside>
  </main>
</template>

<style scoped>
.page { position: relative; max-width: 480px; margin: 0 auto; padding: 6px 8px 8px; }
.restart-btn {
  position: absolute; top: 5px; right: 8px; z-index: 5; font: inherit; font-size: 12px; padding: 3px 8px;
  background: transparent; color: #a8b0d8; border: 1px solid #4a5280; border-radius: 4px; cursor: pointer;
}
.confirm { position: fixed; inset: 0; z-index: 50; background: rgba(10, 12, 28, 0.7); display: grid; place-items: center; padding: 24px; }
.confirm-box { width: min(300px, 100%); background: #f3efe8; color: #1b2140; border: 4px solid #1b2140; box-shadow: 0 0 0 3px #f3efe8; padding: 18px 16px; text-align: center; }
.confirm-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.confirm-note { font-size: 14px; margin-bottom: 16px; opacity: 0.8; }
.confirm-row { display: flex; gap: 10px; justify-content: center; }
.confirm-row button { font: inherit; font-size: 15px; padding: 8px 16px; cursor: pointer; border: 3px solid #1b2140; }
.confirm-no { background: #f3efe8; color: #1b2140; }
.confirm-yes { background: #c23b4a; color: #f3efe8; border-color: #8e1a2a !important; }
.admin { margin-top: 24px; padding: 12px; border: 2px dashed #ff6f91; font-size: 13px; display: grid; gap: 8px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; }
.admin button { font: inherit; padding: 6px 8px; background: transparent; color: inherit; border: 1px solid currentColor; cursor: pointer; }
.admin button.on { background: #f3efe8; color: #1b2140; }
.check { display: flex; gap: 6px; align-items: center; }
</style>
