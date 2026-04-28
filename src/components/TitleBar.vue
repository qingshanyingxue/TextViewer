<template>
  <div class="titlebar" :class="platform">
    <!-- macOS: traffic lights are native, just drag region -->
    <div class="drag-region">
      <span class="app-name">文本查看器</span>
      <span v-if="filename" class="filename">— {{ filename }}</span>
    </div>
    <!-- Windows custom controls -->
    <div v-if="platform !== 'darwin'" class="win-controls">
      <button class="ctrl minimize" @click="minimize" title="最小化">
        <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="ctrl maximize" @click="maximize" title="最大化">
        <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor"/></svg>
      </button>
      <button class="ctrl close" @click="close" title="关闭">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/>
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({ filename: String, platform: String })

function minimize() { window.electronAPI?.windowMinimize() }
function maximize() { window.electronAPI?.windowMaximize() }
function close()    { window.electronAPI?.windowClose() }
</script>

<style scoped>
.titlebar {
  height: var(--titlebar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.titlebar.darwin {
  padding-left: 80px; /* space for traffic lights */
}

.drag-region {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  overflow: hidden;
}

.app-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.filename {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.win-controls {
  display: flex;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.ctrl {
  width: 46px;
  height: var(--titlebar-height);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.ctrl:hover { background: rgba(255,255,255,0.1); color: var(--text); }
.ctrl.close:hover { background: #e81123; color: #fff; }
</style>
