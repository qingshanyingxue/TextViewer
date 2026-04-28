{
  "targets": [{
    "target_name": "matrix",
    "sources": ["native/matrix.cc"],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")"
    ],
    "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
    "cflags_cc": ["-std=c++14"],
    "conditions": [
      ["OS=='win'", {
        "msvs_settings": {
          "VCCLCompilerTool": {
            "ExceptionHandling": 1,
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
