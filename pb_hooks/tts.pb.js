// pb_hooks/tts.pb.js

// 註冊一個自定義的 API 端點
routerAdd("POST", "/api/praise-tts", (c) => {
    try {
        // 1. 取得前端傳來的文字
        const data = $apis.requestInfo(c).data;
        const text = data.text;

        if (!text) {
            return c.json(400, { error: "Missing text" });
        }

        // 2. 從系統環境變數讀取 Token (Railway 會自動注入)
        // 注意：PocketBase JS VM 中讀取環境變數的方式
        const token = $os.env("HF_TOKEN"); 

        // 3. 呼叫 Hugging Face Inference API
        const response = $http.send({
            url: "https://api-inference.huggingface.co/models/facebook/mms-tts-zho",
            method: "POST",
            body: JSON.stringify({ inputs: text }),
            headers: { 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (response.statusCode !== 200) {
            return c.json(response.statusCode, { error: "HF API Error" });
        }

        // 4. 直接回傳音訊二進制流給前端
        return c.blob(200, "audio/mpeg", response.raw);

    } catch (e) {
        return c.json(500, { error: e.message });
    }
});