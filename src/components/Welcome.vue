<template>
  <div class="welcome" @dragover.prevent @drop.prevent="onDrop">
    <div class="hero">
      <div class="icon">📄</div>
      <h1>文本查看器</h1>
      <p>打开任意文本文件开始使用</p>
      <button class="open-btn" @click="$emit('open')">
        打开文件
        <kbd>{{ isMac ? '⌘O' : 'Ctrl+O' }}</kbd>
      </button>
      <p class="hint">或将文件拖放到此处</p>
      <div class="supported">
        <span v-for="ext in exts" :key="ext" class="tag">{{ ext }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineEmits(['open'])

const isMac = ref(false)
const exts = ['md', 'txt', 'json', 'yaml', 'toml', 'xml', 'html', 'css', 'js', 'ts', 'py', 'go', 'rs', 'java', 'c/cpp', 'sh', 'sql', '...']

onMounted(async () => {
  const p = await window.electronAPI?.getPlatform()
  isMac.value = p === 'darwin'
})

async function onDrop(e) {
  const file = e.dataTransfer.files[0]
  if (!file) return
  const data = await window.electronAPI?.readFile(file.path)
  if (data && !data.error) {
    // trigger file-opened manually
    window.dispatchEvent(new CustomEvent('internal-file-opened', { detail: data }))
  }
}
</script>

<style scoped>
.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  user-select: none;
}

.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.icon { font-size: 64px; line-height: 1; }

h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

p {
  font-size: 14px;
  color: var(--text-muted);
}

.open-btn {
  margin-top: 8px;
  padding: 10px 24px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s;
}
.open-btn:hover { background: var(--accent-hover); }

kbd {
  font-size: 11px;
  background: rgba(255,255,255,0.15);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: inherit;
}

.hint { font-size: 12px; }

.supported {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  max-width: 480px;
  margin-top: 8px;
}

.tag {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
}
</style>
