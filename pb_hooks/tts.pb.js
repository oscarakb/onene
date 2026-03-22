// pb_hooks/tts.pb.js

routerAdd("POST", "/api/praise-tts", (e) => {
    try {
        // 1. 取得前端傳來的文字
        const info = $apis.requestInfo(e);
        const data = info.data || info.body || {};
        const text = data.text;

        if (!text) {
            return e.json(400, { error: "Missing text" });
        }

        // 2. 將中文轉換為網址安全格式
        const urlText = encodeURIComponent(text);

        // 3. 呼叫 Google 隱藏版語音 API (免費、免金鑰、秒發音)
        // 參數 tl=zh-TW 代表台灣繁體中文，client=tw-ob 是繞過驗證的關鍵
        const response = $http.send({
            url: "https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-TW&client=tw-ob&q=" + urlText,
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        if (response.statusCode !== 200) {
            console.log("⚠️ Google TTS 連線失敗: " + response.statusCode);
            return e.json(response.statusCode, { error: "Google API Error" });
        }

        // 4. 成功！回傳 MP3 音訊給前端
        return e.blob(200, "audio/mpeg", response.raw);

    } catch (err) {
        console.error("❌ TTS 腳本發生崩潰: ", err);
        return e.json(500, { error: err.message });
    }
});