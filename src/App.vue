<template>
  <div class="app">
    <TitleBar :filename="fileState.name" :platform="platform" />
    <div class="content">
      <Editor v-if="fileState.content !== null" :file="fileState" @file-saved="onFileSaved" />
      <Welcome v-else @open="openFile" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import Editor from './components/Editor.vue'
import Welcome from './components/Welcome.vue'

const platform = ref('win32')
const fileState = ref({ content: null, ext: '', name: '', filePath: '' })

async function openFile() {
  await window.electronAPI?.openFileDialog()
}

function onFileSaved({ filePath, ext, name }) {
  fileState.value = { ...fileState.value, filePath, ext, name }
}

onMounted(async () => {
  platform.value = await window.electronAPI?.getPlatform() ?? 'win32'

  window.electronAPI?.onFileOpened((data) => {
    fileState.value = data
  })

  window.electronAPI?.onFileError((msg) => {
    alert('打开文件失败：' + msg)
  })

  // Handle drag-drop from Welcome screen
  window.addEventListener('internal-file-opened', (e) => {
    fileState.value = e.detail
  })
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
