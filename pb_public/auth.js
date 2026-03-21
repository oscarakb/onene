// ==========================================
// 暱稱生成器 (唯一來源雜湊法)：信箱 -> 2碼英文 + 3碼數字
// 排除 I, O, 4, 敏感詞庫, 不以0開頭, 不連號
// ==========================================
function generatePseudoUniqueId(email) {
    const seed = email || Math.random().toString();

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
    }
    hash = Math.abs(hash);

    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; 
    const char1 = letters.charAt(hash % 24);
    const char2 = letters.charAt(Math.floor(hash / 24) % 24);

    let num = (hash % 900) + 100;
    let numStr = num.toString();

    const reservedPool = [
        "110", "112", "113", "119", "165", "911", 
        "978", "250", "500", "502", "503", "520"
    ]; 
    
    let attempt = 0;
    while (true) {
        let isValid = true;

        if (numStr.includes('4')) isValid = false;
        else if (reservedPool.includes(numStr)) isValid = false;
        else if (numStr[0] === numStr[1] && numStr[1] === numStr[2]) isValid = false;
        else if ("0123456789".includes(numStr) || "9876543210".includes(numStr)) isValid = false;

        if (isValid) break; 

        attempt++;
        hash += (17 + attempt); 
        num = (hash % 900) + 100;
        numStr = num.toString();
    }

    return char1 + char2 + numStr;
}

// ==========================================
// 會員系統與統計模組
// ==========================================
const statsCache = {}; 

function initAuth() {
    const viewStatsBtn = document.getElementById('view-stats-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    let currentReportDate = new Date();

    async function loadMonthlyStats(targetDate) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const cacheKey = `${year}-${month}`; 

        const chartContainer = document.getElementById('stats-chart-container');
        const totalCountEl = document.getElementById('stats-total-count');
        const monthLabel = document.getElementById('stats-current-month');
        const nextBtn = document.getElementById('stats-next-month');
        
        monthLabel.innerText = `${year} 年 ${month} 月`;
        const now = new Date();
        if (year === now.getFullYear() && month === now.getMonth() + 1) {
            nextBtn.style.opacity = '0.2'; nextBtn.style.pointerEvents = 'none';
        } else {
            nextBtn.style.opacity = '1'; nextBtn.style.pointerEvents = 'auto';
        }

        if (statsCache[cacheKey]) {
            renderStatsUI(statsCache[cacheKey], year, month);
            return;
        }

        chartContainer.innerHTML = '<div class="txt-body tc-muted text-center" style="padding: 20px;">能量讀取中...</div>';
        totalCountEl.innerText = '0';

        try {
            const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().replace('T', ' ');
            const endDate = new Date(Date.UTC(year, month, 1)).toISOString().replace('T', ' ');

            const records = await pb.collection('practice_logs').getFullList({
                filter: `user = "${pb.authStore.model.id}" && created >= "${startDate}" && created < "${endDate}"`,
                fields: 'cardTitle,created', 
                requestKey: 'monthly-stats-fetch'
            });
            
            statsCache[cacheKey] = records;
            renderStatsUI(records, year, month);
        } catch (err) {
            if (err.isAbort) return;
            console.error("無法讀取統計資料", err);
            chartContainer.innerHTML = '<div class="txt-body tc-red text-center" style="padding: 20px;">目前無法連線到資料庫。</div>';
        }
    }

    function renderStatsUI(records, year, month) {
        const chartContainer = document.getElementById('stats-chart-container');
        const totalCountEl = document.getElementById('stats-total-count');
        const weeklyBlock = document.getElementById('weekly-stats-block');
        const weeklyCountEl = document.getElementById('stats-weekly-count');

        const now = new Date();
        if (year === now.getFullYear() && month === now.getMonth() + 1) {
            weeklyBlock.style.display = 'block';
            const today = new Date();
            const dayOfWeek = today.getDay() || 7; 
            today.setHours(0, 0, 0, 0);
            const thisMonday = new Date(today);
            thisMonday.setDate(today.getDate() - dayOfWeek + 1);
            weeklyCountEl.innerText = records.filter(r => new Date(r.created.replace(' ', 'T')) >= thisMonday).length;
        } else {
            weeklyBlock.style.display = 'none';
        }

        if (records.length === 0) {
            chartContainer.innerHTML = `<div class="txt-body tc-muted text-center" style="padding: 40px;">${month} 月份還沒有練習紀錄。</div>`;
            totalCountEl.innerText = '0';
            return;
        }

        const statsMap = {};
        records.forEach(record => {
            const title = record.cardTitle || '未知練習';
            statsMap[title] = (statsMap[title] || 0) + 1;
        });

        const rawStats = Object.keys(statsMap).map(title => ({
            cardTitle: title, count: statsMap[title]
        })).sort((a, b) => b.count - a.count);

        totalCountEl.innerText = records.length;
        const maxCount = rawStats[0].count;

        let chartHTML = '';
        rawStats.forEach(stat => {
            const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
            chartHTML += `
                <div class="mb-15">
                    <div class="d-flex justify-between align-center mb-5">
                        <div class="txt-body-lg tc-main">${stat.cardTitle}</div>
                        <div class="txt-h3 tc-purple">${stat.count} 次</div>
                    </div>
                    <div class="w-100" style="height: 10px; background: rgba(0,0,0,0.04); border-radius: 5px; overflow: hidden;">
                        <div style="height: 100%; width: 0; background: var(--onene-purple); border-radius: 5px; transition: width 0.6s ease-out;" class="stats-bar" data-width="${percentage}%"></div>
                    </div>
                </div>`;
        });
        chartContainer.innerHTML = chartHTML;
        setTimeout(() => { document.querySelectorAll('.stats-bar').forEach(bar => { bar.style.width = bar.dataset.width; }); }, 100);
    }

    if (viewStatsBtn) {
        viewStatsBtn.addEventListener('click', () => {
            if (!pb || !pb.authStore.isValid) {
                document.getElementById('tab-login').click(); 
                openModal('auth-modal');
                return;
            }
            openModal('stats-modal');
            currentReportDate = new Date(); 
            loadMonthlyStats(currentReportDate);
        });

        document.getElementById('stats-prev-month').addEventListener('click', () => {
            currentReportDate.setMonth(currentReportDate.getMonth() - 1);
            loadMonthlyStats(currentReportDate);
        });

        document.getElementById('stats-next-month').addEventListener('click', () => {
            const now = new Date();
            if (currentReportDate.getFullYear() === now.getFullYear() && currentReportDate.getMonth() === now.getMonth()) return;
            currentReportDate.setMonth(currentReportDate.getMonth() + 1);
            loadMonthlyStats(currentReportDate);
        });
    }

    function syncDataFromDB() {
        const user = pb.authStore.model;
        if (!user) return;

        if (user.theme && user.theme !== '') {
            localStorage.setItem('oneneSavedTheme', user.theme);
            localStorage.setItem('oneneSavedThemeIcon', user.themeIcon || 'palette');
            if (user.theme === 'default') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', user.theme);
            document.getElementById('current-theme-icon').innerText = user.themeIcon || 'palette';
        }

        if (user.starCount !== undefined && user.starCount !== null) {
            let dbCount = user.starCount;
            let localCount = parseInt(localStorage.getItem('oneneStarCount') || '0');
            
            if (dbCount !== localCount) {
                localStorage.setItem('oneneStarCount', dbCount);
                if (typeof stars !== 'undefined' && typeof addStar === 'function') {
                    stars.length = 0; 
                    for(let i = 0; i < dbCount; i++) {
                        addStar(false); 
                    }
                }
            }
        }

        if (user.soundEnabled !== undefined && user.soundEnabled !== null) {
            localStorage.setItem('oneneSoundEnabled', user.soundEnabled);
            document.getElementById('toggle-sound').checked = user.soundEnabled;
        }
        if (user.vibEnabled !== undefined && user.vibEnabled !== null) {
            localStorage.setItem('oneneVibrationEnabled', user.vibEnabled);
            document.getElementById('toggle-vibration').checked = user.vibEnabled;
        }
        if (user.fsDefault !== undefined && user.fsDefault !== null) {
            localStorage.setItem('oneneFullscreenDefault', user.fsDefault);
            document.getElementById('toggle-fullscreen-default').checked = user.fsDefault;
        }
    }

    // ==========================================
    // 修改密碼邏輯
    // ==========================================
    const btnOpenPasswordModal = document.getElementById('btn-open-password-modal');
    const passwordSubmitBtn = document.getElementById('password-submit-btn');

    if (btnOpenPasswordModal) {
        btnOpenPasswordModal.addEventListener('click', () => {
            // 打開視窗前，先清空之前輸入的內容與錯誤訊息
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('new-password-confirm').value = '';
            document.getElementById('password-error-msg').style.display = 'none';
            document.getElementById('password-success-msg').style.display = 'none';
            openModal('password-modal');
        });
    }

    if (passwordSubmitBtn) {
        passwordSubmitBtn.addEventListener('click', async () => {
            const oldPw = document.getElementById('old-password').value;
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('new-password-confirm').value;
            const errorMsg = document.getElementById('password-error-msg');
            const successMsg = document.getElementById('password-success-msg');

            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';

            // 基礎防呆檢查
            if (!oldPw || !newPw || !confirmPw) {
                errorMsg.innerText = '請填寫所有密碼欄位';
                errorMsg.style.display = 'block'; return;
            }
            if (newPw.length < 8) {
                errorMsg.innerText = '新密碼長度至少需要 8 碼';
                errorMsg.style.display = 'block'; return;
            }
            const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
            if (!passwordRegex.test(newPw)) {
                errorMsg.innerText = '新密碼需同時包含「英文」與「數字」';
                errorMsg.style.display = 'block'; return;
            }
            if (newPw !== confirmPw) {
                errorMsg.innerText = '兩次輸入的新密碼不一致';
                errorMsg.style.display = 'block'; return;
            }

            passwordSubmitBtn.innerText = '處理中...';
            passwordSubmitBtn.disabled = true;

            try {
                // 呼叫 PocketBase 的更新 API
                await pb.collection('users').update(pb.authStore.model.id, {
                    oldPassword: oldPw,
                    password: newPw,
                    passwordConfirm: confirmPw
                });
                
                // 顯示成功訊息，並在 1.5 秒後自動關閉視窗
                successMsg.innerText = '密碼修改成功！';
                successMsg.style.display = 'block';
                setTimeout(() => {
                    closeModal('password-modal');
                }, 1500);

            } catch (err) {
                errorMsg.innerText = '修改失敗，請確認「舊密碼」是否輸入正確。';
                
                // 貼心防呆：如果使用者是純 Google 登入 (沒有舊密碼)，PocketBase 會報錯
                if (err.status === 400 && err.data && err.data.data && err.data.data.oldPassword) {
                    errorMsg.innerText = '您是使用 Google 帳號快速登入，目前無法在此修改密碼喔。';
                }
                
                errorMsg.style.display = 'block';
            } finally {
                passwordSubmitBtn.innerText = '確認修改';
                passwordSubmitBtn.disabled = false;
            }
        });
    }

    function checkLoginStatus() {
        const changePasswordBtn = document.getElementById('btn-open-password-modal'); 
        const emailTextEl = document.getElementById('settings-user-email-text');
        const googleIconEl = document.getElementById('account-google-icon');
        const mailIconEl = document.getElementById('account-mail-icon');

        if (pb.authStore.isValid) {
            const user = pb.authStore.model;
            
            // 設定頁面：顯示帳號文字 (首頁的暱稱已經移除了)
            if (emailTextEl) {
                emailTextEl.innerText = user.email;
            }

            if(logoutBtn) logoutBtn.style.display = 'flex';
            
            // 判斷登入方式：切換對應的 Icon 與修改密碼按鈕
            const authMethod = localStorage.getItem('oneneAuthMethod');
            if (authMethod === 'google') {
                if(changePasswordBtn) changePasswordBtn.style.display = 'none';
                if(googleIconEl) googleIconEl.style.display = 'block'; // 顯示 Google 圖示
                if(mailIconEl) mailIconEl.style.display = 'none';
            } else {
                if(changePasswordBtn) changePasswordBtn.style.display = 'flex';
                if(googleIconEl) googleIconEl.style.display = 'none';
                if(mailIconEl) mailIconEl.style.display = 'block';     // 顯示信箱圖示
            }
            
            syncDataFromDB();
        } else {
            // 未登入狀態
            if (emailTextEl) emailTextEl.innerText = '尚未登入';
            if (googleIconEl) googleIconEl.style.display = 'none';
            if (mailIconEl) mailIconEl.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (changePasswordBtn) changePasswordBtn.style.display = 'none'; 
        }
    }

    let isLoginMode = true; 
    const authModal = document.getElementById('auth-modal');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const googleErrorMsg = document.getElementById('google-error-msg');
    const authTitle = document.getElementById('auth-modal-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const confirmGroup = document.getElementById('auth-confirm-group');
    const passwordConfirmInput = document.getElementById('auth-password-confirm');
    const errorMsg = document.getElementById('auth-error-msg');

    tabLogin.addEventListener('click', () => {
        isLoginMode = true;
        tabLogin.style.background = 'var(--onene-yellow)'; tabLogin.style.color = '#fff';
        tabRegister.style.background = 'rgba(0,0,0,0.05)'; tabRegister.style.color = 'var(--text-muted)';
        authTitle.innerText = '會員登入';
        authSubmitBtn.innerText = '確認登入';
        errorMsg.style.display = 'none';
        confirmGroup.style.display = 'none'; 
    });

    tabRegister.addEventListener('click', () => {
        isLoginMode = false;
        tabRegister.style.background = 'var(--onene-yellow)'; tabRegister.style.color = '#fff';
        tabLogin.style.background = 'rgba(0,0,0,0.05)'; tabLogin.style.color = 'var(--text-muted)';
        authTitle.innerText = '註冊新帳號';
        authSubmitBtn.innerText = '確認註冊';
        errorMsg.style.display = 'none';
        confirmGroup.style.display = 'block'; 
    });

    authSubmitBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value; 
        errorMsg.style.display = 'none';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !password) {
            errorMsg.innerText = '請填寫信箱與密碼';
            errorMsg.style.display = 'block'; return;
        }
        if (!emailRegex.test(email)) {
            errorMsg.innerText = '請檢查信箱是否包含 @ 與正確的網域';
            errorMsg.style.display = 'block'; return;
        }
        if (password.length < 8) {
            errorMsg.innerText = '密碼長度至少需要 8 碼';
            errorMsg.style.display = 'block'; return;
        }
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
        if (!passwordRegex.test(password)) {
            errorMsg.innerText = '密碼需同時包含「英文」與「數字」';
            errorMsg.style.display = 'block'; return;
        }
        if (!isLoginMode && password !== passwordConfirm) {
            errorMsg.innerText = '兩次輸入的密碼不一致，請重新確認一次';
            errorMsg.style.display = 'block'; return;
        }

        authSubmitBtn.innerText = '處理中...';
        authSubmitBtn.disabled = true;

        try {
            if (isLoginMode) {
                await pb.collection('users').authWithPassword(email, password);
                localStorage.setItem('oneneAuthMethod', 'email'); // 紀錄為信箱登入
                closeModal('auth-modal');
                checkLoginStatus();
            } else {
                // 順暢版註冊邏輯
                await pb.collection('users').create({
                    email: email,
                    password: password,
                    passwordConfirm: passwordConfirm, 
                    nickname: generatePseudoUniqueId(email),
                    theme: localStorage.getItem('oneneSavedTheme') || 'default',
                    themeIcon: localStorage.getItem('oneneSavedThemeIcon') || 'palette',
                    starCount: parseInt(localStorage.getItem('oneneStarCount') || '0'),
                    lastDate: new Date().toLocaleDateString(),
                    soundEnabled: document.getElementById('toggle-sound').checked,
                    vibEnabled: document.getElementById('toggle-vibration').checked,
                    fsDefault: document.getElementById('toggle-fullscreen-default').checked
                });
                
                await pb.collection('users').authWithPassword(email, password);
                localStorage.setItem('oneneAuthMethod', 'email'); // 紀錄為信箱登入
                closeModal('auth-modal');
                checkLoginStatus();
            }
        } catch (err) {
            errorMsg.innerText = isLoginMode 
                ? '登入失敗，請檢查信箱或密碼是否正確。' 
                : '註冊失敗，信箱可能已被使用，或格式不正確。';
            errorMsg.style.display = 'block';
        } finally {
            authSubmitBtn.innerText = isLoginMode ? '確認登入' : '確認註冊';
            authSubmitBtn.disabled = false;
        }
    });

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            if(googleErrorMsg) googleErrorMsg.style.display = 'none';
            if(errorMsg) errorMsg.style.display = 'none';
            
            try {
                const authData = await pb.collection('users').authWithOAuth2({ 
                    provider: 'google' 
                });
                
                if (!authData.record.nickname) {
                    const userEmail = authData.record.email || "google_user";
                    const newNickname = generatePseudoUniqueId(userEmail);
                    
                    await pb.collection('users').update(authData.record.id, {
                        nickname: newNickname
                    });
                    pb.authStore.model.nickname = newNickname; 
                }
                
                localStorage.setItem('oneneAuthMethod', 'google'); // 紀錄為 Google 登入
                checkLoginStatus();
                closeModal('auth-modal');
            } catch (err) {
                console.error("詳細錯誤內容：", err);
                if(googleErrorMsg) {
                    googleErrorMsg.innerText = '登入失敗。請稍後再試，或聯絡開發者確認後台設定。';
                    googleErrorMsg.style.display = 'block';
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            pb.authStore.clear(); 
            localStorage.removeItem('oneneStarCount');
            localStorage.removeItem('oneneSavedTheme');
            localStorage.removeItem('oneneSavedThemeIcon');
            localStorage.removeItem('oneneAuthMethod'); // 登出時順便清除登入方式紀錄
            window.location.reload(); 
        });
    }

    checkLoginStatus();
}