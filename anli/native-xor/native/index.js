let addon = null

try {
  addon = require('../build/Release/xor.node')
} catch (e) {
  console.warn('[xor] native addon 加载失败，使用 JS 降级实现')
}

/**
 * XOR 加密 / 解密（对称操作）
 * @param {string} text  明文或密文
 * @param {number} key   0~255 的整数密钥
 * @returns {string}
 */
function xorCipher(text, key) {
  if (addon) {
    return addon.xorCipher(text, key)
  }
  // JS 降级实现
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ (key & 0xFF))
  }
  return result
}

module.exports = { xorCipher, isNative: !!addon }
