<template>
  <div class="app">
    <h2>🧮 C++ 矩阵运算 Demo
      <span class="badge" :class="isNative ? 'native' : 'js'">
        {{ isNative ? '⚡ C++ native' : '🟡 JS 降级' }}
      </span>
    </h2>

    <!-- 矩阵输入 -->
    <div class="panels">
      <div class="panel">
        <div class="panel-title">矩阵 A <small>（行用换行分隔，列用空格分隔）</small></div>
        <textarea v-model="inputA" spellcheck="false" />
        <div class="error" v-if="errorA">{{ errorA }}</div>
      </div>
      <div class="panel">
        <div class="panel-title">矩阵 B</div>
        <textarea v-model="inputB" spellcheck="false" />
        <div class="error" v-if="errorB">{{ errorB }}</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="btns">
      <button @click="run('multiply')">A × B</button>
      <button @click="run('transpose')">转置 A</button>
      <button @click="run('determinant')">行列式 A</button>
      <button @click="run('toString')">格式化 A</button>
    </div>

    <!-- 结果 -->
    <div class="result-box" v-if="result !== null">
      <div class="panel-title">结果</div>
      <pre>{{ resultText }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const isNative = ref(false)
const inputA = ref('1 2 3\n4 5 6')
const inputB = ref('7 8\n9 10\n11 12')
const errorA = ref('')
const errorB = ref('')
const result = ref(null)
const opName = ref('')

onMounted(async () => {
  isNative.value = await window.matrixAPI?.isNative() ?? false
})

function parseMatrix(str, errRef) {
  errRef.value = ''
  try {
    const rows = str.trim().split('\n').map(r =>
      r.trim().split(/\s+/).map(v => {
        const n = parseFloat(v)
        if (isNaN(n)) throw new Error(`"${v}" 不是有效数字`)
        return n
      })
    )
    const cols = rows[0].length
    if (!rows.every(r => r.length === cols)) throw new Error('每行列数必须相同')
    return rows
  } catch (e) {
    errRef.value = e.message
    return null
  }
}

const resultText = computed(() => {
  if (result.value === null) return ''
  if (typeof result.value === 'number') return result.value.toFixed(6)
  if (typeof result.value === 'string') return result.value
  // 二维数组
  return result.value.map(row => '[ ' + row.map(v => v.toFixed(2).padStart(8)).join('  ') + ' ]').join('\n')
})

async function run(op) {
  const a = parseMatrix(inputA.value, errorA)
  if (!a) return
  opName.value = op

  try {
    if (op === 'multiply') {
      const b = parseMatrix(inputB.value, errorB)
      if (!b) return
      result.value = await window.matrixAPI.multiply(a, b)
    } else if (op === 'transpose') {
      result.value = await window.matrixAPI.transpose(a)
    } else if (op === 'determinant') {
      result.value = await window.matrixAPI.determinant(a)
    } else if (op === 'toString') {
      result.value = await window.matrixAPI.toString(a)
    }
  } catch (e) {
    errorA.value = e.message
  }
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1e1e1e; color: #d4d4d4; font-family: sans-serif; padding: 24px; }

.app { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }

h2 { font-size: 18px; display: flex; align-items: center; gap: 10px; }
.badge { font-size: 12px; padding: 2px 8px; border-radius: 4px; font-weight: normal; }
.badge.native { background: #2d4a1e; color: #98c379; }
.badge.js     { background: #4a3a1e; color: #e5c07b; }

.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel { display: flex; flex-direction: column; gap: 6px; }
.panel-title { font-size: 12px; color: #858585; }
.panel-title small { font-size: 10px; }

textarea {
  background: #252526; border: 1px solid #3e3e42; border-radius: 6px;
  color: #d4d4d4; padding: 10px; font-size: 13px; font-family: monospace;
  min-height: 100px; resize: vertical; outline: none;
}
textarea:focus { border-color: #0e639c; }

.error { font-size: 11px; color: #e06c75; }

.btns { display: flex; gap: 8px; flex-wrap: wrap; }
button {
  padding: 8px 16px; background: #0e639c; color: #fff;
  border: none; border-radius: 6px; cursor: pointer; font-size: 13px;
  transition: background 0.15s;
}
button:hover { background: #1177bb; }

.result-box {
  background: #252526; border: 1px solid #3e3e42;
  border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 6px;
}
pre { font-family: monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
</style>
