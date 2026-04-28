{
  "targets": [{
    "target_name": "xor",
    "sources": ["native/xor.cc"],
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
