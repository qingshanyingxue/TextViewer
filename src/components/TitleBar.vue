<template>
  <div class="titlebar" :class="platform">
    <!-- macOS: traffic lights are native, just drag region -->

    <!-- Windows: 左侧菜单栏 -->
    <div v-if="platform !== 'darwin'" class="menu-bar" @mouseleave="closeAll">
      <div
        v-for="menu in menus"
        :key="menu.label"
        class="menu-item"
        :class="{ active: openMenu === menu.label }"
        @click="toggleMenu(menu.label)"
        @mouseenter="hoverMenu(menu.label)"
      >
        {{ menu.label }}
        <div v-if="openMenu === menu.label" class="dropdown">
          <template v-for="item in menu.items" :key="item.label ?? '__sep__' + Math.random()">
            <div v-if="item.type === 'separator'" class="sep" />
            <div
              v-else
              class="drop-item"
              :class="{ disabled: item.disabled }"
              @click.stop="runAction(item)"
            >
              <span>{{ item.label }}</span>
              <span v-if="item.shortcut" class="shortcut">{{ item.shortcut }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="drag-region">
      <span v-if="platform === 'darwin'" class="app-name">文本查看器</span>
      <span v-if="filename" class="filename">{{ platform === 'darwin' ? '— ' : '' }}{{ filename }}</span>
    </div>

    <!-- Windows window controls -->
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
import { ref } from 'vue'

const props = defineProps({ filename: String, platform: String })
const emit = defineEmits(['action'])

const openMenu = ref(null)
let anyOpen = false

const menus = [
  {
    label: '文件',
    items: [
      { label: '打开文件...', shortcut: 'Ctrl+O', action: 'open' },
      { type: 'separator' },
      { label: '保存',       shortcut: 'Ctrl+S',       action: 'save' },
      { label: '另存为...',  shortcut: 'Ctrl+Shift+S', action: 'save-as' },
      { type: 'separator' },
      { label: '退出',       shortcut: 'Alt+F4',       action: 'quit' },
    ],
  },
  {
    label: '视图',
    items: [
      { label: '重新加载',   shortcut: 'Ctrl+R',   action: 'reload' },
      { type: 'separator' },
      { label: '放大',       shortcut: 'Ctrl++',   action: 'zoom-in' },
      { label: '缩小',       shortcut: 'Ctrl+-',   action: 'zoom-out' },
      { label: '重置缩放',   shortcut: 'Ctrl+0',   action: 'zoom-reset' },
      { type: 'separator' },
      { label: '切换全屏',   shortcut: 'F11',      action: 'fullscreen' },
    ],
  },
  {
    label: '编辑',
    items: [
      { label: '复制',   shortcut: 'Ctrl+C', action: 'copy' },
      { label: '全选',   shortcut: 'Ctrl+A', action: 'select-all' },
    ],
  },
]

function toggleMenu(label) {
  if (openMenu.value === label) {
    openMenu.value = null
    anyOpen = false
  } else {
    openMenu.value = label
    anyOpen = true
  }
}

function hoverMenu(label) {
  if (anyOpen) openMenu.value = label
}

function closeAll() {
  openMenu.value = null
  anyOpen = false
}

function runAction(item) {
  closeAll()
  emit('action', item.action)
}

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
  flex-shrink: 0;
  -webkit-app-region: drag;
  position: relative;
  z-index: 200;
}

.titlebar.darwin {
  padding-left: 80px;
}

/* ── menu bar ── */
.menu-bar {
  display: flex;
  align-items: stretch;
  height: 100%;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s, color 0.1s;
}
.menu-item:hover,
.menu-item.active {
  background: var(--bg-tertiary);
  color: var(--text);
}

/* ── dropdown ── */
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  background: #2c2c2c;
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  padding: 4px 0;
  z-index: 999;
}

.drop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 14px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  gap: 24px;
  white-space: nowrap;
}
.drop-item:hover { background: var(--accent); }
.drop-item.disabled { opacity: 0.4; pointer-events: none; }

.shortcut {
  color: var(--text-muted);
  font-size: 11px;
}
.drop-item:hover .shortcut { color: rgba(255,255,255,0.7); }

.sep {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

/* ── drag region ── */
.drag-region {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  overflow: hidden;
  min-width: 0;
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

/* ── window controls ── */
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
