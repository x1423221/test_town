<script setup>
// 仿掌機控制區：左邊十字鍵、右邊 A 鍵
// 按住方向鍵 → press(dir)，放開 → release(dir)
const emit = defineEmits(['press', 'release', 'a'])

const dirs = ['up', 'left', 'right', 'down']

function down(e, dir) {
  e.preventDefault()
  e.currentTarget.setPointerCapture?.(e.pointerId)
  emit('press', dir)
}
function up(e, dir) {
  e.preventDefault()
  emit('release', dir)
}
</script>

<template>
  <div class="pad">
    <div class="dpad">
      <button
        v-for="d in dirs"
        :key="d"
        :class="['key', d]"
        :aria-label="d"
        @pointerdown="down($event, d)"
        @pointerup="up($event, d)"
        @pointercancel="up($event, d)"
        @contextmenu.prevent
      >
        <span class="arrow" />
      </button>
    </div>

    <button class="a" aria-label="A" @pointerdown.prevent="emit('a')" @contextmenu.prevent>A</button>
  </div>
</template>

<style scoped>
.pad {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: auto; /* 推到畫面最下面，跟遊戲畫面分開一點 */
  padding: 4px 14px 8px; touch-action: none; user-select: none; -webkit-user-select: none;
}
/* 十字鍵：每顆 54px，彼此之間空 8px，比較不會誤按 */
.dpad { position: relative; width: 178px; height: 178px; }
.key {
  position: absolute; width: 54px; height: 54px; padding: 0; border: none; border-radius: 10px;
  background: #2b2f4a; box-shadow: 0 3px 0 #161a30; cursor: pointer; touch-action: none;
  display: grid; place-items: center;
}
.key:active { background: #3e4468; transform: translateY(2px); box-shadow: 0 1px 0 #161a30; }
.up { left: 62px; top: 0; }
.down { left: 62px; bottom: 0; }
.left { left: 0; top: 62px; }
.right { right: 0; top: 62px; }
.arrow { display: block; width: 0; height: 0; border: 10px solid transparent; }
.up .arrow { border-bottom-color: #a8aed0; transform: translateY(-5px); }
.down .arrow { border-top-color: #a8aed0; transform: translateY(5px); }
.left .arrow { border-right-color: #a8aed0; transform: translateX(-5px); }
.right .arrow { border-left-color: #a8aed0; transform: translateX(5px); }
.a {
  width: 74px; height: 74px; border-radius: 50%; border: none; cursor: pointer;
  background: #c23b4a; color: #f3efe8; font: inherit; font-size: 22px; font-weight: 700;
  box-shadow: 0 4px 0 #8e1a2a; touch-action: none;
}
.a:active { transform: translateY(3px); box-shadow: 0 1px 0 #8e1a2a; }
</style>
