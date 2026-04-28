#include <napi.h>
#include <fstream>
#include <string>
#include <cstdint>

#ifdef _WIN32
#include <windows.h>
// UTF-8 路径转 wstring，解决 Windows 中文路径问题
static std::wstring utf8ToWstring(const std::string& str) {
    if (str.empty()) return L"";
    int size = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
    std::wstring result(size - 1, 0);
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &result[0], size);
    return result;
}
#endif

Napi::Object FileStat(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "需要传入文件路径字符串").ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();

#ifdef _WIN32
    std::ifstream file(utf8ToWstring(filePath), std::ios::binary);
#else
    std::ifstream file(filePath, std::ios::binary);
#endif

    if (!file.is_open()) {
        Napi::Error::New(env, "无法打开文件: " + filePath).ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    int64_t lines = 0;
    int64_t words = 0;
    int64_t bytes = 0;
    int64_t chars = 0;

    bool inWord = false;
    char c;

    while (file.get(c)) {
        bytes++;
        if ((c & 0xC0) != 0x80) chars++;

        if (c == '\n') {
            lines++;
            inWord = false;
        } else if (c == ' ' || c == '\t' || c == '\r') {
            inWord = false;
        } else {
            if (!inWord) { words++; inWord = true; }
        }
    }

    if (bytes > 0) lines++;

    file.close();

    Napi::Object result = Napi::Object::New(env);
    result.Set("lines", Napi::Number::New(env, (double)lines));
    result.Set("words", Napi::Number::New(env, (double)words));
    result.Set("bytes", Napi::Number::New(env, (double)bytes));
    result.Set("chars", Napi::Number::New(env, (double)chars));
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("fileStat", Napi::Function::New(env, FileStat));
    return exports;
}

NODE_API_MODULE(filestat, Init)
