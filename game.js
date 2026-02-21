// ============================================================
// NEATZA RUNNERS - Endless Runner cu Razvan si Dani
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas size
const W = 400;
const H = 700;
canvas.width = W;
canvas.height = H;

// ============================================================
// GAME STATE
// ============================================================
const GameState = {
    MENU: 'menu',
    CHARACTER_SELECT: 'character_select',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    PAUSED: 'paused'
};

let state = GameState.MENU;
let score = 0;
let highScore = parseInt(localStorage.getItem('neatzaHighScore') || '0');
let coins = 0;
let totalCoins = parseInt(localStorage.getItem('neatzaCoins') || '0');
let distance = 0;
let speed = 6;
let baseSpeed = 6;
let maxSpeed = 14;
let speedIncrease = 0.002;
let frameCount = 0;
let shakeAmount = 0;
let flashAlpha = 0;

// Lanes
const LANE_COUNT = 3;
const LANE_WIDTH = 100;
const LANE_START = (W - LANE_COUNT * LANE_WIDTH) / 2;
const LANE_CENTERS = [
    LANE_START + LANE_WIDTH * 0.5,
    LANE_START + LANE_WIDTH * 1.5,
    LANE_START + LANE_WIDTH * 2.5
];

// ============================================================
// ALL CHARACTERS (any can be player, rest become monsters)
// ============================================================
const characters = [
    { name: 'Ramona', fullName: 'Ramona Olaru', color: '#E74C3C', trait: 'Eleganta', special: 'Magnetism', specialDesc: 'Atrage coins automat', img: 'img/ramona.png', width: 45, height: 45 },
    { name: 'Razvan', fullName: 'Razvan Simion', color: '#FF6B35', trait: 'Sarmul', special: 'Sprint', specialDesc: 'Viteza maxima + invincibil', img: 'img/razvan.png', width: 45, height: 45 },
    { name: 'Dani', fullName: 'Dani Otil', color: '#3498DB', trait: 'Umorul', special: 'Scut', specialDesc: 'Invincibil temporar', img: 'img/dani.png', width: 45, height: 45 },
    { name: 'Cuza', fullName: 'Cuza', color: '#2ECC71', trait: 'Energia', special: 'Super Salt', specialDesc: 'Sare mult mai sus', img: 'img/cuza.png', width: 40, height: 40 },
    { name: 'Ristei', fullName: 'Florin Ristei', color: '#9B59B6', trait: 'Talentul', special: 'Slow Motion', specialDesc: 'Incetineste totul', img: 'img/ristei.png', width: 45, height: 45 },
    { name: 'Bucatar', fullName: 'Bucatarul', color: '#E67E22', trait: 'Gustul', special: 'Festin', specialDesc: 'Coins valoreaza dublu', img: 'img/bucatar.png', width: 48, height: 48 },
    { name: 'Bucalae', fullName: 'Bucalae', color: '#C0392B', trait: 'Forta', special: 'Zdrobire', specialDesc: 'Distruge obstacole', img: 'img/bucalae.png', width: 42, height: 42 }
];

// Preload ALL images (player + monsters)
const charImages = {};
let imagesLoaded = 0;
characters.forEach(char => {
    const img = new Image();
    img.onload = () => { imagesLoaded++; };
    img.src = char.img;
    charImages[char.name] = img;
});

let selectedCharIdx = 0;
let selectedChar = characters[0];

// ============================================================
// PLAYER
// ============================================================
const player = {
    lane: 1,
    targetLane: 1,
    x: LANE_CENTERS[1],
    y: H - 160,
    width: 40,
    height: 60,
    velY: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    jumpHeight: -14,
    gravity: 0.7,
    groundY: H - 160,
    isInvincible: false,
    invincibleTimer: 0,
    animFrame: 0,
    animTimer: 0,
    tilt: 0
};

// ============================================================
// OBSTACLES, COINS, POWERUPS
// ============================================================
let obstacles = [];
let coinItems = [];
let powerups = [];
let particles = [];
let bgElements = [];
let roadLines = [];

// Obstacles = all characters except the selected one (set dynamically in startGame)
let obstacleTypes = characters.slice(1);

// ============================================================
// MOBILE BUTTONS
// ============================================================
let mobileButtonPressed = null;
let pressedButtonId = null;
let pressedButtonTimer = 0;
const mobileButtons = [
    { id: 'left',    x: 15,  y: H - 115, w: 60, h: 60, dir: 'left' },
    { id: 'right',   x: 85,  y: H - 115, w: 60, h: 60, dir: 'right' },
    { id: 'jump',    x: W - 80, y: H - 140, w: 65, h: 58, dir: 'up' },
    { id: 'slide',   x: W - 80, y: H - 72,  w: 65, h: 58, dir: 'down' }
];

function handleMobileButton(id) {
    switch (id) {
        case 'left': movePlayer(-1); break;
        case 'right': movePlayer(1); break;
        case 'jump': jump(); break;
        case 'slide': slide(); break;
    }
}

// ============================================================
// INPUT HANDLING
// ============================================================
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 40;

document.addEventListener('keydown', (e) => {
    if (state === GameState.MENU) {
        if (e.key === 'Enter' || e.key === ' ') {
            state = GameState.CHARACTER_SELECT;
        }
        return;
    }
    if (state === GameState.CHARACTER_SELECT) {
        if (e.key === 'ArrowLeft') selectedCharIdx = (selectedCharIdx - 1 + characters.length) % characters.length;
        if (e.key === 'ArrowRight') selectedCharIdx = (selectedCharIdx + 1) % characters.length;
        if (e.key === 'Enter' || e.key === ' ') startGame();
        return;
    }
    if (state === GameState.GAME_OVER) {
        if (e.key === 'Enter' || e.key === ' ') {
            state = GameState.CHARACTER_SELECT;
        }
        return;
    }
    if (state === GameState.PLAYING) {
        if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1);
        if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1);
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') jump();
        if (e.key === 'ArrowDown' || e.key === 's') slide();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const tx = (touch.clientX - rect.left) * scaleX;
    const ty = (touch.clientY - rect.top) * scaleY;

    // Check mobile buttons first during PLAYING
    if (state === GameState.PLAYING) {
        for (const btn of mobileButtons) {
            if (tx >= btn.x && tx <= btn.x + btn.w && ty >= btn.y && ty <= btn.y + btn.h) {
                handleMobileButton(btn.id);
                mobileButtonPressed = btn.id;
                pressedButtonId = btn.id;
                pressedButtonTimer = 8;
                return;
            }
        }
    }

    touchStartX = tx;
    touchStartY = ty;
    touchStartTime = Date.now();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();

    // If a button was pressed in touchstart, skip swipe logic
    if (mobileButtonPressed) {
        mobileButtonPressed = null;
        return;
    }

    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const endX = (touch.clientX - rect.left) * scaleX;
    const endY = (touch.clientY - rect.top) * scaleY;
    const dx = endX - touchStartX;
    const dy = endY - touchStartY;
    const dt = Date.now() - touchStartTime;

    if (state === GameState.MENU) {
        state = GameState.CHARACTER_SELECT;
        return;
    }
    if (state === GameState.CHARACTER_SELECT) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
            // Swipe left/right = change character
            if (dx > 0) selectedCharIdx = (selectedCharIdx + 1) % characters.length;
            else selectedCharIdx = (selectedCharIdx - 1 + characters.length) % characters.length;
        } else if (dt < 300) {
            // Tap on left arrow
            if (endX < 60 && endY > 210 && endY < 260) {
                selectedCharIdx = (selectedCharIdx - 1 + characters.length) % characters.length;
            }
            // Tap on right arrow
            else if (endX > W - 60 && endY > 210 && endY < 260) {
                selectedCharIdx = (selectedCharIdx + 1) % characters.length;
            }
            // Tap on START button
            else if (endX > W / 2 - 80 && endX < W / 2 + 80 && endY > 520 && endY < 570) {
                startGame();
            }
        }
        return;
    }
    if (state === GameState.GAME_OVER) {
        state = GameState.CHARACTER_SELECT;
        return;
    }
    if (state === GameState.PLAYING) {
        // Swipe controls still work alongside buttons
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
            movePlayer(dx > 0 ? 1 : -1);
        } else if (Math.abs(dy) > SWIPE_THRESHOLD) {
            if (dy < 0) jump();
            else slide();
        }
    }
}, { passive: false });

// Prevent scrolling on mobile
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Mouse click for desktop
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (state === GameState.MENU) {
        state = GameState.CHARACTER_SELECT;
        return;
    }
    if (state === GameState.CHARACTER_SELECT) {
        // Left arrow
        if (mx < 60 && my > 210 && my < 260) {
            selectedCharIdx = (selectedCharIdx - 1 + characters.length) % characters.length;
        }
        // Right arrow
        else if (mx > W - 60 && my > 210 && my < 260) {
            selectedCharIdx = (selectedCharIdx + 1) % characters.length;
        }
        // Play button
        else if (mx > W / 2 - 80 && mx < W / 2 + 80 && my > 520 && my < 570) {
            startGame();
        }
        return;
    }
    if (state === GameState.GAME_OVER) {
        // Retry button -> go to character select
        if (mx > W / 2 - 80 && mx < W / 2 + 80 && my > 420 && my < 470) {
            state = GameState.CHARACTER_SELECT;
        }
        return;
    }
    if (state === GameState.PLAYING) {
        // Check mobile buttons with mouse click too
        for (const btn of mobileButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                handleMobileButton(btn.id);
                pressedButtonId = btn.id;
                pressedButtonTimer = 8;
                return;
            }
        }
    }
});

// ============================================================
// PLAYER ACTIONS
// ============================================================
function movePlayer(dir) {
    const newLane = player.targetLane + dir;
    if (newLane >= 0 && newLane < LANE_COUNT) {
        player.targetLane = newLane;
    }
}

function jump() {
    if (!player.isJumping && !player.isSliding) {
        player.isJumping = true;
        player.velY = player.jumpHeight;
        spawnParticles(player.x, player.groundY + player.height / 2, selectedChar.color, 5);
    }
}

function slide() {
    if (!player.isJumping && !player.isSliding) {
        player.isSliding = true;
        player.slideTimer = 30;
        spawnParticles(player.x, player.groundY + player.height / 2, '#fff', 3);
    }
}

// Active power-up tracking (from road pickups only)
let activePowerupName = '';
let activePowerupTimer = 0;
let activePowerupMaxTimer = 0;

// ============================================================
// GAME INIT
// ============================================================
function startGame() {
    selectedChar = characters[selectedCharIdx];
    obstacleTypes = characters.filter(c => c.name !== selectedChar.name);
    state = GameState.PLAYING;
    score = 0;
    coins = 0;
    distance = 0;
    speed = baseSpeed;
    frameCount = 0;

    player.lane = 1;
    player.targetLane = 1;
    player.x = LANE_CENTERS[1];
    player.y = player.groundY;
    player.velY = 0;
    player.isJumping = false;
    player.isSliding = false;
    player.slideTimer = 0;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    activePowerupName = '';
    activePowerupTimer = 0;
    activePowerupMaxTimer = 0;
    player.animFrame = 0;
    player.tilt = 0;

    obstacles = [];
    coinItems = [];
    powerups = [];
    particles = [];
    bgElements = [];
    roadLines = [];

    // Init road lines
    for (let i = 0; i < 15; i++) {
        roadLines.push({ y: i * 50 });
    }

    // Init background elements
    for (let i = 0; i < 8; i++) {
        bgElements.push(createBgElement(-Math.random() * H));
    }
}

function createBgElement(y) {
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const types = ['building', 'tree', 'studio_light', 'antenna', 'billboard'];
    return {
        type: types[Math.floor(Math.random() * types.length)],
        x: side === 'left' ? Math.random() * 30 : W - 30 - Math.random() * 30,
        y: y || -50,
        side: side,
        width: 30 + Math.random() * 40,
        height: 60 + Math.random() * 100,
        color: `hsl(${Math.random() * 360}, 30%, ${25 + Math.random() * 15}%)`
    };
}

// ============================================================
// SPAWNING
// ============================================================
let lastObstacleType = '';
function spawnObstacle() {
    // Pick a random type but never repeat the same one twice in a row
    let type;
    do {
        type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    } while (type.name === lastObstacleType && obstacleTypes.length > 1);
    lastObstacleType = type.name;

    const lane = Math.floor(Math.random() * LANE_COUNT);
    const isShrinkActive = activePowerupTimer > 0 && activePowerupName === 'Micsorare';
    const sizeMultiplier = isShrinkActive ? 1.5 : 1;
    obstacles.push({
        ...type,
        width: Math.round(type.width * sizeMultiplier),
        height: Math.round(type.height * sizeMultiplier),
        x: LANE_CENTERS[lane],
        y: -type.height,
        lane: lane
    });
}

function spawnCoins() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const patterns = ['line', 'arc', 'diamond'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const count = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
        let cx = LANE_CENTERS[lane];
        let cy = -50 - i * 40;

        if (pattern === 'arc') {
            cx += Math.sin(i * 0.5) * 30;
        } else if (pattern === 'diamond') {
            const mid = count / 2;
            const offset = (1 - Math.abs(i - mid) / mid) * 40;
            cx += (i % 2 === 0 ? offset : -offset);
        }

        coinItems.push({
            x: cx,
            y: cy,
            radius: 10,
            collected: false,
            bobOffset: Math.random() * Math.PI * 2,
            sparkle: 0
        });
    }
}

let powerupBag = [];
function getNextPowerup() {
    if (powerupBag.length === 0) {
        powerupBag = ['magnet', 'shield', 'x2', 'super_salt', 'rocket', 'shrink', 'freeze', 'bomba'];
        // Shuffle
        for (let i = powerupBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [powerupBag[i], powerupBag[j]] = [powerupBag[j], powerupBag[i]];
        }
    }
    return powerupBag.pop();
}
function spawnPowerup() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const type = getNextPowerup();
    powerups.push({
        x: LANE_CENTERS[lane],
        y: -40,
        lane: lane,
        type: type,
        radius: 18,
        bobOffset: Math.random() * Math.PI * 2,
        glow: 0
    });
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color: color,
            size: 2 + Math.random() * 4
        });
    }
}

// ============================================================
// UPDATE
// ============================================================
function update() {
    // Shake and flash decay run in all states
    if (shakeAmount > 0) shakeAmount *= 0.9;
    if (shakeAmount < 0.1) shakeAmount = 0;
    if (flashAlpha > 0) flashAlpha *= 0.95;
    if (flashAlpha < 0.01) flashAlpha = 0;

    if (state !== GameState.PLAYING) return;

    frameCount++;
    distance += speed;
    score = Math.floor(distance / 10);

    // Speed increase
    if (speed < maxSpeed && activePowerupTimer <= 0) {
        speed += speedIncrease;
    }

    // Player horizontal movement (smooth)
    const targetX = LANE_CENTERS[player.targetLane];
    player.x += (targetX - player.x) * 0.2;
    player.lane = player.targetLane;
    player.tilt = (targetX - player.x) * 0.05;

    // Jumping
    if (player.isJumping) {
        player.velY += player.gravity;
        player.y += player.velY;
        if (player.y >= player.groundY) {
            player.y = player.groundY;
            player.isJumping = false;
            player.velY = 0;
            spawnParticles(player.x, player.groundY + player.height / 2, '#aaa', 3);
        }
    }

    // Sliding
    if (player.isSliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) {
            player.isSliding = false;
        }
    }

    // Animation
    player.animTimer++;
    if (player.animTimer > 6) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 4;
    }

    // Invincibility
    if (player.isInvincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.isInvincible = false;
        }
    }

    // Active power-up countdown
    if (activePowerupTimer > 0) {
        activePowerupTimer--;
        if (activePowerupTimer <= 0) {
            // Reset all power-up effects
            player.jumpHeight = -14;
            player.width = 40;
            player.height = 60;
            speed = baseSpeed + (maxSpeed - baseSpeed) * Math.min(1, distance / 10000);
            activePowerupName = '';
            activePowerupMaxTimer = 0;
        }
    }

    // Spawn obstacles
    if (frameCount % Math.max(40, 80 - Math.floor(distance / 500)) === 0) {
        spawnObstacle();
    }

    // Spawn coins
    if (frameCount % 60 === 0) {
        spawnCoins();
    }

    // Spawn powerups
    if (frameCount % 400 === 0) {
        spawnPowerup();
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += speed;

        if (obs.y > H + 50) {
            obstacles.splice(i, 1);
            continue;
        }

        // Collision with player
        if (!player.isInvincible && checkCollision(obs)) {
            console.log('=== DEATH LOG ===');
            console.log('KILLED BY:', obs.name, 'lane:', obs.lane, 'multiLane:', obs.multiLane, obs.lanes || '');
            console.log('Obs pos: x=', obs.x.toFixed(1), 'y=', obs.y.toFixed(1), 'w=', obs.width, 'h=', obs.height);
            console.log('Player: x=', player.x.toFixed(1), 'y=', player.y.toFixed(1), 'targetLane=', player.targetLane, 'lane=', player.lane);
            console.log('Player jumping=', player.isJumping, 'sliding=', player.isSliding, 'invincible=', player.isInvincible);
            console.log('All obstacles on screen:');
            obstacles.forEach((o, idx) => {
                console.log('  [' + idx + ']', o.name, 'lane:', o.lane, 'x=', o.x.toFixed(1), 'y=', o.y.toFixed(1), 'w=', o.width, 'h=', o.height);
            });
            console.log('=================');
            gameOver();
            return;
        }
    }

    // Update coins
    for (let i = coinItems.length - 1; i >= 0; i--) {
        const coin = coinItems[i];
        coin.y += speed;
        coin.sparkle += 0.1;

        if (coin.y > H + 50) {
            coinItems.splice(i, 1);
            continue;
        }

        // Magnet effect
        if (activePowerupTimer > 0 && activePowerupName === 'Magnet') {
            const dx = player.x - coin.x;
            const dy = player.y - coin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                coin.x += dx * 0.1;
                coin.y += dy * 0.1;
            }
        }

        // Collection
        const dx = player.x - coin.x;
        const dy = (player.y + (player.isSliding ? 15 : 0)) - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30) {
            let coinValue = 1;
            if (activePowerupTimer > 0 && activePowerupName === 'x2 Coins') coinValue = 2;
            coins += coinValue;
            spawnParticles(coin.x, coin.y, '#FFD700', 5);
            coinItems.splice(i, 1);
        }
    }

    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.y += speed;
        pu.glow += 0.05;

        if (pu.y > H + 50) {
            powerups.splice(i, 1);
            continue;
        }

        const dx = player.x - pu.x;
        const dy = player.y - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 35) {
            applyPowerup(pu);
            spawnParticles(pu.x, pu.y, '#00FF88', 10);
            powerups.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Update road lines
    roadLines.forEach(line => {
        line.y += speed;
        if (line.y > H + 10) line.y -= 15 * 50;
    });

    // Update bg elements
    bgElements.forEach((el, i) => {
        el.y += speed * 0.3;
        if (el.y > H + 100) {
            bgElements[i] = createBgElement(-100);
        }
    });

}

function checkCollision(obs) {
    // LANE-BASED collision: only collide if player is on the same lane(s)
    // This prevents "unfair" side hits entirely
    const playerLane = player.targetLane;

    // Must be on the same lane to collide
    if (obs.lane !== playerLane) return false;

    // Can jump over monsters
    if (player.isJumping && player.y < player.groundY - 30) return false;
    // Can slide under monsters
    if (player.isSliding) return false;

    // Only check vertical overlap (Y axis)
    const margin = 10;
    const playerTop = player.isSliding ? player.y + player.height * 0.3 : player.y - player.height / 2;
    const playerBottom = player.y + player.height / 2;
    const obsTop = obs.y - obs.height / 2 + margin;
    const obsBottom = obs.y + obs.height / 2 - margin;

    return playerBottom > obsTop && playerTop < obsBottom;
}

// Power-up display names and durations (in frames, ~60fps)
const powerupInfo = {
    shield:         { name: 'Scut',        duration: 300 },  // 5s
    magnet:         { name: 'Magnet',      duration: 300 },  // 5s
    x2:             { name: 'x2 Coins',    duration: 300 },  // 5s
    rocket:         { name: 'Racheta',     duration: 180 },  // 3s
    shrink:         { name: 'Micsorare',   duration: 300 },  // 5s
    freeze:         { name: 'Inghetare',   duration: 180 },  // 3s
    bomba:          { name: 'Bomba!',      duration: 60  },  // 1s (instant, just display)
    super_salt:     { name: 'Super Salt',  duration: 300 }   // 5s
};

function applyPowerup(pu) {
    const info = powerupInfo[pu.type];
    activePowerupName = info.name;
    activePowerupTimer = info.duration;
    activePowerupMaxTimer = info.duration;

    switch (pu.type) {
        case 'shield':
            player.isInvincible = true;
            player.invincibleTimer = info.duration;
            break;
        case 'magnet':
            // Magnet effect handled in coin update via activePowerupName
            break;
        case 'x2':
            // Double coins handled in coin collection via activePowerupName
            break;
        case 'rocket':
            speed = maxSpeed + 4;
            break;
        case 'shrink':
            player.width = 25;
            player.height = 40;
            // Mareste obstacolele existente
            obstacles.forEach(obs => {
                obs.width = Math.round(obs.width * 1.5);
                obs.height = Math.round(obs.height * 1.5);
            });
            break;
        case 'freeze':
            speed = Math.max(2, speed * 0.3);
            break;
        case 'bomba':
            obstacles.forEach(obs => {
                spawnParticles(obs.x, obs.y, '#FF4500', 15);
                spawnParticles(obs.x, obs.y, '#FFD700', 8);
            });
            obstacles = [];
            shakeAmount = 8;
            flashAlpha = 0.4;
            break;
        case 'super_salt':
            // Sare mult mai sus
            player.jumpHeight = -22;
            break;
    }

    // Visual effect
    flashAlpha = Math.max(flashAlpha, 0.3);
    spawnParticles(player.x, player.y, '#00FF88', 15);
}

function gameOver() {
    state = GameState.GAME_OVER;
    shakeAmount = 15;
    flashAlpha = 0.8;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neatzaHighScore', highScore.toString());
    }
    totalCoins += coins;
    localStorage.setItem('neatzaCoins', totalCoins.toString());

    // Death particles
    for (let i = 0; i < 30; i++) {
        spawnParticles(player.x, player.y, selectedChar.color, 2);
        spawnParticles(player.x, player.y, '#FF0000', 1);
    }
}

// ============================================================
// DRAW
// ============================================================
function draw() {
    ctx.save();

    // Screen shake
    if (shakeAmount > 0.5) {
        ctx.translate(
            (Math.random() - 0.5) * shakeAmount,
            (Math.random() - 0.5) * shakeAmount
        );
    }

    switch (state) {
        case GameState.MENU: drawMenu(); break;
        case GameState.CHARACTER_SELECT: drawCharacterSelect(); break;
        case GameState.PLAYING: drawGame(); break;
        case GameState.GAME_OVER: drawGame(); drawGameOver(); break;
    }

    ctx.restore();
}

// ============================================================
// DRAW: MENU
// ============================================================
function drawMenu() {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#FF6B35');
    grad.addColorStop(0.5, '#E74C3C');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Animated background circles
    const t = Date.now() * 0.001;
    for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(
            W / 2 + Math.sin(t + i * 1.2) * 100,
            200 + Math.cos(t + i * 0.8) * 80 + i * 60,
            30 + Math.sin(t * 2 + i) * 15,
            0, Math.PI * 2
        );
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title
    ctx.save();
    ctx.translate(W / 2, 180);
    ctx.rotate(Math.sin(t * 2) * 0.03);

    // Title shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 48px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEATZA', 3, 3);
    ctx.fillText('RUNNERS', 3, 58);

    // Title main
    ctx.fillStyle = '#FFD700';
    ctx.fillText('NEATZA', 0, 0);
    ctx.fillStyle = '#FFF';
    ctx.fillText('RUNNERS', 0, 55);

    ctx.restore();

    // Subtitle
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cu Razvan si Dani', W / 2, 270);

    // Animated characters preview
    drawMenuCharacters(t);

    // Play button
    const btnY = 520;
    const pulse = Math.sin(t * 3) * 5;

    ctx.fillStyle = '#FFD700';
    roundRect(W / 2 - 90 - pulse / 2, btnY - pulse / 2, 180 + pulse, 60 + pulse, 15);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 26px Segoe UI, sans-serif';
    ctx.fillText('JOACA!', W / 2, btnY + 38);

    // Instructions
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText('Click sau apasa orice tasta', W / 2, 620);

    // High score
    if (highScore > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px Segoe UI, sans-serif';
        ctx.fillText(`Record: ${highScore}m`, W / 2, 660);
    }
}

function drawMenuCharacters(t) {
    const centerY = 390;

    // Draw all characters in a circle
    for (let i = 0; i < characters.length; i++) {
        const angle = t * 0.5 + (i / characters.length) * Math.PI * 2;
        const radiusX = 120;
        const radiusY = 45;
        const x = W / 2 + Math.cos(angle) * radiusX;
        const y = centerY + Math.sin(angle) * radiusY;
        // Scale based on depth (front = bigger)
        const depth = (Math.sin(angle) + 1) / 2;
        const size = 35 + depth * 25;

        ctx.save();
        ctx.globalAlpha = 0.5 + depth * 0.5;

        // Color ring
        ctx.strokeStyle = characters[i].color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();

        const img = charImages[characters[i].name];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        } else {
            ctx.fillStyle = characters[i].color;
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

// ============================================================
// DRAW: CHARACTER SELECT
// ============================================================
function drawCharacterSelect() {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#16213E');
    grad.addColorStop(1, '#0F3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const char = characters[selectedCharIdx];
    const t = Date.now() * 0.001;

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALEGE PERSONAJUL', W / 2, 45);

    // Character spotlight glow
    const spotGrad = ctx.createRadialGradient(W / 2, 240, 10, W / 2, 240, 180);
    spotGrad.addColorStop(0, char.color + '55');
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 60, W, 360);

    // Draw LARGE character portrait (200px!)
    const bounce = Math.sin(t * 3) * 3;
    const portraitSize = 200;
    const portraitY = 210 + bounce;
    const img = charImages[char.name];

    // Outer glow ring
    ctx.strokeStyle = char.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = char.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(W / 2, portraitY, portraitSize / 2 + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner colored ring
    ctx.strokeStyle = char.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, portraitY, portraitSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();

    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, portraitY, portraitSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, W / 2 - portraitSize / 2, portraitY - portraitSize / 2, portraitSize, portraitSize);
        ctx.restore();
    } else {
        ctx.fillStyle = char.color;
        ctx.beginPath();
        ctx.arc(W / 2, portraitY, portraitSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 60px sans-serif';
        ctx.fillText(char.name[0], W / 2, portraitY + 22);
    }

    // Character name
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 28px Segoe UI, sans-serif';
    ctx.fillText(char.fullName, W / 2, 380);

    // Trait
    ctx.fillStyle = char.color;
    ctx.font = 'italic 18px Segoe UI, sans-serif';
    ctx.fillText(`"${char.trait}"`, W / 2, 410);

    // Special ability box
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(W / 2 - 120, 425, 240, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Segoe UI, sans-serif';
    ctx.fillText(`Special: ${char.special}`, W / 2, 448);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px Segoe UI, sans-serif';
    ctx.fillText(char.specialDesc, W / 2, 467);

    // Navigation arrows (same style as in-game mobile buttons)
    drawStyledButton(10, 210, 50, 50, 'left', false);
    drawStyledButton(W - 60, 210, 50, 50, 'right', false);

    // Dots for character index
    for (let i = 0; i < characters.length; i++) {
        ctx.fillStyle = i === selectedCharIdx ? '#FFD700' : 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        const dotsWidth = characters.length * 20;
        ctx.arc(W / 2 - dotsWidth / 2 + i * 20 + 10, 495, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Play button
    const pulse = Math.sin(t * 3) * 3;
    ctx.fillStyle = char.color;
    ctx.shadowColor = char.color;
    ctx.shadowBlur = 10 + pulse;
    roundRect(W / 2 - 80, 520, 160, 50, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Segoe UI, sans-serif';
    ctx.fillText('START!', W / 2, 553);

    // Mini thumbnails of other characters at bottom
    const others = characters.filter((_, i) => i !== selectedCharIdx);
    const thumbSize = 32;
    const thumbY = 610;
    const totalThumbW = others.length * (thumbSize + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText('Vor deveni obstacole:', W / 2, thumbY - 12);
    for (let i = 0; i < others.length; i++) {
        const tx = W / 2 - totalThumbW / 2 + i * (thumbSize + 8) + thumbSize / 2;
        const tImg = charImages[others[i].name];
        ctx.globalAlpha = 0.6;
        if (tImg && tImg.complete && tImg.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(tx, thumbY, thumbSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(tImg, tx - thumbSize / 2, thumbY - thumbSize / 2, thumbSize, thumbSize);
            ctx.restore();
        } else {
            ctx.fillStyle = others[i].color;
            ctx.beginPath();
            ctx.arc(tx, thumbY, thumbSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Instructions
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sageti / swipe = schimba  |  Enter / tap = START', W / 2, 660);
}

// ============================================================
// DRAW: GAME
// ============================================================
function drawGame() {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    const timeOfDay = (Math.sin(distance * 0.0005) + 1) / 2;
    if (timeOfDay > 0.5) {
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(1, '#E0F7FA');
    } else {
        skyGrad.addColorStop(0, '#1a1a2e');
        skyGrad.addColorStop(1, '#16213E');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Background elements
    drawBackground();

    // Road
    drawRoad();

    // Coins
    coinItems.forEach(coin => drawCoin(coin));

    // Powerups
    powerups.forEach(pu => drawPowerup(pu));

    // Obstacles
    obstacles.forEach(obs => drawObstacle(obs));

    // Player
    drawPlayer();

    // Particles
    particles.forEach(p => drawParticle(p));

    // HUD
    drawHUD();

    // Flash effect
    if (flashAlpha > 0.01) {
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
    }
}

function drawBackground() {
    bgElements.forEach(el => {
        ctx.fillStyle = el.color;
        switch (el.type) {
            case 'building':
                ctx.fillRect(el.x - el.width / 2, el.y, el.width, el.height);
                // Windows
                ctx.fillStyle = 'rgba(255,255,150,0.5)';
                for (let wy = 10; wy < el.height - 10; wy += 20) {
                    for (let wx = 5; wx < el.width - 5; wx += 15) {
                        ctx.fillRect(el.x - el.width / 2 + wx, el.y + wy, 8, 10);
                    }
                }
                break;
            case 'tree':
                // Trunk
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(el.x - 4, el.y + 20, 8, 30);
                // Crown
                ctx.fillStyle = '#2E7D32';
                ctx.beginPath();
                ctx.arc(el.x, el.y + 10, 18, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'studio_light':
                ctx.fillStyle = '#555';
                ctx.fillRect(el.x - 3, el.y, 6, 40);
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(el.x, el.y, 12, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'antenna':
                ctx.fillStyle = '#777';
                ctx.fillRect(el.x - 2, el.y, 4, 60);
                ctx.fillStyle = '#E74C3C';
                ctx.beginPath();
                ctx.arc(el.x, el.y, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'billboard':
                ctx.fillStyle = '#444';
                ctx.fillRect(el.x - 2, el.y + 20, 4, 30);
                ctx.fillStyle = '#E74C3C';
                ctx.fillRect(el.x - 15, el.y, 30, 20);
                ctx.fillStyle = '#FFF';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('ANTENA1', el.x, el.y + 14);
                break;
        }
    });
}

function drawRoad() {
    // Road surface
    ctx.fillStyle = '#333842';
    const roadX = LANE_START - 15;
    const roadW = LANE_COUNT * LANE_WIDTH + 30;
    ctx.fillRect(roadX, 0, roadW, H);

    // Road edges
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(roadX, 0, 4, H);
    ctx.fillRect(roadX + roadW - 4, 0, 4, H);

    // Lane dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    for (let i = 1; i < LANE_COUNT; i++) {
        const lx = LANE_START + i * LANE_WIDTH;
        const offset = (frameCount * speed) % 40;
        ctx.lineDashOffset = -offset;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, H);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Perspective lines for depth
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 80) {
        const offset = (y + frameCount * speed * 0.5) % H;
        ctx.beginPath();
        ctx.moveTo(roadX, offset);
        ctx.lineTo(roadX + roadW, offset);
        ctx.stroke();
    }
}

function drawCoin(coin) {
    const t = Date.now() * 0.003 + coin.bobOffset;
    const bob = Math.sin(t) * 3;

    ctx.save();
    ctx.translate(coin.x, coin.y + bob);

    // Glow
    ctx.globalAlpha = 0.3 + Math.sin(t * 2) * 0.1;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Coin body
    ctx.globalAlpha = 1;
    const scaleX = Math.cos(t * 2);
    ctx.scale(Math.abs(scaleX) * 0.8 + 0.2, 1);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFA000';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, 4);

    ctx.restore();
}

function drawPowerup(pu) {
    const t = Date.now() * 0.003 + pu.bobOffset;
    const bob = Math.sin(t) * 5;

    ctx.save();
    ctx.translate(pu.x, pu.y + bob);

    const glowColor = {
        shield: '#3498DB',
        magnet: '#E74C3C',
        x2: '#2ECC71',
        super_salt: '#00FF7F',
        rocket: '#FF6600',
        shrink: '#00CED1',
        freeze: '#87CEEB',
        bomba: '#FF1744'
    }[pu.type];

    // Glow
    ctx.globalAlpha = 0.4 + Math.sin(t * 2) * 0.2;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();

    // Box
    ctx.globalAlpha = 1;
    ctx.fillStyle = glowColor;
    roundRect(-15, -15, 30, 30, 6);
    ctx.fill();

    // Icon
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const icons = {
        shield: '\u{1F6E1}',
        magnet: '\u{1F9F2}',
        x2: 'x2',
        super_salt: '\u2B06',
        rocket: '\u{1F680}',
        shrink: '\u{1F53D}',
        freeze: '\u2744',
        bomba: '\u{1F4A3}'
    };
    ctx.fillText(icons[pu.type] || '?', 0, 6);

    ctx.restore();
}

function drawObstacle(obs) {
    ctx.save();
    ctx.translate(obs.x, obs.y);

    const size = Math.max(obs.width, obs.height);
    const radius = size / 2;
    const t = Date.now() * 0.003;
    const bob = Math.sin(t + obs.x) * 3;

    // Danger glow ring
    ctx.strokeStyle = obs.color || '#FF4444';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(t * 2 + obs.x) * 0.2;
    ctx.beginPath();
    ctx.arc(0, bob, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw monster face image
    const img = charImages[obs.name];
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, bob, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -radius, bob - radius, size, size);
        ctx.restore();
    } else {
        // Fallback colored circle
        ctx.fillStyle = obs.color || '#E74C3C';
        ctx.beginPath();
        ctx.arc(0, bob, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(obs.name[0], 0, bob + 6);
    }

    // Name label below
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(-22, bob + radius + 2, 44, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obs.name, 0, bob + radius + 13);

    ctx.restore();
}

// ============================================================
// DRAW: CHARACTER SPRITE
// ============================================================
function drawCharacterSprite(x, y, char, frame, isSliding, isJumping) {
    ctx.save();
    ctx.translate(x, y);

    const img = charImages[char.name];
    const imgSize = 55;

    if (img && img.complete && img.naturalWidth > 0) {
        if (isSliding) {
            ctx.rotate(-Math.PI / 6);
            ctx.translate(0, 15);
            // Circular clip for head image, drawn smaller and rotated
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, -18, -18, 36, 36);
        } else {
            // Bob animation while running
            const bob = (!isJumping && !isSliding) ? Math.sin(frame * Math.PI / 2) * 2 : 0;

            // Circular clip for head image
            ctx.beginPath();
            ctx.arc(0, -10 + bob, imgSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, -imgSize / 2, -10 - imgSize / 2 + bob, imgSize, imgSize);
        }
    } else {
        // Fallback: colored circle with initial
        ctx.fillStyle = char.color;
        ctx.beginPath();
        ctx.arc(0, -10, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(char.name[0], 0, -4);
    }

    ctx.restore();
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);

    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 35, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (simple colored shape below the face)
    if (!player.isSliding) {
        const bob = player.isJumping ? 0 : Math.sin(player.animFrame * Math.PI / 2) * 2;
        const legAnim = Math.sin(player.animFrame * Math.PI / 2) * 6;

        // Legs
        ctx.fillStyle = '#2C3E50';
        if (!player.isJumping) {
            ctx.save();
            ctx.translate(-6, 18);
            ctx.rotate(legAnim * 0.04);
            ctx.fillRect(-4, 0, 8, 18);
            ctx.restore();
            ctx.save();
            ctx.translate(6, 18);
            ctx.rotate(-legAnim * 0.04);
            ctx.fillRect(-4, 0, 8, 18);
            ctx.restore();
        } else {
            ctx.fillRect(-10, 15, 8, 12);
            ctx.fillRect(2, 15, 8, 12);
        }

        // Shoes
        ctx.fillStyle = '#111';
        if (!player.isJumping) {
            ctx.fillRect(-12, 34, 10, 5);
            ctx.fillRect(2, 34, 10, 5);
        }

        // Torso
        ctx.fillStyle = selectedChar.color;
        roundRect(-14, 2 + bob, 28, 20, 4);
        ctx.fill();

        // Arms
        ctx.fillStyle = selectedChar.color;
        if (!player.isJumping) {
            ctx.save();
            ctx.translate(-14, 5 + bob);
            ctx.rotate(-legAnim * 0.04);
            ctx.fillRect(-4, 0, 6, 16);
            ctx.restore();
            ctx.save();
            ctx.translate(14, 5 + bob);
            ctx.rotate(legAnim * 0.04);
            ctx.fillRect(-2, 0, 6, 16);
            ctx.restore();
        }
    }

    // Invincibility shield
    if (player.isInvincible) {
        const t = Date.now() * 0.01;
        ctx.globalAlpha = 0.4 + Math.sin(t) * 0.2;
        ctx.strokeStyle = '#3498DB';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 5, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Power-up glow
    if (activePowerupTimer > 0) {
        ctx.shadowColor = selectedChar.color;
        ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.005) * 10;
    }

    // Draw face image
    drawCharacterSprite(0, 0, selectedChar, player.animFrame, player.isSliding, player.isJumping);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ============================================================
// DRAW: HUD
// ============================================================
function drawHUD() {
    // Score background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(10, 10, 130, 70, 10);
    ctx.fill();

    // Score
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 22px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${score}m`, 20, 38);

    // Coins
    ctx.fillStyle = '#FFD700';
    ctx.font = '16px Segoe UI, sans-serif';
    ctx.fillText(`${coins}`, 38, 62);

    // Coin icon
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(25, 57, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFA000';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 25, 60);

    // Active power-up panel (top right) - only show when a power-up is active
    if (activePowerupTimer > 0) {
        const panelX = W - 145;
        const panelY = 10;
        const panelW = 135;
        const panelH = 65;
        const remaining = Math.ceil(activePowerupTimer / 60);
        const t = Date.now() * 0.005;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(panelX, panelY, panelW, panelH, 10);
        ctx.fill();

        // Glowing border
        ctx.strokeStyle = selectedChar.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = selectedChar.color;
        ctx.shadowBlur = 8 + Math.sin(t) * 4;
        roundRect(panelX, panelY, panelW, panelH, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Power-up name
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 15px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(activePowerupName, panelX + panelW / 2, panelY + 22);

        // Timer bar background
        const timerBarX = panelX + 10;
        const timerBarY = panelY + 30;
        const timerBarW = panelW - 20;
        const timerBarH = 10;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(timerBarX, timerBarY, timerBarW, timerBarH, 5);
        ctx.fill();

        // Timer bar fill (decreasing)
        const timerFill = (activePowerupTimer / activePowerupMaxTimer) * timerBarW;
        ctx.fillStyle = selectedChar.color;
        roundRect(timerBarX, timerBarY, Math.max(0, timerFill), timerBarH, 5);
        ctx.fill();

        // Time remaining text
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 16px Segoe UI, sans-serif';
        ctx.fillText(`${remaining}s`, panelX + panelW / 2, panelY + 58);
    }

    // Character name badge
    ctx.fillStyle = selectedChar.color + '88';
    ctx.textAlign = 'left';
    roundRect(10, 85, 80, 20, 5);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '11px sans-serif';
    ctx.fillText(selectedChar.name, 18, 99);

    // Mobile buttons
    drawMobileButtons();
}

function drawStyledButton(x, y, w, h, dir, pressed) {
    ctx.globalAlpha = pressed ? 0.6 : 0.3;
    ctx.fillStyle = pressed ? '#FFF' : '#000';
    roundRect(x, y, w, h, 14);
    ctx.fill();

    ctx.globalAlpha = pressed ? 0.9 : 0.5;
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = pressed ? 3 : 2;
    roundRect(x, y, w, h, 14);
    ctx.stroke();

    // Draw triangle arrow, rotated by direction
    ctx.globalAlpha = pressed ? 1 : 0.7;
    ctx.fillStyle = '#FFF';
    const cx = x + w / 2;
    const cy = y + h / 2;
    const sz = Math.min(w, h) * 0.3;
    const angles = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
    const angle = angles[dir] || 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(sz * 0.8, sz * 0.5);
    ctx.lineTo(-sz * 0.8, sz * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawMobileButtons() {
    // Decay pressed button timer
    if (pressedButtonTimer > 0) pressedButtonTimer--;
    if (pressedButtonTimer <= 0) pressedButtonId = null;

    for (const btn of mobileButtons) {
        const isPressed = (btn.id === pressedButtonId && pressedButtonTimer > 0);
        drawStyledButton(btn.x, btn.y, btn.w, btn.h, btn.dir, isPressed);
    }
}

// ============================================================
// DRAW: GAME OVER
// ============================================================
function drawGameOver() {
    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // Game Over panel
    ctx.fillStyle = 'rgba(26,26,46,0.95)';
    roundRect(W / 2 - 140, 150, 280, 340, 20);
    ctx.fill();

    ctx.strokeStyle = selectedChar.color;
    ctx.lineWidth = 3;
    roundRect(W / 2 - 140, 150, 280, 340, 20);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#E74C3C';
    ctx.font = 'bold 36px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, 210);

    // Character name
    ctx.fillStyle = selectedChar.color;
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.fillText(selectedChar.fullName, W / 2, 245);

    // Stats
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Segoe UI, sans-serif';
    ctx.fillText(`Distanta: ${score}m`, W / 2, 290);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Monede: ${coins}`, W / 2, 320);

    // High score
    if (score >= highScore) {
        ctx.fillStyle = '#2ECC71';
        ctx.font = 'bold 18px Segoe UI, sans-serif';
        ctx.fillText('NOU RECORD!', W / 2, 360);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px Segoe UI, sans-serif';
        ctx.fillText(`Record: ${highScore}m`, W / 2, 360);
    }

    // Total coins
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText(`Total monede: ${totalCoins}`, W / 2, 395);

    // Retry button
    ctx.fillStyle = selectedChar.color;
    roundRect(W / 2 - 80, 420, 160, 50, 12);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px Segoe UI, sans-serif';
    ctx.fillText('DIN NOU!', W / 2, 452);

    // Instruction
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText('Click, Enter sau Swipe', W / 2, 500);
}

function drawParticle(p) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// ============================================================
// UTILITY
// ============================================================
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start!
gameLoop();
