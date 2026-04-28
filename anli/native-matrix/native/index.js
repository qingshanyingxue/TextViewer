let addon = null

try {
  addon = require('../build/Release/matrix.node')
} catch (e) {
  console.warn('[matrix] native addon 加载失败，使用 JS 降级实现')
}

// JS 降级：矩阵乘法
function _multiply(a, b) {
  const rows = a.length, cols = b[0].length, inner = b.length
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) =>
      Array.from({ length: inner }, (_, k) => a[i][k] * b[k][j])
        .reduce((s, v) => s + v, 0)
    )
  )
}

// JS 降级：转置
function _transpose(a) {
  return a[0].map((_, j) => a.map(row => row[j]))
}

// JS 降级：行列式（2x2 / 3x3）
function _determinant(a) {
  if (a.length === 2)
    return a[0][0]*a[1][1] - a[0][1]*a[1][0]
  return a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])
       - a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])
       + a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0])
}

// JS 降级：格式化
function _toString(a) {
  return a.map(row => '[ ' + row.map(v => v.toFixed(2).padStart(8)).join(' ') + ' ]').join('\n')
}

const matrix = {
  multiply:    addon ? addon.multiply    : _multiply,
  transpose:   addon ? addon.transpose   : _transpose,
  determinant: addon ? addon.determinant : _determinant,
  toString:    addon ? addon.toString    : _toString,
  isNative: !!addon,
}

module.exports = matrix
