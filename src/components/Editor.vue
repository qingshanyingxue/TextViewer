<template>
  <div class="editor-wrap">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="file-info">
        <span class="ext-badge" :style="{ background: extColor }">{{ file.ext || 'txt' }}</span>
        <span class="filepath" :title="file.filePath">{{ file.filePath }}</span>
        <span v-if="isDirty" class="dirty-dot" title="有未保存的更改">●</span>
      </div>
      <div class="actions">
        <button
          v-if="isMarkdown"
          class="toggle-btn"
          :class="{ active: viewMode === 'preview' }"
          @click="toggleView"
          title="切换预览/编辑"
        >
          {{ viewMode === 'preview' ? '✏️ 编辑' : '👁 预览' }}
        </button>
        <button
          v-if="viewMode !== 'preview'"
          class="toggle-btn"
          :class="{ active: viewMode === 'highlight' }"
          @click="viewMode = viewMode === 'highlight' ? 'edit' : 'highlight'"
          title="切换高亮显示/原始编辑"
        >
          {{ viewMode === 'highlight' ? '✏️ 编辑' : '🎨 取消' }}
        </button>
        <button class="action-btn save-btn" :disabled="!isDirty" @click="save" title="保存 (Ctrl+S)">
          保存
        </button>
        <button class="action-btn" @click="saveAs" title="另存为 (Ctrl+Shift+S)">另存为</button>
        <button class="action-btn" @click="openAnother">打开</button>
      </div>
    </div>

    <!-- Markdown Preview -->
    <div
      v-if="isMarkdown && viewMode === 'preview'"
      class="markdown-body"
      v-html="renderedMarkdown"
    />

    <!-- Raw editable textarea (edit mode) -->
    <div v-else-if="viewMode === 'edit'" class="edit-wrap">
      <textarea
        ref="textareaRef"
        class="raw-editor"
        v-model="editContent"
        spellcheck="false"
        @keydown.tab.prevent="insertTab"
      />
    </div>

    <!-- Syntax-highlighted read view with line numbers -->
    <div v-else class="code-wrap">
      <div class="line-numbers" aria-hidden="true">
        <span v-for="n in lineCount" :key="n">{{ n }}</span>
      </div>
      <pre class="code-content" v-html="highlightedCode" />
    </div>

    <!-- Save toast -->
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="toast.type">{{ toast.msg }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const props = defineProps({
  file: { type: Object, required: true },
})
const emit = defineEmits(['file-saved'])

// ── state ──────────────────────────────────────────────
const viewMode = ref('preview')   // 'preview' | 'highlight' | 'edit'
const editContent = ref('')
const savedContent = ref('')
const textareaRef = ref(null)
const toast = ref(null)
let toastTimer = null

const isDirty = computed(() => editContent.value !== savedContent.value)

// ── markdown-it ────────────────────────────────────────
const md = new MarkdownIt({
  html: true, linkify: true, typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

const MARKDOWN_EXTS = new Set(['md', 'markdown', 'mdx'])
const isMarkdown = computed(() => MARKDOWN_EXTS.has(props.file.ext))

const renderedMarkdown = computed(() => isMarkdown.value ? md.render(editContent.value) : '')

const highlightedCode = computed(() => {
  const lang = EXT_LANG_MAP[props.file.ext] || props.file.ext
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(editContent.value, { language: lang, ignoreIllegals: true }).value
    } catch {}
  }
  return escapeHtml(editContent.value)
})

const lineCount = computed(() => editContent.value.split('\n').length)
const extColor = computed(() => EXT_COLORS[props.file.ext] || '#555')

// ── watch file prop ────────────────────────────────────
watch(() => props.file, (f) => {
  editContent.value = f.content || ''
  savedContent.value = f.content || ''
  viewMode.value = isMarkdown.value ? 'preview' : 'highlight'
}, { immediate: true })

// ── actions ────────────────────────────────────────────
function toggleView() {
  if (viewMode.value === 'preview') viewMode.value = 'edit'
  else viewMode.value = 'preview'
}

async function save() {
  if (!props.file.filePath) return saveAs()
  const res = await window.electronAPI?.saveFile(props.file.filePath, editContent.value)
  if (res?.success) {
    savedContent.value = editContent.value
    showToast('已保存', 'success')
  } else {
    showToast(res?.error || '保存失败', 'error')
  }
}

async function saveAs() {
  const res = await window.electronAPI?.saveFileAs(editContent.value, props.file.name)
  if (res?.canceled) return
  if (res?.success) {
    savedContent.value = editContent.value
    emit('file-saved', { filePath: res.filePath, ext: res.ext, name: res.name })
    showToast('已另存为 ' + res.name, 'success')
  } else {
    showToast(res?.error || '保存失败', 'error')
  }
}

async function openAnother() {
  await window.electronAPI?.openFileDialog()
}

function insertTab(e) {
  const el = textareaRef.value
  const start = el.selectionStart
  const end = el.selectionEnd
  editContent.value = editContent.value.slice(0, start) + '  ' + editContent.value.slice(end)
  nextTick(() => { el.selectionStart = el.selectionEnd = start + 2 })
}

function showToast(msg, type = 'success') {
  clearTimeout(toastTimer)
  toast.value = { msg, type }
  toastTimer = setTimeout(() => { toast.value = null }, 2000)
}

// ── keyboard shortcuts ─────────────────────────────────
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (e.shiftKey) saveAs()
    else save()
  }
}

// ── menu events ────────────────────────────────────────
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.electronAPI?.onMenuSave(() => save())
  window.electronAPI?.onMenuSaveAs(() => saveAs())
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

// ── helpers ────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const EXT_LANG_MAP = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', cs: 'csharp',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
  ps1: 'powershell', bat: 'dos', cmd: 'dos',
  html: 'html', htm: 'html', xml: 'xml', svg: 'xml',
  css: 'css', scss: 'scss', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini',
  sql: 'sql', graphql: 'graphql',
  vue: 'xml', svelte: 'xml',
  ini: 'ini', cfg: 'ini', conf: 'ini',
  csv: 'plaintext', tsv: 'plaintext', log: 'plaintext', txt: 'plaintext',
}

const EXT_COLORS = {
  md: '#519aba', markdown: '#519aba', mdx: '#519aba',
  js: '#f7df1e', ts: '#3178c6', jsx: '#61dafb', tsx: '#3178c6',
  py: '#3572a5', rb: '#cc342d', go: '#00add8', rs: '#dea584',
  java: '#b07219', c: '#555555', cpp: '#f34b7d', cs: '#178600',
  html: '#e34c26', css: '#563d7c', json: '#292929', yaml: '#cb171e',
  sh: '#89e051', sql: '#e38c00', vue: '#41b883', svelte: '#ff3e00',
  txt: '#888', log: '#888',
}
</script>

<style scoped>
.editor-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
  position: relative;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 36px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;
}

.ext-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  color: #fff;
  text-transform: uppercase;
  flex-shrink: 0;
}

.filepath {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: text;
}

.dirty-dot {
  color: #e5c07b;
  font-size: 14px;
  flex-shrink: 0;
  line-height: 1;
}

.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.toggle-btn, .action-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn:hover, .action-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.toggle-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.save-btn:not(:disabled) {
  border-color: #4caf50;
  color: #4caf50;
}
.save-btn:not(:disabled):hover {
  background: #4caf50;
  color: #fff;
}
.save-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Markdown preview */
.markdown-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px 48px;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  user-select: text;
  line-height: 1.7;
  font-size: 15px;
  color: var(--text);
}

/* Raw textarea editor */
.edit-wrap {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.raw-editor {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 16px;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  overflow: auto;
}

/* Syntax-highlighted view */
.code-wrap {
  flex: 1;
  display: flex;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  user-select: text;
}

.line-numbers {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 16px 12px 16px 16px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  min-width: 48px;
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.6;
  user-select: none;
}

.code-content {
  flex: 1;
  padding: 16px;
  margin: 0;
  overflow: visible;
  white-space: pre;
  color: var(--text);
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* Toast */
.toast {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
  z-index: 100;
}
.toast.success { background: #4caf50; color: #fff; }
.toast.error   { background: #e53935; color: #fff; }

.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>

<style>
/* Global markdown styles */
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  color: #e2e8f0; margin: 1.5em 0 0.5em; line-height: 1.3;
}
.markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
.markdown-body p { margin: 0.8em 0; }
.markdown-body a { color: #58a6ff; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body code {
  background: #2d2d2d; padding: 2px 6px; border-radius: 4px;
  font-family: 'JetBrains Mono', Consolas, monospace; font-size: 0.88em; color: #e06c75;
}
.markdown-body pre {
  background: #2d2d2d; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 1em 0;
}
.markdown-body pre code { background: none; padding: 0; color: inherit; font-size: 13px; }
.markdown-body blockquote {
  border-left: 4px solid var(--accent); margin: 1em 0; padding: 4px 16px;
  color: var(--text-muted); background: var(--bg-secondary); border-radius: 0 4px 4px 0;
}
.markdown-body ul, .markdown-body ol { padding-left: 1.5em; margin: 0.5em 0; }
.markdown-body li { margin: 0.25em 0; }
.markdown-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.markdown-body th, .markdown-body td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.markdown-body th { background: var(--bg-secondary); font-weight: 600; }
.markdown-body tr:nth-child(even) { background: var(--bg-secondary); }
.markdown-body img { max-width: 100%; border-radius: 6px; }
.markdown-body hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }

.hljs { background: transparent; color: #abb2bf; }
.hljs-keyword, .hljs-selector-tag { color: #c678dd; }
.hljs-string, .hljs-attr { color: #98c379; }
.hljs-number, .hljs-literal { color: #d19a66; }
.hljs-comment { color: #5c6370; font-style: italic; }
.hljs-function, .hljs-title { color: #61afef; }
.hljs-variable, .hljs-name { color: #e06c75; }
.hljs-type, .hljs-class { color: #e5c07b; }
.hljs-built_in { color: #56b6c2; }
.hljs-tag { color: #e06c75; }
.hljs-attribute { color: #d19a66; }
.hljs-meta { color: #5c6370; }
</style>
