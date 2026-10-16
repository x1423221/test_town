import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { GAME_TITLE } from '@route'

document.title = GAME_TITLE

// 長按畫面不要跳出右鍵／長按選單
document.addEventListener('contextmenu', (e) => e.preventDefault())

createApp(App).mount('#app')
