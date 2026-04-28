/**
 * 文件统计 native addon 封装
 * 优先加载编译好的 .node，失败时降级为纯 JS 实现
 */

let nativeAddon = null

try {
  nativeAddon = require('../build/Release/filestat.node')
} catch (e) {
  try {
    nativeAddon = require('../build/Debug/filestat.node')
  } catch (e2) {
    // 降级到纯 JS
  }
}

/**
 * 统计文件信息
 * @param {string} filePath
 * @returns {{ lines: number, words: number, bytes: number, chars: number }}
 */
function fileStat(filePath) {
  if (nativeAddon) {
    return nativeAddon.fileStat(filePath)
  }
  // 纯 JS 降级实现
  const fs = require('fs')
  const content = fs.readFileSync(filePath, 'utf-8')
  const bytes = fs.statSync(filePath).size
  const lines = content ? content.split('\n').length : 0
  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const chars = content.length
  return { lines, words, bytes, chars }
}

module.exports = { fileStat, isNative: !!nativeAddon }
