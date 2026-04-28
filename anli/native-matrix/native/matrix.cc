#include <napi.h>
#include <vector>
#include <stdexcept>
#include <sstream>
#include <iomanip>

// ── C++ 矩阵类 ──────────────────────────────────────────
class Matrix {
public:
    int rows, cols;
    std::vector<std::vector<double>> data;

    Matrix(int r, int c) : rows(r), cols(c), data(r, std::vector<double>(c, 0.0)) {}

    // 矩阵乘法
    Matrix multiply(const Matrix& other) const {
        if (cols != other.rows)
            throw std::runtime_error("矩阵维度不匹配：A.cols 必须等于 B.rows");
        Matrix result(rows, other.cols);
        for (int i = 0; i < rows; i++)
            for (int j = 0; j < other.cols; j++)
                for (int k = 0; k < cols; k++)
                    result.data[i][j] += data[i][k] * other.data[k][j];
        return result;
    }

    // 矩阵转置
    Matrix transpose() const {
        Matrix result(cols, rows);
        for (int i = 0; i < rows; i++)
            for (int j = 0; j < cols; j++)
                result.data[j][i] = data[i][j];
        return result;
    }

    // 行列式（仅支持 2x2 / 3x3）
    double determinant() const {
        if (rows != cols) throw std::runtime_error("行列式只支持方阵");
        if (rows == 2)
            return data[0][0]*data[1][1] - data[0][1]*data[1][0];
        if (rows == 3)
            return data[0][0]*(data[1][1]*data[2][2] - data[1][2]*data[2][1])
                 - data[0][1]*(data[1][0]*data[2][2] - data[1][2]*data[2][0])
                 + data[0][2]*(data[1][0]*data[2][1] - data[1][1]*data[2][0]);
        throw std::runtime_error("行列式目前只支持 2x2 和 3x3 矩阵");
    }

    // 格式化输出字符串
    std::string toString() const {
        std::ostringstream ss;
        for (int i = 0; i < rows; i++) {
            ss << "[ ";
            for (int j = 0; j < cols; j++)
                ss << std::setw(8) << std::fixed << std::setprecision(2) << data[i][j] << " ";
            ss << "]\n";
        }
        return ss.str();
    }
};

// ── 辅助：JS Array → Matrix ─────────────────────────────
Matrix jsArrayToMatrix(Napi::Env env, Napi::Array arr) {
    int rows = arr.Length();
    if (rows == 0) throw std::runtime_error("矩阵不能为空");
    Napi::Array firstRow = arr.Get((uint32_t)0).As<Napi::Array>();
    int cols = firstRow.Length();
    Matrix m(rows, cols);
    for (int i = 0; i < rows; i++) {
        Napi::Array row = arr.Get((uint32_t)i).As<Napi::Array>();
        for (int j = 0; j < cols; j++)
            m.data[i][j] = row.Get((uint32_t)j).As<Napi::Number>().DoubleValue();
    }
    return m;
}

// ── 辅助：Matrix → JS Array ─────────────────────────────
Napi::Array matrixToJsArray(Napi::Env env, const Matrix& m) {
    Napi::Array result = Napi::Array::New(env, m.rows);
    for (int i = 0; i < m.rows; i++) {
        Napi::Array row = Napi::Array::New(env, m.cols);
        for (int j = 0; j < m.cols; j++)
            row.Set((uint32_t)j, Napi::Number::New(env, m.data[i][j]));
        result.Set((uint32_t)i, row);
    }
    return result;
}

// ── N-API 导出函数 ──────────────────────────────────────

// multiply(a: number[][], b: number[][]) → number[][]
Napi::Value Multiply(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        Matrix a = jsArrayToMatrix(env, info[0].As<Napi::Array>());
        Matrix b = jsArrayToMatrix(env, info[1].As<Napi::Array>());
        return matrixToJsArray(env, a.multiply(b));
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// transpose(a: number[][]) → number[][]
Napi::Value Transpose(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        Matrix a = jsArrayToMatrix(env, info[0].As<Napi::Array>());
        return matrixToJsArray(env, a.transpose());
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// determinant(a: number[][]) → number
Napi::Value Determinant(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        Matrix a = jsArrayToMatrix(env, info[0].As<Napi::Array>());
        return Napi::Number::New(env, a.determinant());
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// toString(a: number[][]) → string
Napi::Value ToString(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    try {
        Matrix a = jsArrayToMatrix(env, info[0].As<Napi::Array>());
        return Napi::String::New(env, a.toString());
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("multiply",    Napi::Function::New(env, Multiply));
    exports.Set("transpose",   Napi::Function::New(env, Transpose));
    exports.Set("determinant", Napi::Function::New(env, Determinant));
    exports.Set("toString",    Napi::Function::New(env, ToString));
    return exports;
}

NODE_API_MODULE(matrix, Init)
