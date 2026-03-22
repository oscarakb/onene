// pb_hooks/tts.pb.js

routerAdd("POST", "/api/praise-tts", (e) => {
    try {
        // 1. 安全解析前端傳送的文字 (兼容 PB v0.22 寫法)
        const info = $apis.requestInfo(e);
        const data = info.data || info.body || {};
        const text = data.text;

        if (!text) {
            console.log("⚠️ 錯誤: 前端沒有傳送 text 參數");
            return e.json(400, { error: "Missing text" });
        }

        // 2. 讀取 Railway 環境變數 (修正為 process.env)
        const token = process.env.HF_TOKEN;
        
        if (!token) {
            console.log("⚠️ 錯誤: Railway 沒有抓到 HF_TOKEN 環境變數！");
            return e.json(500, { error: "Missing HF_TOKEN" });
        }

        // 3. 呼叫 Hugging Face Inference API
        const response = $http.send({
            url: "https://router.huggingface.co/hf-inference/models/facebook/mms-tts-zho",
            method: "POST",
            body: JSON.stringify({ inputs: text }),
            headers: { 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        // 如果 Hugging Face 回傳錯誤 (例如正在冷啟動 503)
        if (response.statusCode !== 200) {
            console.log("⚠️ Hugging Face 拒絕連線，狀態碼: " + response.statusCode);
            return e.json(response.statusCode, { error: "HF API Error" });
        }

        // 4. 成功！將語音檔案回傳給前端
        return e.blob(200, "audio/mpeg", response.raw);

    } catch (err) {
        // 把具體崩潰原因印在 Railway 後台，方便追蹤
        console.error("❌ TTS 腳本發生崩潰: ", err);
        return e.json(500, { error: err.message });
    }
});