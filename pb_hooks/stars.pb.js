// 檔案位置：pb_hooks/stars.pb.js

// 1. 建立「新增星星」的專屬後端 API
routerAdd("POST", "/api/stars/add", (c) => {
    // 取得目前發出請求的登入使用者
    const user = c.get("authRecord"); 
    if (!user) throw new UnauthorizedError("請先登入");

    let currentStars = user.getInt("starCount");
    
    // 後端驗證：最多只能有 99 顆星
    if (currentStars < 99) {
        user.set("starCount", currentStars + 1);
        user.set("lastDate", new Date().toISOString().split('T')[0]); // 記錄當天日期
        $app.dao().saveRecord(user);
    }
    
    // 回傳最新的星星數量給前端
    return c.json(200, { "starCount": user.getInt("starCount") });
}, $apis.requireRecordAuth("users"));


// 2. 建立「清空星星」的專屬後端 API
routerAdd("POST", "/api/stars/clear", (c) => {
    const user = c.get("authRecord");
    if (!user) throw new UnauthorizedError("請先登入");

    user.set("starCount", 0);
    $app.dao().saveRecord(user);
    
    return c.json(200, { "message": "已清空", "starCount": 0 });
}, $apis.requireRecordAuth("users"));


// 3. 建立「每日衰減」的自動排程 (CRON Job)
// 設定為每天凌晨 00:00 自動執行
cronAdd("dailyDecay", "0 0 * * *", () => {
    // 找出資料庫中所有星星大於 0 的使用者
    const users = $app.dao().findRecordsByExpr("users", $dbx.exp("starCount > 0"));
    
    for (let user of users) {
        let currentStars = user.getInt("starCount");
        // 後端直接計算 70%
        let newCount = Math.floor(currentStars * 0.7); 
        
        user.set("starCount", newCount);
        $app.dao().saveRecord(user);
    }
});