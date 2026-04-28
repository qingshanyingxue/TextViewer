#include <napi.h>
#include <string>

// XOR 加密 / 解密（对称，加密解密用同一个函数）
// 参数：(text: string, key: number)
Napi::String XorCipher(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "参数错误：需要 (text: string, key: number)")
            .ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }

    std::string text = info[0].As<Napi::String>().Utf8Value();
    uint8_t key = (uint8_t)(info[1].As<Napi::Number>().Uint32Value() & 0xFF);

    for (size_t i = 0; i < text.size(); i++) {
        text[i] ^= key;
    }

    return Napi::String::New(env, text);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("xorCipher", Napi::Function::New(env, XorCipher));
    return exports;
}

NODE_API_MODULE(xor, Init)
