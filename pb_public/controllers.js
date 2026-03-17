// ==========================================
// 1. Base Controller (基礎控制器)
// ==========================================
class BaseCardController {
    constructor(el, data, onCloseCallback) { this.el = el; this.data = data; this.onCloseCallback = onCloseCallback; this.isActive = false; this.maxHeight = 0; }
    syncHeight() { 
        requestAnimationFrame(() => { 
            if (this.el.classList.contains('fullscreen-mode')) {
                this.el.style.minHeight = ''; 
                return;
            }
            const currentScroll = window.scrollY; 
            
            this.el.style.minHeight = '0px'; 
            const currentContentHeight = this.el.scrollHeight; 
            if (currentContentHeight > this.maxHeight) { this.maxHeight = currentContentHeight; } 
            this.el.style.minHeight = this.maxHeight + 'px'; 
            
            window.scrollTo(0, currentScroll); 
        }); 
    }

    applyFullscreenSetting() {
        if (localStorage.getItem('oneneFullscreenDefault') === 'true' && !this.el.classList.contains('fullscreen-mode')) {
            this.el.classList.add('fullscreen-mode');
        }
    }
    
    getSharedUI() {
        const isFS = this.el.classList.contains('fullscreen-mode');
        return `<div data-action="toggle-fullscreen" class="action-fullscreen"><span class="material-symbols-rounded pointer-none">${isFS ? 'fullscreen_exit' : 'fullscreen'}</span></div>`;
    }

    destroy() {}
    resetDOM() {
        this.destroy(); 
        this.el.className = `card ${this.data.type || 'rect'} ${this.data.color} ${this.data.variant}`; 
        this.el.style.minHeight = ''; this.maxHeight = 0;
        this.el.innerHTML = `<div class="breathing-overlay"></div><span class="material-symbols-rounded card-icon">${this.data.icon}</span><div class="card-text-group"><div class="font-bold">${this.data.title}</div>${this.data.subtitle ? `<div class="text-xs mt-5 opacity-80">${this.data.subtitle}</div>` : ''}</div>`;
        this.isActive = false; 
        if (typeof this.onCloseCallback === 'function') { this.onCloseCallback(this.data.id); }
    }
    handleAction(action, target) { 
        if (action === 'close-card') { 
            this.el.classList.remove('fullscreen-mode'); 
            this.resetDOM(); 
        }
        if (action === 'toggle-fullscreen') {
            const isEnteringFullscreen = !this.el.classList.contains('fullscreen-mode');
            this.el.classList.toggle('fullscreen-mode');
            const icon = target.querySelector('.material-symbols-rounded');
            if (icon) { icon.innerText = this.el.classList.contains('fullscreen-mode') ? 'fullscreen_exit' : 'fullscreen'; }
            
            if (!isEnteringFullscreen) {
                this.maxHeight = 0;
                setTimeout(() => {
                    this.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
            }
            this.syncHeight();
        }
    }
}

// ==========================================
// 2. Feature Controllers (功能控制器)
// ==========================================
class OrbController extends BaseCardController {
    constructor(el, data, onClose) { super(el, data, onClose); this.charge = 0; this.chargeTimer = null; this.startHandler = this.startCharge.bind(this); this.endHandler = this.endCharge.bind(this); }
    start() { if(this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.charge = 0; this.el.classList.add('pop-active'); this.render(); }
    render() {
        this.el.innerHTML = this.getSharedUI() + `
            <div class="card-body">
                <div class="orb-wrapper"><div class="orb-element" id="target-orb-${this.data.id}"></div></div>
                <div class="orb-title text-2xl font-bold mb-10 mt-10">0%</div>
                <div class="text-sm opacity-90 orb-hint">長按上方能量球充能</div>
            </div>
            <div data-action="close-card" class="action-close">✕ 結束練習</div>
        `;
        this.syncHeight(); this.bindOrbEvents();
    }
    bindOrbEvents() { const orb = this.el.querySelector(`#target-orb-${this.data.id}`); if (!orb) return; orb.addEventListener('mousedown', this.startHandler); orb.addEventListener('touchstart', this.startHandler, { passive: false }); window.addEventListener('mouseup', this.endHandler); window.addEventListener('touchend', this.endHandler); }
    destroy() { this.endCharge(); const orb = this.el.querySelector(`#target-orb-${this.data.id}`); if (orb) { orb.removeEventListener('mousedown', this.startHandler); orb.removeEventListener('touchstart', this.startHandler); } window.removeEventListener('mouseup', this.endHandler); window.removeEventListener('touchend', this.endHandler); }
    startCharge(e) {
        e.preventDefault(); e.stopPropagation(); if(this.charge >= 100) return;
        const title = this.el.querySelector('.orb-title'); const orb = this.el.querySelector(`#target-orb-${this.data.id}`); const hint = this.el.querySelector('.orb-hint'); 
        if (this.chargeTimer) clearTimeout(this.chargeTimer);
        const tick = () => {
            if (this.charge < 100) { 
                this.charge++; title.innerText = `${this.charge}%`; orb.style.transform = `scale(${1 + this.charge/50})`; 
                if (hint) {
                    if (this.charge >= 90) hint.innerText = "最後一刻，全然釋放！"; else if (this.charge >= 75) hint.innerText = "能量即將滿溢，堅持住！"; else if (this.charge >= 60) hint.innerText = "充滿力量，蓄勢待發..."; else if (this.charge >= 45) hint.innerText = "溫暖的光芒逐漸擴大..."; else if (this.charge >= 30) hint.innerText = "感受心跳與呼吸的共鳴..."; else if (this.charge >= 15) hint.innerText = "專注力正在提升..."; else if (this.charge > 0) hint.innerText = "正在喚醒能量...";
                }
                if (this.charge % 10 === 0) { this.playTone(200 + this.charge * 2, 0.15, 0.15); } 
                const nextDelay = Math.max(30, 150 - (this.charge * 1.2)); this.chargeTimer = setTimeout(tick, nextDelay);
            } else { this.endCharge(); this.showComplete(); }
        };
        this.chargeTimer = setTimeout(tick, 150);
    }
    endCharge() { if (this.chargeTimer) { clearTimeout(this.chargeTimer); this.chargeTimer = null; } const hint = this.el.querySelector('.orb-hint'); if (hint && this.charge < 100) { hint.innerText = "長按上方能量球充能"; } }
    showComplete() { this.destroy(); this.el.innerHTML = this.getSharedUI() + `<div class="card-body-result"><span class="material-symbols-rounded icon-xl">check_circle</span><div class="text-xl mt-15">充能完畢</div><p class="text-sm opacity-80 mt-10">帶著這份動力出發吧！</p></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`; this.syncHeight(); triggerStarReward(); }
    playTone(freq, dur, vol) {} 
}

class MindCleanController extends BaseCardController {
    constructor(el, data, onClose) { super(el, data, onClose); this.step = 1; }
    start() { if(this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.step = 1; this.el.classList.add('pop-active'); this.render(); }
    handleAction(action, target) { super.handleAction(action, target); if (action === 'next-step') { this.triggerRitual(target, () => { this.step++; this.render(); }); } if (action === 'finish-clean') { this.triggerRitual(target, () => { this.finish(); }); } }
    triggerRitual(btnEl, callback) {} 
    render() {
        let stepHTML = '';
        if(this.step === 1) stepHTML = `<div class="card-body"><span class="material-symbols-rounded icon-lg mb-10">delete_outline</span><div class="text-lg mt-15 mb-15">第一步：垃圾箱</div><p class="text-sm opacity-90 mb-25 line-height-lg">想一件今天的挫折或煩惱...<br>把它縮成一個小小的灰色氣泡。</p><div><div class="breathe-hint">✧ 配合按鈕光暈深呼吸，吐氣時點擊 ✧</div><div class="btn-breathe-wrapper"><div class="btn-halo"></div><button class="start-btn breathe-btn" data-action="next-step">點擊捏碎它</button></div></div></div>`;
        else if(this.step === 2) stepHTML = `<div class="card-body"><span class="material-symbols-rounded icon-lg mb-10">inventory_2</span><div class="text-lg mt-15 mb-15">第二步：存儲箱</div><p class="text-sm opacity-90 mb-25 line-height-lg">還有什麼明天要擔心的？<br>把它放進箱子鎖好，明天再說。</p><div><div class="breathe-hint">✧ 再一次深吸氣，吐氣時點擊 ✧</div><div class="btn-breathe-wrapper"><div class="btn-halo"></div><button class="start-btn breathe-btn" data-action="next-step">封存焦慮</button></div></div></div>`;
        else if(this.step === 3) stepHTML = `<div class="card-body"><span class="material-symbols-rounded icon-lg mb-10">redeem</span><div class="text-lg mt-15 mb-15">最後：收穫箱</div><p class="text-sm opacity-90 mb-25 line-height-lg">回想今天做的一件小好事...<br>純粹感受那份微小的成就感。</p><div><div class="breathe-hint">✧ 感受平靜的擴張，微笑著點擊 ✧</div><div class="btn-breathe-wrapper"><div class="btn-halo"></div><button class="start-btn breathe-btn" data-action="finish-clean">存入能量</button></div></div></div>`;
        this.el.innerHTML = this.getSharedUI() + stepHTML + `<div data-action="close-card" class="action-close">✕ 結束練習</div>`; 
        this.syncHeight();
    }
    finish() { this.el.innerHTML = this.getSharedUI() + `<div class="card-body-result"><span class="material-symbols-rounded icon-xl">check_circle</span><div class="text-xl mt-15">清理完成</div><p class="text-sm opacity-80 mt-10">帶著輕盈的頻率，好好休息吧。</p></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`; this.syncHeight(); triggerStarReward(); }
}

class AnswerBookController extends BaseCardController {
    start() { if(this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.el.classList.add('pop-active'); this.renderPrompt(); }
    handleAction(action, target) { super.handleAction(action, target); if (action === 'reveal-answer-ritual') { this.showRitual(); } if (action === 'restart-answer') { this.renderPrompt(); } }
    renderPrompt() { this.el.innerHTML = this.getSharedUI() + `<div class="card-body-result"><div class="text-lg tracking-wide mb-10">默念問題 3 次</div><div data-action="reveal-answer-ritual" class="cursor-pointer"><span class="material-symbols-rounded icon-xxl pointer-none">menu_book</span><div class="text-xs opacity-80 pointer-none mt-10">點擊書本獲得答案</div></div></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`; this.syncHeight(); }
    showRitual() { this.el.innerHTML = this.getSharedUI() + `<div class="card-body-result"><div class="text-lg tracking-wider opacity-90 font-normal">翻閱命運中...</div><div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div></div>`; this.syncHeight(); setTimeout(() => this.reveal(), 1800); }
    reveal() { const answer = ANSWERS_LIBRARY[Math.floor(Math.random() * ANSWERS_LIBRARY.length)]; this.el.innerHTML = this.getSharedUI() + `<div class="card-body-result"><div class="text-sm opacity-70 tracking-wide mb-5">解答</div><div class="text-xl mb-25 line-height-lg">「 ${answer} 」</div><div data-action="restart-answer" class="btn-outline">↻ 再算一次</div></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`; this.syncHeight(); triggerStarReward(); }
}

class MoodController extends BaseCardController {
    start() { if(this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.el.classList.add('pop-active'); this.renderMoodSelection(); }
    handleAction(action, target) { super.handleAction(action, target); if (action === 'select-mood') { this.showAdvice(target.dataset.mood); } if (action === 'toggle-check' && event.target.tagName !== 'INPUT') { this.toggleCheck(target); } }
    renderMoodSelection() { this.el.innerHTML = this.getSharedUI() + `<div class="card-body"><div class="text-lg tracking-wide mb-20">你現在是哪種情緒</div><div class="mood-btn-container">${Object.keys(MOOD_CONFIG).map(m => `<div class="mood-btn" data-action="select-mood" data-mood="${m}">${m}</div>`).join('')}</div></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`; this.syncHeight(); }
    showAdvice(mood) { const config = MOOD_CONFIG[mood]; this.el.innerHTML = this.getSharedUI() + `<div style="display: flex; flex-direction: column; padding: 40px 24px 30px 24px; animation: fadeIn 0.5s ease; flex: 1; width: 100%;"><div class="text-xs opacity-80 text-center mb-5 text-white">目前情緒：${mood}</div><div class="text-md text-white font-bold text-center mb-15">請完成以下急救導引：</div><div class="guide-list">${config.guides.map(g => `<div class="guide-item" data-action="toggle-check"><input type="checkbox"><label>${g}</label></div>`).join('')}</div></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`; this.syncHeight(); }
    toggleCheck(itemEl) {
        const cb = itemEl.querySelector('input'); cb.checked = !cb.checked; cb.checked ? itemEl.classList.add('checked') : itemEl.classList.remove('checked');
        if(Array.from(this.el.querySelectorAll('input')).every(c => c.checked)) {
            setTimeout(() => { this.el.classList.remove('pop-active'); this.el.classList.add('balanced-state'); this.el.innerHTML = `<div class="card-body-result"><div style="animation: fadeIn 0.8s ease;" class="text-xl tracking-wider text-white">我值得變得更好</div></div><div class="action-close" data-action="close-card">✕ 結束練習</div>`; this.syncHeight(); triggerStarReward(); }, 300);
        }
    }
}

class BreathController extends BaseCardController {
    constructor(el, data, onClose) { super(el, data, onClose); this.timer = null; this.isRunning = false; this.totalRounds = 0; this.rewardGiven = false; }
    start() { if (this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.el.classList.add('breath-active'); this.renderStartScreen(); }
    destroy() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.isRunning = false; this.rewardGiven = false; }
    handleAction(action, target) { super.handleAction(action, target); if (action === 'run-breath-animation') { this.runAnimation(); } }
    renderStartScreen() { 
        this.maxHeight = 350; 
        this.el.innerHTML = this.getSharedUI() + `
            <div class="breathing-overlay"></div>
            <div class="breath-content-wrap" style="display: flex; flex-direction: column; flex: 1; width: 100%; z-index: 2;">
                <div class="card-body text-white">
                    <div class="text-lg mb-10">444 減壓呼吸練習</div>
                    <div class="text-sm opacity-90 mb-20">跟隨節奏，釋放全身壓力</div>
                    <div class="start-btn" data-action="run-breath-animation">開始練習</div>
                </div>
            </div>
            <div class="action-close" data-action="close-card" style="z-index: 2;">✕ 結束練習</div>
        `; 
        this.syncHeight(); 
    }
    runAnimation() {
        if(this.isRunning) return; this.isRunning = true; this.totalRounds = 0; this.rewardGiven = false;
        const wrap = this.el.querySelector('.breath-content-wrap');
        if(wrap) { wrap.innerHTML = `<div style="padding: 40px 20px 30px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; width: 100%;" class="text-white"><div class="text-lg font-bold mb-5 title">準備開始...</div><div class="text-sm opacity-90 subtitle">請調整坐姿</div><div class="breath-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><div class="meditation-guide" id="meditation-text">...</div></div>`; }
        this.titleEl = this.el.querySelector('.title'); this.subtitleEl = this.el.querySelector('.subtitle'); this.dots = this.el.querySelectorAll('.dot'); this.guideEl = document.getElementById('meditation-text');
        this.seq = [{t:"吸氣...", s:"深深吸飽 4 秒", exp:true}, {t:"憋氣...", s:"停留 4 秒", exp:true}, {t:"吐氣...", s:"慢慢吐出 4 秒", exp:false}]; this.step = 0; this.dotIndex = 0;
        setTimeout(() => { this.runCycle(); this.timer = setInterval(() => this.runCycle(), 4000); }, 50);
    }
    runCycle() {
        const current = this.seq[this.step]; if(this.titleEl) this.titleEl.innerText = current.t; if(this.subtitleEl) this.subtitleEl.innerText = current.s;
        current.exp ? this.el.classList.add('is-expanding') : this.el.classList.remove('is-expanding');
        if (this.step === 0) this.updateGuide();
        if (this.step === 2) {
            this.dots[this.dotIndex].classList.add('active'); this.dotIndex++;
            if (this.dotIndex === this.dots.length) { setTimeout(() => { this.dots.forEach(d => d.classList.remove('active')); this.dotIndex = 0; }, 3800); }
            this.totalRounds++;
        }
        this.step = (this.step + 1) % this.seq.length;
    }
    updateGuide() {
        if (!this.guideEl) return;
        if (this.totalRounds >= 12) { this.guideEl.innerText = "能量已充盈，請持續感受這份平靜"; this.guideEl.style.color = "rgba(255,255,255,1)"; this.guideEl.style.fontWeight = "700"; if (!this.rewardGiven) { triggerStarReward(); this.rewardGiven = true; } } 
        else { const guideText = MEDITATION_GUIDES[this.totalRounds % MEDITATION_GUIDES.length]; this.guideEl.style.opacity = '0'; setTimeout(() => { this.guideEl.innerText = guideText; this.guideEl.style.opacity = '0.8'; }, 300); }
    }
}

class EyeTrackerController extends BaseCardController {
    constructor(el, data, onClose) { 
        super(el, data, onClose); 
        this.animationFrame = null; 
        this.startTime = 0; 
        this.duration = 60000; 
        this.currentMode = 'figure8'; 
        this.isRunning = false;

        this.modeIcons = {
            'figure8': 'all_inclusive', 'z_axis': 'zoom_out_map', 'horizontal': 'sync_alt', 'spiral': 'cyclone', 'saccadic': 'scatter_plot'
        };

        this.bgConfigs = [
            { id: 'default', name: '預設', menuBg: 'rgba(0,0,0,0.1)', cardBg: '', shadow: 'none' },
            { id: 'green', name: '森林綠', menuBg: '#2A3B32', cardBg: '#2A3B32', shadow: 'inset 0 4px 15px rgba(0,0,0,0.3)' },
            { id: 'gray', name: '石板灰', menuBg: '#2C3539', cardBg: '#2C3539', shadow: 'inset 0 4px 15px rgba(0,0,0,0.3)' }
        ];
        this.currentBgIndex = 0; 
    }
    
    start() { if(this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.el.classList.add('pop-active'); this.renderMenu(); }
    
    handleAction(action, target) { 
        super.handleAction(action, target); 
        
        if (action === 'set-eye-mode') {
            this.currentMode = target.dataset.mode;
            this.el.querySelectorAll('[data-action="set-eye-mode"]').forEach(btn => {
                if(btn === target) { btn.style.background = 'rgba(255,255,255,0.4)'; btn.style.fontWeight = '700'; } 
                else { btn.style.background = 'rgba(255,255,255,0.15)'; btn.style.fontWeight = 'normal'; }
            });
            const previewIcon = this.el.querySelector('#preview-icon');
            if (previewIcon) previewIcon.innerText = this.modeIcons[this.currentMode];
        }

        if (action === 'toggle-eye-bg') {
            this.currentBgIndex = (this.currentBgIndex + 1) % this.bgConfigs.length;
            const bg = this.bgConfigs[this.currentBgIndex];
            
            const area = this.el.querySelector('.tracker-area');
            if (area) { area.style.background = bg.menuBg; area.style.boxShadow = bg.shadow; }
            const label = this.el.querySelector('#bg-name-label');
            if (label) label.innerText = bg.name;
        }

        if (action === 'start-tracking') { this.startPractice(); } 
        if (action === 'return-to-menu') { this.stopAnimation(); this.renderMenu(); }
        if (action === 'restart-tracking') { this.stopAnimation(); this.startPractice(); }
    }
    
    renderMenu() {
        this.stopAnimation(); 
        this.el.style.transition = 'background 0.5s ease';
        this.el.style.background = ''; 

        const bg = this.bgConfigs[this.currentBgIndex];

        this.el.innerHTML = this.getSharedUI() + `
            <div class="card-body" style="flex: 1; display: flex; flex-direction: column; width: 100%; padding: 40px 20px 20px;">
                <div id="mode-selector" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 20px;">
                    <button data-action="set-eye-mode" data-mode="figure8" class="mood-btn" style="${this.currentMode === 'figure8' ? 'background: rgba(255,255,255,0.4); font-weight: 700;' : ''}">∞ 8字</button>
                    <button data-action="set-eye-mode" data-mode="z_axis" class="mood-btn" style="${this.currentMode === 'z_axis' ? 'background: rgba(255,255,255,0.4); font-weight: 700;' : ''}">⤢ 遠近</button>
                    <button data-action="set-eye-mode" data-mode="horizontal" class="mood-btn" style="${this.currentMode === 'horizontal' ? 'background: rgba(255,255,255,0.4); font-weight: 700;' : ''}">↔ 鐘擺</button>
                    <button data-action="set-eye-mode" data-mode="spiral" class="mood-btn" style="${this.currentMode === 'spiral' ? 'background: rgba(255,255,255,0.4); font-weight: 700;' : ''}">◎ 螺旋</button>
                    <button data-action="set-eye-mode" data-mode="saccadic" class="mood-btn" style="${this.currentMode === 'saccadic' ? 'background: rgba(255,255,255,0.4); font-weight: 700;' : ''}">⛶ 跳視</button>
                </div>
                <div class="tracker-area" style="flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; position: relative; background: ${bg.menuBg}; box-shadow: ${bg.shadow}; border-radius: 16px; min-height: 250px; transition: all 0.4s ease;">
                    <div data-action="toggle-eye-bg" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 5px 12px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px); z-index: 10; color: #fff; transition: background 0.2s;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">palette</span>
                        <span id="bg-name-label">${bg.name}</span>
                    </div>
                    <span id="preview-icon" class="material-symbols-rounded text-white" style="font-size: 100px; opacity: 0.2; transition: all 0.3s; pointer-events: none;">
                        ${this.modeIcons[this.currentMode]}
                    </span>
                </div>
                <div id="start-btn-container" style="margin-top: 20px;">
                    <div class="start-btn" data-action="start-tracking">開始練習 (60秒)</div>
                </div>
            </div>
            <div data-action="close-card" class="action-close">✕ 結束練習</div>
        `;
        this.syncHeight();
    }
    
    startPractice() {
        const bg = this.bgConfigs[this.currentBgIndex]; 
        this.el.style.transition = 'background 0.5s ease';
        if (bg.cardBg) { this.el.style.background = bg.cardBg; }

        this.el.innerHTML = this.getSharedUI() + `
            <div class="card-body" style="flex: 1; display: flex; flex-direction: column; width: 100%; padding: 40px 20px 20px;">
                <div class="tracker-area" style="flex: 1; width: 100%; position: relative; background: transparent; min-height: 250px; overflow: hidden; margin-bottom: 20px;">
                    <div id="eye-timer" class="text-sm text-white font-bold tracking-wide" style="position: absolute; top: 15px; left: 0; width: 100%; text-align: center; opacity: 0.8; z-index: 10;"></div>
                    <div class="tracking-dot" style="position: absolute; width: 24px; height: 24px; background: #fff; border-radius: 50%; box-shadow: 0 0 15px rgba(255,255,255,0.9); z-index: 5; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-outline" data-action="return-to-menu">返回選單</button>
                    <button class="btn-outline" data-action="restart-tracking" style="background: rgba(255,255,255,0.2);">重新開始</button>
                </div>
            </div>
            <div data-action="close-card" class="action-close">✕ 結束練習</div>
        `;
        this.syncHeight();
        this.isRunning = true; this.startTime = Date.now(); this.animateDot();
    }
    
    animateDot() {
        const dot = this.el.querySelector('.tracking-dot');
        const timerEl = this.el.querySelector('#eye-timer');
        const area = this.el.querySelector('.tracker-area');
        if (!dot || !area) return;

        let lastJumpTime = 0; let saccadicPos = { x: 0, y: 0 };

        const animate = () => {
            const now = Date.now(); const elapsed = now - this.startTime;
            const remaining = Math.max(0, Math.ceil((this.duration - elapsed) / 1000));

            if (timerEl) timerEl.innerText = `放鬆眼部肌肉... 剩餘 ${remaining} 秒`;

            if (elapsed >= this.duration) { this.finishTracking(); return; }

            const margin = 30; const w = (area.clientWidth / 2) - margin; const h = (area.clientHeight / 2) - margin; const maxR = Math.min(w, h); 
            let x = 0, y = 0, scale = 1; const t = elapsed / 1000; 

            switch(this.currentMode) {
                case 'figure8': 
                    const f8_omega = (2 * Math.PI) / 10; x = w * Math.sin(f8_omega * t); y = h * Math.sin(2 * f8_omega * t) * 0.45; break;
                case 'z_axis': 
                    const cycle = t % 10; let zoomProgress = 0;
                    if (cycle < 1.5) zoomProgress = 0; 
                    else if (cycle < 4.5) zoomProgress = (cycle - 1.5) / 3; 
                    else if (cycle < 6.5) zoomProgress = 1; 
                    else if (cycle < 9.5) zoomProgress = 1 - ((cycle - 6.5) / 3); 
                    else zoomProgress = 0; 
                    const easeZoom = zoomProgress < 0.5 ? 2 * zoomProgress * zoomProgress : 1 - Math.pow(-2 * zoomProgress + 2, 2) / 2;
                    scale = 1 + (2.5 * easeZoom); break;
                case 'horizontal': 
                    const h_omega = (2 * Math.PI) / 4.5; x = w * Math.sin(h_omega * t); break;
                case 'spiral': 
                    const R_phase = (1 - Math.cos((2 * Math.PI * t) / 16)) / 2; const R = maxR * (0.1 + 0.9 * R_phase); 
                    const s_omega = (2 * Math.PI) / 4; x = R * Math.cos(s_omega * t); y = R * Math.sin(s_omega * t); break;
                case 'saccadic': 
                    if (now - lastJumpTime > 1200) { 
                        lastJumpTime = now; x = (Math.random() * 2 - 1) * w; y = (Math.random() * 2 - 1) * h; saccadicPos = { x, y };
                    }
                    x = saccadicPos.x; y = saccadicPos.y; break;
            }
            dot.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
            this.animationFrame = requestAnimationFrame(animate);
        };
        this.animationFrame = requestAnimationFrame(animate);
    }
    
    stopAnimation() {
        this.isRunning = false;
        if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }
    }

    finishTracking() {
        this.stopAnimation(); this.el.style.background = ''; 
        this.el.innerHTML = this.getSharedUI() + `
            <div class="card-body-result">
                <span class="material-symbols-rounded icon-xl">check_circle</span>
                <div class="text-xl mt-15 font-bold">放鬆完成</div>
                <p class="text-sm opacity-80 mt-10 line-height-lg">眼睛辛苦了<br>記得多眨眼保持濕潤喔！</p>
                <div style="margin-top: 25px;"><button class="btn-outline" data-action="return-to-menu">返回選單</button></div>
            </div>
            <div data-action="close-card" class="action-close">✕ 結束練習</div>
        `;
        this.syncHeight(); triggerStarReward();
    }
    
    destroy() { this.stopAnimation(); this.el.style.background = ''; }
}

class BubbleController extends BaseCardController {
    constructor(el, data, onClose) { super(el, data, onClose); this.poppedCount = 0; }
    start() { if(this.isActive) return; this.isActive = true; this.applyFullscreenSetting(); this.el.classList.add('pop-active'); this.renderGrid(); }
    handleAction(action, target) { super.handleAction(action, target); if (action === 'pop-single-bubble') { this.pop(target); } if (action === 'refresh-bubbles') { this.renderGrid(); } }
    renderGrid() {
        this.poppedCount = 0; let gridHTML = ''; for(let i=0; i<25; i++) gridHTML += `<div class="bubble" data-action="pop-single-bubble"></div>`;
        this.el.innerHTML = this.getSharedUI() + `<div style="animation: fadeIn 0.5s ease; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;"><div data-action="refresh-bubbles" style="height:60px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1rem; font-weight:700; cursor:pointer; width:100%; z-index: 2;"><span>↻ 再來一張</span></div><div class="bubble-grid">${gridHTML}</div></div><div data-action="close-card" class="action-close">✕ 結束練習</div>`;
        this.syncHeight();
    }
    pop(bubbleEl) {} 
}

// ==========================================
// 3. Controller Prototype Extensions (擴展硬體功能)
// ==========================================
const originalPlayTone = OrbController.prototype.playTone;
OrbController.prototype.playTone = function(freq, dur, vol) {
    if (localStorage.getItem('oneneSoundEnabled') === 'false') return;
    const ctx = getAudioCtx(); if(!ctx) return; 
    const osc = ctx.createOscillator(); const g = ctx.createGain(); 
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime); 
    g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur); 
    osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur); 
};

BubbleController.prototype.pop = function(bubbleEl) {
    if(bubbleEl.classList.contains('is-popped')) return;
    const ctx = getAudioCtx();
    if(ctx && localStorage.getItem('oneneSoundEnabled') !== 'false') { 
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); 
        osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1); 
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); 
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); 
    }
    if (localStorage.getItem('oneneVibrationEnabled') !== 'false' && "vibrate" in navigator) { navigator.vibrate(15); }
    bubbleEl.classList.add('is-popped'); this.poppedCount++; 
    if (this.poppedCount === 25) { triggerStarReward(); }
};

MindCleanController.prototype.triggerRitual = function(btnEl, callback) {
    btnEl.classList.add('ritual-animating'); 
    const halo = btnEl.previousElementSibling; 
    if (halo && halo.classList.contains('btn-halo')) { halo.style.display = 'none'; }
    const ctx = getAudioCtx(); 
    if(ctx && localStorage.getItem('oneneSoundEnabled') !== 'false') { 
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); 
        osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
        gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); 
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.2); 
    }
    if (localStorage.getItem('oneneVibrationEnabled') !== 'false' && "vibrate" in navigator) { navigator.vibrate([30, 50, 30]); }
    setTimeout(() => { callback(); }, 800);
};