<template>
  <div class="container">
    <h2>🔐 XOR 加密 Demo <span class="badge" :class="isNative ? 'native' : 'js'">{{ isNative ? '⚡ C native' : '🟡 JS 降级' }}</span></h2>

    <div class="row">
      <label>密钥（0~255）</label>
      <input v-model.number="key" type="number" min="0" max="255" />
    </div>

    <div class="row">
      <label>明文</label>
      <textarea v-model="plainText" placeholder="输入要加密的文字..." />
    </div>

    <div class="btns">
      <button @click="encrypt">加密 →</button>
      <button @click="decrypt">← 解密</button>
    </div>

    <div class="row">
      <label>密文（十六进制）</label>
      <textarea v-model="cipherHex" placeholder="加密结果..." readonly />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const key       = ref(42)
const plainText = ref('Hello, Electron + C native!')
const cipherHex = ref('')
const isNative  = ref(false)

onMounted(async () => {
  isNative.value = await window.electronAPI?.isNative() ?? false
})

async function encrypt() {
  const raw = await window.electronAPI?.encrypt(plainText.value, key.value)
  // 转成十六进制展示
  cipherHex.value = [...raw].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')
}

async function decrypt() {
  // 从十六进制还原字符串
  const raw = cipherHex.value.trim().split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('')
  plainText.value = await window.electronAPI?.decrypt(raw, key.value)
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1e1e1e; color: #d4d4d4; font-family: sans-serif; }

.container {
  max-width: 600px;
  margin: 40px auto;
  padding: 24px;
  background: #252526;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h2 { font-size: 18px; display: flex; align-items: center; gap: 10px; }

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: normal;
}
.badge.native { background: #2d4a1e; color: #98c379; }
.badge.js     { background: #4a3a1e; color: #e5c07b; }

.row { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 12px; color: #858585; }

input, textarea {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  color: #d4d4d4;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
  font-family: monospace;
}
textarea { min-height: 80px; resize: vertical; }
input:focus, textarea:focus { border-color: #0e639c; }

.btns { display: flex; gap: 10px; }
button {
  flex: 1;
  padding: 8px;
  background: #0e639c;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
button:hover { background: #1177bb; }
</style>
