{
  # binding.gyp 是 node-gyp 的编译配置文件，语法类似 JSON（但支持 # 注释）
  # 作用：告诉 node-gyp 如何把你的 C/C++ 源码编译成 .node 文件
  # 运行方式：在项目根目录执行 node-gyp rebuild 或 npm run build:native

  "targets": [
    # targets 是一个数组，每个对象代表一个要编译的模块
    # 如果你有多个 C++ 模块，就在这里加多个 {} 对象
    {
      # ── 基本配置 ──────────────────────────────────────────

      # 模块名称，编译后生成 build/Release/<target_name>.node
      # JS 里 require('./build/Release/filestat.node') 就是用这个名字
      "target_name": "filestat",

      # 源文件列表，支持多个文件
      # 例如多文件：["native/filestat.cc", "native/utils.cc"]
      "sources": ["native/filestat.cc"],

      # ── 头文件搜索路径 ────────────────────────────────────

      # include_dirs：编译时去哪里找 .h 头文件
      # 这一行是固定写法，作用是自动找到 node-addon-api 的 napi.h 头文件路径
      # <!@(...) 是 gyp 的命令展开语法，等于执行括号里的 node 命令并把输出作为值
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],

      # ── 预处理宏定义 ──────────────────────────────────────

      # defines：相当于在代码最顶部加 #define XXX
      # NAPI_DISABLE_CPP_EXCEPTIONS：禁用 N-API 的 C++ 异常，改为手动处理
      # 这样可以避免异常跨越 JS/C++ 边界时的未定义行为
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],

      # ── 编译器标志 ────────────────────────────────────────

      # cflags!：从 C 编译器标志中【移除】某些选项（感叹号 = 移除）
      # cflags_cc!：从 C++ 编译器标志中【移除】某些选项
      # 这里移除 -fno-exceptions，是为了允许 C++ 异常（配合上面的 defines 使用）
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],

      # ── 平台条件配置 ──────────────────────────────────────

      # conditions：根据操作系统/平台设置不同的编译选项
      # 格式：["条件表达式", { 满足时的配置 }]
      # OS 可以是 'win' / 'mac' / 'linux'
      "conditions": [
        # Windows 平台：使用 MSVC 编译器，需要单独开启异常处理
        # ExceptionHandling: 1 = /EHsc，启用标准 C++ 异常
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }]

        # 如果还需要 macOS 配置，在这里继续加：
        # ,["OS=='mac'", {
        #   "xcode_settings": {
        #     "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
        #     "CLANG_CXX_LIBRARY": "libc++"
        #   }
        # }]
      ]
    }

    # 如果要新增第二个模块，在这里加逗号然后写新的 {} ：
    # ,{
    #   "target_name": "另一个模块名",
    #   "sources": ["native/other.cc"],
    #   "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
    #   "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"]
    # }
  ]
}
