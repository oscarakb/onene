// ==========================================
// 物理引擎與儲存模組 (physics.js)
// 負責處理星星掉落、碰撞、儲存以及彩蛋邏輯
// ==========================================

const MAX_STARS = 99; 
const INNER_PADDING = 15; 
let stars = []; 
let longPressTimer;
let brandClickCount = 0;
let brandClickTimer = null;

let canvas, ctx;

class Star {
    constructor(x, y, radius) {
        this.x = x; this.y = y; this.radius = radius; 
        this.vx = (Math.random() - 0.5) * 6; this.vy = 1;
        this.color = `hsl(${35 + Math.random() * 15}, 100%, ${65 + Math.random() * 15}%)`;
        this.isSleeping = false;
    }
    update(w, h, all) {
        if (this.isSleeping) return; 
        this.vx *= 0.98; this.vy += 0.35; this.x += this.vx; this.y += this.vy;
        
        const bottomLimit = h - INNER_PADDING;
        if (this.y + this.radius > bottomLimit) { 
            this.y = bottomLimit - this.radius; this.vy *= -0.15; this.vx *= 0.5; 
            if (Math.abs(this.vy) < 2.5 && Math.abs(this.vx) < 1.5) { 
                this.isSleeping = true; this.vy = 0; this.vx = 0; 
            } 
        }
        
        const rightLimit = w - INNER_PADDING; const leftLimit = INNER_PADDING;
        if (this.x + this.radius > rightLimit) { 
            this.x = rightLimit - this.radius; this.vx *= -0.2; 
        } else if (this.x - this.radius < leftLimit) { 
            this.x = leftLimit + this.radius; this.vx *= -0.2; 
        }
        
        for (let i = 0; i < all.length; i++) {
            const other = all[i]; if (other === this) continue;
            const dx = other.x - this.x; const dy = other.y - this.y; 
            const dist = Math.sqrt(dx*dx + dy*dy); const min = this.radius + other.radius + 0.4; 
            if (dist < min) {
                if (Math.abs(this.vx) + Math.abs(this.vy) > 3.5) other.isSleeping = false;
                this.isSleeping = false; this.vx *= 0.8; this.vy *= 0.8;
                const angle = Math.atan2(dy, dx); 
                const tx = this.x + Math.cos(angle) * min; const ty = this.y + Math.sin(angle) * min;
                const ax = (tx - other.x) * 0.3; const ay = (ty - other.y) * 0.3;
                this.vx -= ax; this.vy -= ay; other.vx += ax; other.vy += ay;
            }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.fillStyle = this.color; 
        ctx.shadowBlur = 8; ctx.shadowColor = this.color; ctx.beginPath();
        const startAngle = -Math.PI / 2;
        for (let i = 0; i < 5; i++) { 
            ctx.lineTo(Math.cos(startAngle + i * (Math.PI * 2 / 5)) * this.radius, Math.sin(startAngle + i * (Math.PI * 2 / 5)) * this.radius); 
            ctx.lineTo(Math.cos(startAngle + (i + 0.5) * (Math.PI * 2 / 5)) * (this.radius * 0.45), Math.sin(startAngle + (i + 0.5) * (Math.PI * 2 / 5)) * (this.radius * 0.45)); 
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
}

// 初始化 Canvas 與物理引擎
function initPhysicsEngine() {
    canvas = document.getElementById('physics-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    // 初始化大小並綁定 resize
    const resizeCanvas = () => { 
        const parent = canvas.parentElement; 
        const r = parent.getBoundingClientRect(); 
        canvas.width = r.width; canvas.height = r.height; 
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 開始動畫迴圈
    const animateStars = () => { 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        stars.forEach(s => { s.update(canvas.width, canvas.height, stars); s.draw(ctx); }); 
        requestAnimationFrame(animateStars); 
    };
    animateStars();
    
    // 倒入歷史星星
    pourStars();
}

async function triggerStarReward(cardId = 'unknown', cardTitle = '未命名練習') { 
    addStar(true); 
    if (typeof pb !== 'undefined' && pb.authStore.isValid) {
        try {
            const now = new Date();
            const cacheKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
            if (typeof statsCache !== 'undefined' && statsCache[cacheKey]) { 
                delete statsCache[cacheKey]; 
            }
            await pb.collection('practice_logs').create({
                user: pb.authStore.model.id,
                cardId: cardId,
                cardTitle: cardTitle
            });
        } catch (e) { console.log("練習紀錄同步失敗", e); }
    }
}

function checkDailyDecay() {
    const today = new Date().toLocaleDateString(); 
    const lastDate = localStorage.getItem('oneneLastDate'); 
    let savedCount = parseInt(localStorage.getItem('oneneStarCount') || '0');
    if (lastDate && lastDate !== today && savedCount > 0) { 
        savedCount = Math.floor(savedCount * 0.7); 
        localStorage.setItem('oneneStarCount', savedCount); 
    }
    localStorage.setItem('oneneLastDate', today); 
    return savedCount;
}

function pourStars() {
    const targetCount = checkDailyDecay(); 
    let currentPoured = 0;
    if (targetCount > 0) { 
        const interval = setInterval(() => { 
            if (currentPoured < targetCount) { addStar(false); currentPoured++; } 
            else { clearInterval(interval); } 
        }, 60); 
    }
}

async function addStar(save = true) {
    if (!canvas) return;
    if (stars.length < MAX_STARS) {
        const spawnWidth = canvas.width - (INNER_PADDING * 2) - 40; 
        const randomX = (canvas.width / 2) + (Math.random() - 0.5) * spawnWidth;
        stars.push(new Star(randomX, -20, 9)); 
        
        if (save) {
            localStorage.setItem('oneneStarCount', stars.length);
            if (typeof pb !== 'undefined' && pb.authStore.isValid) {
                try {
                    await pb.collection('users').update(pb.authStore.model.id, { starCount: stars.length });
                } catch (e) { console.log("星星同步失敗", e); }
            }
        }
    }
}

function startStarTimer() { 
    longPressTimer = setTimeout(async () => { 
        if (confirm("要清空累積的繁星能量嗎？")) { 
            stars = []; 
            localStorage.setItem('oneneStarCount', 0); 
            if (typeof pb !== 'undefined' && pb.authStore.isValid) {
                try {
                    await pb.collection('users').update(pb.authStore.model.id, { starCount: 0 });
                } catch (e) { console.log("清空同步失敗", e); }
            }
        } 
    }, 3000); 
}

function clearStarTimer() { clearTimeout(longPressTimer); }

// 彩蛋互動邏輯
function handleBrandClick() {
    brandClickCount++;
    clearTimeout(brandClickTimer);
    if (brandClickCount >= 10) {
        bounceAllStars();
        brandClickCount = 0; 
    } else {
        brandClickTimer = setTimeout(() => { brandClickCount = 0; }, 400); 
    }
}

function bounceAllStars() {
    stars.forEach(star => {
        star.vy = -12 - Math.random() * 8; 
        star.vx = (Math.random() - 0.5) * 12; 
        star.isSleeping = false; 
    });
    if (localStorage.getItem('oneneVibrationEnabled') !== 'false' && navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
    }
}