# Electron 调用原生 C/C++ 模块步骤

## 原理

Electron 基于 Node.js，Node.js 支持通过 **N-API（node-addon-api）** 加载原生 `.node` 动态库。
流程如下：

```
C/C++ 源码 (.cc)
    ↓ node-gyp 编译
原生模块 (.node 动态库)
    ↓ require() 加载
Node.js / Electron 主进程
    ↓ IPC
渲染进程 (Vue / React 等)
```

---

## 环境要求

| 工具 | 说明 |
|------|------|
| Python 3.x | node-gyp 依赖 |
| Visual Studio（Windows）| 提供 MSVC 编译器，需勾选"使用 C++ 的桌面开发" |
| Xcode CLI（macOS）| `xcode-select --install` |
| GCC（Linux）| `sudo apt install build-essential` |

---

## 步骤

### 1. 安装依赖

```bash
npm install node-addon-api
npm install --save-dev node-gyp
```

### 2. 编写 C++ 源码

新建 `native/hello.cc`：

```cpp
#include <napi.h>

Napi::String Hello(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), "你好，来自 C++！");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("hello", Napi::Function::New(env, Hello));
    return exports;
}

NODE_API_MODULE(hello, Init)
```

### 3. 编写编译配置 binding.gyp

在**项目根目录**新建 `binding.gyp`：

```json
{
  "targets": [{
    "target_name": "hello",
    "sources": ["native/hello.cc"],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")"
    ],
    "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
    "conditions": [
      ["OS=='win'", {
        "msvs_settings": {
          "VCCLCompilerTool": { "ExceptionHandling": 1 }
        }
      }]
    ]
  }]
}
```

### 4. 添加编译脚本

`package.json` 中加入：

```json
{
  "gypfile": true,
  "scripts": {
    "build:native": "node-gyp rebuild"
  }
}
```

### 5. 编译

```bash
npm run build:native
```

编译成功后生成 `build/Release/hello.node`。

### 6. 封装 JS 加载层（带降级）

新建 `native/index.js`：

```js
let addon = null
try {
  addon = require('../build/Release/hello.node')
} catch (e) {
  console.warn('native addon 加载失败，使用 JS 降级实现')
}

function hello() {
  if (addon) return addon.hello()
  return '你好，来自 JS 降级实现！'
}

module.exports = { hello, isNative: !!addon }
```

### 7. 在 Electron 主进程中使用

`electron/main.js`：

```js
const { ipcMain } = require('electron')
const native = require('../native/index.js')

ipcMain.handle('say-hello', () => {
  return native.hello()
})
```

### 8. preload 暴露接口

`electron/preload.js`：

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  sayHello: () => ipcRenderer.invoke('say-hello'),
})
```

### 9. 渲染进程调用

```js
const msg = await window.electronAPI.sayHello()
console.log(msg) // 你好，来自 C++！
```

### 10. 打包配置（electron-builder）

`.node` 文件不能被 asar 打包，需要解压出来：

```json
{
  "build": {
    "asar": true,
    "asarUnpack": ["build/Release/*.node"],
    "files": [
      "dist/**/*",
      "electron/**/*",
      "native/index.js",
      "build/Release/*.node"
    ]
  }
}
```

打包时 `@electron/rebuild` 会自动用 Electron 内置的 Node 版本重新编译 `.node`，无需手动处理。

---

## 注意事项

- `.node` 文件与 Node.js / Electron **版本强绑定**，换版本必须重新编译
- 主进程才能 `require` 原生模块，渲染进程通过 IPC 间接调用
- 始终提供 JS 降级实现，避免编译失败导致程序崩溃
- Windows 路径中有中文时，注意 MSVC 的代码页警告（加 `/utf-8` 编译选项可消除）


---

## C++ 模块额外说明

### 与纯 C 模块的区别

| 项目 | C 模块 | C++ 模块 |
|------|--------|----------|
| 文件扩展名 | `.c` 或 `.cc` | `.cc` / `.cpp` |
| 标准 | C99/C11 | C++11/14/17 |
| 特性 | 函数式 | 类、模板、STL、异常 |
| binding.gyp | 无需额外配置 | 需指定 C++ 标准 |

### binding.gyp 指定 C++ 标准

```json
{
  "targets": [{
    "cflags_cc": ["-std=c++14"],
    "conditions": [
      ["OS=='win'", {
        "msvs_settings": {
          "VCCLCompilerTool": {
            "AdditionalOptions": ["/std:c++14"]
          }
        }
      }],
      ["OS=='mac'", {
        "xcode_settings": {
          "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
          "CLANG_CXX_LIBRARY": "libc++"
        }
      }]
    ]
  }]
}
```

### 使用 STL 容器

```cpp
#include <vector>
#include <string>
#include <stdexcept>

// vector 可以直接用，无需额外配置
std::vector<double> data(rows, 0.0);
```

### 异常处理

N-API 推荐用 `NAPI_DISABLE_CPP_EXCEPTIONS`，手动捕获 C++ 异常转为 JS 异常：

```cpp
Napi::Value MyFunc(const Napi::CallbackInfo& info) {
    try {
        // ... C++ 代码，可能抛出 std::exception
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}
```

### 运行案例

```bash
cd anli/native-matrix
npm install
npm run build:native   # 编译 C++ 矩阵模块
npm run dev            # 启动，端口 5174
```

功能：矩阵乘法、转置、行列式、格式化输出，底层由 C++ `Matrix` 类实现。
