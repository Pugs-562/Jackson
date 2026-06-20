// --- Global State ---
const GRID_SIZE = 16;
let isDrawing = false;
let coins = 150; 
let initialDuration = 25 * 60; 
let timeLeft = 25 * 60;
let timerInterval = null;
let isStudying = false;

// Timer Persistence Variables
let sessionEndTime = 0;

let ownedItems = [];
let equippedItems = { hat: null, drink: null, food: null, outfit: null };
let savedCostumes = {}; // Wardrobe memory

// Deterministic Color Palette (Generates 25 colors)
const colorPalette = ['transparent'];
for(let i=0; i<24; i++){
    if (i < 4) { const s = Math.floor((i/3)*255); colorPalette.push(`rgb(${s}, ${s}, ${s})`); }
    else { const h = ((i-4)/19)*360; colorPalette.push(`hsl(${h}, 90%, 55%)`); }
}
let selectedColorIndex = 1; // Default to first non-transparent

let friendsData = [
    { id: 'me', name: "You", coins: coins, status: 'online' },
    { id: 'f1', name: "PixelPaws", coins: 1420, status: 'studying' },
    { id: 'f2', name: "StudyBuddy99", coins: 850, status: 'online' },
    { id: 'f3', name: "DoggoLover", coins: 430, status: 'offline' }
];

// --- LocalStorage System ---
function saveData() {
    try {
        const data = {
            coins, ownedItems, equippedItems, savedCostumes,
            currentCostumeCode: getCostumeCode()
        };
        localStorage.setItem('pugApp', JSON.stringify(data));
    } catch(e) { console.warn("Storage disabled", e); }
}

function loadData() {
    try {
        const str = localStorage.getItem('pugApp');
        if(str) {
            const data = JSON.parse(str);
            if(data.coins !== undefined) coins = data.coins;
            if(data.ownedItems) ownedItems = data.ownedItems;
            if(data.equippedItems) equippedItems = Object.assign(equippedItems, data.equippedItems);
            if(data.savedCostumes) savedCostumes = data.savedCostumes;
            if(data.currentCostumeCode) applyCostumeCode(data.currentCostumeCode);
        }
    } catch(e) { console.warn("Storage disabled", e); }
    
    updateCoinDisplays();
    renderShop();
    renderInventory();
    renderWardrobe();
    renderPugOverlays();
}

// --- UI/Core Updates ---
function updateCoinDisplays() {
    document.querySelectorAll('.shop-coin-display').forEach(el => el.innerText = coins);
    let me = friendsData.find(f => f.id === 'me');
    if (me) me.coins = coins;
}

function switchTab(target, btnElement) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    btnElement.classList.add('active');
    document.getElementById(target + '-panel').classList.add('active');
    if(target === 'shop') renderShop();
    if(target === 'inventory') renderInventory();
    if(target === 'friends') renderFriends();
}

// Sprite Data
const pugDesign = ["0000000000000000","0004400000044000","0044440000444400","0444443333444440","0444411111144440","0044111111114400","0031111111111300","0031133333311300","0031345334531300","0031344334431300","0031133443311300","0003113333113000","0003111363113000","0003111111113000","0000333003330000","0000000000000000"];
const pugColors = { '0': 'transparent', '1': '#EAB875', '2': '#D1A362', '3': '#3E2A1E', '4': '#221915', '5': '#FFFFFF', '6': '#FF8BA0' };

const basePug = document.getElementById('base-pug');
pugDesign.forEach(row => {
    for(let char of row) {
        const cell = document.createElement('div');
        cell.style.backgroundColor = pugColors[char];
        basePug.appendChild(cell);
    }
});

function petPug() { const pug = document.getElementById('pet-wrapper'); pug.style.transform = 'scale(1.1) translateY(-15px)'; setTimeout(() => { pug.style.transform = ''; }, 200); }
const bgThemes = ["linear-gradient(to bottom, #87CEEB 0%, #87CEEB 60%, #55cc55 60%, #32CD32 100%)", "linear-gradient(to bottom, #FF7E5F 0%, #FEB47B 50%, #d45d79 50%, #6A0572 100%)", "linear-gradient(to bottom, #0F2027 0%, #203A43 55%, #1b2e35 55%, #111 100%)"];
let bgIndex = 0;
function cycleBackground() { bgIndex = (bgIndex + 1) % bgThemes.length; document.getElementById('environment').style.background = bgThemes[bgIndex]; }

// --- Costume Editor Grid ---
const editorGrid = document.getElementById('editor-grid');
const overlayGrid = document.getElementById('costume-overlay');
const palette = document.getElementById('palette');

for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const editCell = document.createElement('div');
    editCell.classList.add('edit-cell');
    editCell.dataset.index = i;
    editCell.dataset.colorIndex = 0;
    
    const row = Math.floor(i / GRID_SIZE) + 1, col = (i % GRID_SIZE) + 1;
    if (col === 8) editCell.classList.add('col-8'); if (row === 8) editCell.classList.add('row-8');
    if (col === 16) editCell.classList.add('col-16'); if (row === 16) editCell.classList.add('row-16');
    
    const overlayCell = document.createElement('div'); overlayCell.classList.add('pixel');
    editorGrid.appendChild(editCell); overlayGrid.appendChild(overlayCell);
}

function paint(index) {
    editorGrid.children[index].dataset.colorIndex = selectedColorIndex;
    editorGrid.children[index].style.backgroundColor = colorPalette[selectedColorIndex];
    overlayGrid.children[index].style.backgroundColor = colorPalette[selectedColorIndex];
}

editorGrid.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; handleTouch(e); }, { passive: false });
editorGrid.addEventListener('touchmove', (e) => { e.preventDefault(); if(isDrawing) handleTouch(e); }, { passive: false });
editorGrid.addEventListener('touchend', () => { isDrawing = false; saveData(); });

editorGrid.addEventListener('mousedown', (e) => { isDrawing = true; handleMouse(e); });
editorGrid.addEventListener('mousemove', (e) => { if(isDrawing) handleMouse(e); });
document.addEventListener('mouseup', () => { if(isDrawing){ isDrawing = false; saveData(); } });

function handleTouch(e) {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains('edit-cell')) paint(target.dataset.index);
}
function handleMouse(e) { if (e.target && e.target.classList.contains('edit-cell')) paint(e.target.dataset.index); }

// Build Palette
for (let i = 1; i < colorPalette.length; i++) {
    const swatch = document.createElement('div');
    swatch.classList.add('color-swatch');
    swatch.dataset.paletteIndex = i;
    swatch.style.backgroundColor = colorPalette[i];
    swatch.addEventListener('click', (e) => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedColorIndex = parseInt(e.target.dataset.paletteIndex);
    });
    palette.appendChild(swatch);
}
palette.children[0].classList.add('selected');

function eraserMode() { document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected')); selectedColorIndex = 0; }
function clearCostume() {
    for (let i = 0; i < editorGrid.children.length; i++) {
        editorGrid.children[i].dataset.colorIndex = 0;
        editorGrid.children[i].style.backgroundColor = 'transparent';
        overlayGrid.children[i].style.backgroundColor = 'transparent';
    }
    saveData();
}

// --- Wardrobe System ---
function getCostumeCode() {
    let code = "";
    for(let i=0; i<256; i++) {
        code += String.fromCharCode(65 + parseInt(editorGrid.children[i].dataset.colorIndex || 0)); // Map 0-24 to A-Y
    }
    return code;
}

function applyCostumeCode(code) {
    if(code.length !== 256) { alert("Invalid costume code! Must be 256 characters."); return; }
    for(let i=0; i<256; i++) {
        let cIdx = code.charCodeAt(i) - 65;
        if (cIdx < 0 || cIdx >= colorPalette.length) cIdx = 0;
        editorGrid.children[i].dataset.colorIndex = cIdx;
        editorGrid.children[i].style.backgroundColor = colorPalette[cIdx];
        overlayGrid.children[i].style.backgroundColor = colorPalette[cIdx];
    }
    saveData();
}

function saveCostume() {
    const name = document.getElementById('costume-name-input').value.trim();
    if(!name) { alert("Please enter a name first."); return; }
    savedCostumes[name] = getCostumeCode();
    document.getElementById('costume-name-input').value = "";
    renderWardrobe();
    saveData();
}

function importCostume() {
    const code = document.getElementById('costume-import-input').value.trim().toUpperCase();
    applyCostumeCode(code);
    document.getElementById('costume-import-input').value = "";
}

function renderWardrobe() {
    const list = document.getElementById('wardrobe-list');
    list.innerHTML = "";
    for(const [name, code] of Object.entries(savedCostumes)) {
        const div = document.createElement('div');
        div.className = "wardrobe-item";
        div.innerHTML = `
            <span style="flex:1; font-weight:bold; font-size: 0.9rem;">${name}</span>
            <button class="btn" style="padding: 6px 12px; font-size: 0.8rem; background:var(--accent);" onclick="applyCostumeCode('${code}')">Equip</button>
            <button class="btn" style="padding: 6px 12px; font-size: 0.8rem; background:#95a5a6;" onclick="navigator.clipboard.writeText('${code}'); alert('Copied!');">Code</button>
            <button class="btn" style="padding: 6px 10px; font-size: 0.8rem; background:#e74c3c;" onclick="deleteCostume('${name}')">X</button>
        `;
        list.appendChild(div);
    }
}

function deleteCostume(name) { delete savedCostumes[name]; renderWardrobe(); saveData(); }

// --- Timestamp-Based Timer ---
function openTimePicker() {
    if (isStudying) return;
    document.getElementById('timer-display').style.display = 'none';
    const picker = document.getElementById('native-time-picker');
    picker.style.display = 'block'; picker.focus();
    try { picker.showPicker(); } catch(e) {}
}

function saveNativeTime() {
    const val = document.getElementById('native-time-picker').value;
    if (!val) return;
    const [hours, mins] = val.split(':').map(Number);
    initialDuration = (hours * 3600) + (mins * 60) || 60; 
    timeLeft = initialDuration;
    document.getElementById('native-time-picker').style.display = 'none';
    document.getElementById('timer-display').style.display = 'block';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${mins}:${secs}`;
}

function spawnCoinDrop(amount) {
    const app = document.getElementById('app');
    const visualCoins = Math.min(amount, 20); 
    for(let i = 0; i < visualCoins; i++) {
        setTimeout(() => {
            const wrapper = document.createElement('div'); wrapper.className = 'coin-drop-wrapper';
            wrapper.style.left = (Math.random() * 85) + '%'; wrapper.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
            const trail = document.createElement('div'); trail.className = 'coin-trail';
            const sprite = document.createElement('div'); sprite.className = 'coin-sprite';
            sprite.style.animationDuration = (0.4 + Math.random() * 0.4) + 's';
            sprite.style.animationDirection = Math.random() > 0.5 ? 'normal' : 'reverse';
            wrapper.appendChild(trail); wrapper.appendChild(sprite); app.appendChild(wrapper);
            setTimeout(() => { wrapper.remove(); }, 2500);
        }, i * 150); 
    }
}

function toggleTimer() {
    const btn = document.getElementById('start-timer-btn');
    let me = friendsData.find(f => f.id === 'me');

    if (isStudying) {
        clearInterval(timerInterval);
        btn.innerText = "Resume Session"; btn.style.background = "var(--accent)";
        isStudying = false; if(me) me.status = 'online';
    } else {
        btn.innerText = "Pause Session"; btn.style.background = "#e67e22";
        isStudying = true; if(me) me.status = 'studying';
        document.getElementById('native-time-picker').style.display = 'none';
        document.getElementById('timer-display').style.display = 'block';

        // Timestamp target recalculation ensures background stability
        sessionEndTime = Date.now() + (timeLeft * 1000);

        timerInterval = setInterval(() => {
            timeLeft = Math.max(0, Math.round((sessionEndTime - Date.now()) / 1000));
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                isStudying = false; if(me) me.status = 'online';
                btn.innerText = "Start New Session"; btn.style.background = "var(--accent)";
                
                const earnedCoins = Math.round((initialDuration / 60) * 4);
                timeLeft = initialDuration; updateTimerDisplay();
                coins += earnedCoins; updateCoinDisplays();
                cycleBackground(); spawnCoinDrop(earnedCoins);
                saveData();
            }
        }, 1000);
    }
    if (document.getElementById('friends-panel').classList.contains('active')) renderFriends();
}

// --- Expanded Shop/Items ---
const pixelItems = {
    tophat: { colors: {0:'transparent', 1:'#222', 2:'#e74c3c'}, data: ["0000000000","0001111000","0001111000","0001111000","0002222000","0011111100","0000000000","0000000000","0000000000","0000000000"] },
    crown: { colors: {0:'transparent', 1:'#f1c40f', 2:'#e67e22', 3:'#e74c3c', 4:'#3498db'}, data: ["0000000000","0010010010","0010111010","0011111110","0013141310","0011111110","0022222220","0000000000","0000000000","0000000000"] },
    boba: { colors: {0:'transparent', 1:'#ecf0f1', 2:'#d35400', 3:'#e67e22', 4:'#bdc3c7', 5:'#2c3e50'}, data: ["0000220000","0000200000","0000200000","0014444100","0013333100","0013333100","0015353100","0013535100","0001111000","0000000000"] },
    coffee: { colors: {0:'transparent', 1:'#fff', 2:'#8e44ad', 3:'#34495e', 4:'#bdc3c7'}, data: ["0000404000","0004000000","0000040000","0003333000","0011111100","0012222100","0012222100","0001111000","0000000000","0000000000"] },
    pizza: { colors: {0:'transparent', 1:'#f39c12', 2:'#f1c40f', 3:'#c0392b'}, data: ["0000000000","0011111100","0012322100","0002223000","0003222000","0000230000","0000220000","0000000000","0000000000","0000000000"] },
    bone: { colors: {0:'transparent', 1:'#ecf0f1', 2:'#bdc3c7'}, data: ["0000000000","0011001100","0111111110","0111111110","0011001100","0000000000","0000000000","0000000000","0000000000","0000000000"] },
    
    // NEW CONTENT
    graduationCap: { colors: {0:'transparent', 1:'#2c3e50', 2:'#f1c40f', 3:'#e74c3c'}, data: ["0000000000","0111111110","1111111111","0001111020","0001111020","0000000030","0000000030","0000000000","0000000000","0000000000"] },
    headphones: { colors: {0:'transparent', 1:'#34495e', 2:'#e74c3c', 3:'#ecf0f1'}, data: ["0000000000","0011111100","0110000110","1100000011","2200000022","2300000032","2200000022","0000000000","0000000000","0000000000"] },
    matcha: { colors: {0:'transparent', 1:'#ecf0f1', 2:'#2ecc71', 3:'#27ae60', 4:'#bdc3c7'}, data: ["0000220000","0000200000","0000200000","0014444100","0012222100","0013333100","0012323100","0013232100","0001111000","0000000000"] },
    donut: { colors: {0:'transparent', 1:'#e67e22', 2:'#f39c12', 3:'#e74c3c', 4:'#3498db'}, data: ["0000000000","0001111000","0013333100","0134334310","0133113310","0134114310","0013333100","0001111000","0000000000","0000000000"] },
    sweater: { colors: {0:'transparent', 1:'#e74c3c', 2:'#c0392b', 3:'#fff'}, data: ["0000000000","0000000000","0000000000","0000000000","0000000000","0001111100","0011212110","0012121210","0003333300","0000000000"] }
};

const catalog = [
    { id: 'tophat', name: "Top Hat", price: 50, type: "hat", equipClass: "equip-hat" },
    { id: 'crown', name: "Crown", price: 150, type: "hat", equipClass: "equip-hat" },
    { id: 'graduationCap', name: "Grad Cap", price: 200, type: "hat", equipClass: "equip-hat" },
    { id: 'headphones', name: "Headphones", price: 120, type: "hat", equipClass: "equip-hat" },
    { id: 'boba', name: "Boba Tea", price: 80, type: "drink", equipClass: "equip-drink" },
    { id: 'coffee', name: "Coffee", price: 40, type: "drink", equipClass: "equip-drink" },
    { id: 'matcha', name: "Matcha", price: 70, type: "drink", equipClass: "equip-drink" },
    { id: 'pizza', name: "Pizza", price: 60, type: "food", equipClass: "equip-food" },
    { id: 'donut', name: "Donut", price: 45, type: "food", equipClass: "equip-food" },
    { id: 'bone', name: "Treat Bone", price: 30, type: "food", equipClass: "equip-food" },
    { id: 'sweater', name: "Red Sweater", price: 100, type: "outfit", equipClass: "equip-outfit" }
];

function buildPixelGrid(itemId, size = '100%') {
    const item = pixelItems[itemId];
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid'; wrapper.style.gridTemplateColumns = 'repeat(10, 1fr)';
    wrapper.style.width = size; wrapper.style.height = size; wrapper.style.imageRendering = 'pixelated';
    item.data.forEach(row => { for(let char of row) {
        const cell = document.createElement('div'); cell.style.backgroundColor = item.colors[char]; wrapper.appendChild(cell);
    }});
    return wrapper;
}

function renderShop() {
    const container = document.getElementById('shop-container'); container.innerHTML = '';
    const unowned = catalog.filter(item => !ownedItems.includes(item.id));
    if(unowned.length === 0) { container.innerHTML = `<p style="grid-column:span 2; text-align:center;">Shop empty!</p>`; return; }
    unowned.forEach(item => {
        const card = document.createElement('div'); card.classList.add('card');
        const icon = document.createElement('div'); icon.className = 'icon-container'; icon.appendChild(buildPixelGrid(item.id, '40px'));
        card.appendChild(icon);
        card.insertAdjacentHTML('beforeend', `
            <div style="font-weight: bold; font-size: 0.9rem;">${item.name}</div>
            <div class="price-tag">🪙 ${item.price}</div>
            <button class="btn" style="width: 100%; font-size: 0.85rem;" onclick="buyItem('${item.id}')">Buy</button>
        `);
        container.appendChild(card);
    });
}

function renderInventory() {
    const container = document.getElementById('inventory-container'); container.innerHTML = '';
    const owned = catalog.filter(item => ownedItems.includes(item.id));
    if(owned.length === 0) { container.innerHTML = `<p style="grid-column:span 2; text-align:center;">Bag empty.</p>`; return; }
    owned.forEach(item => {
        const card = document.createElement('div'); card.classList.add('card');
        const isEquipped = equippedItems[item.type] === item.id;
        let btnHtml = isEquipped ? `<button class="btn" style="width: 100%; background: #95a5a6; font-size: 0.85rem;" onclick="unequipItem('${item.type}')">Unequip</button>` : `<button class="btn" style="width: 100%; background: #2ecc71; font-size: 0.85rem;" onclick="equipItem('${item.id}')">Equip</button>`;
        const icon = document.createElement('div'); icon.className = 'icon-container'; icon.appendChild(buildPixelGrid(item.id, '40px'));
        card.appendChild(icon); card.insertAdjacentHTML('beforeend', `<div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 10px;">${item.name}</div>${btnHtml}`);
        container.appendChild(card);
    });
}

function renderFriends() {
    const container = document.getElementById('friends-container'); container.innerHTML = '';
    [...friendsData].sort((a, b) => b.coins - a.coins).forEach((friend, idx) => {
        let statusText = "Offline", statusClass = "status-offline";
        if (friend.status === 'studying') { statusText = "Studying..."; statusClass = "status-studying"; }
        else if (friend.status === 'online') { statusText = "Online"; statusClass = "status-online"; }
        container.insertAdjacentHTML('beforeend', `
            <div class="friend-card ${friend.id === 'me' ? 'is-me' : ''}">
                <div class="rank-number">#${idx + 1}</div>
                <div class="friend-info">
                    <div class="friend-name">${friend.name}</div>
                    <div class="status-container ${statusClass}"><div class="status-dot"></div><div class="status-text">${statusText}</div></div>
                </div>
                <div class="friend-score">🪙 ${friend.coins}</div>
            </div>
        `);
    });
}

function buyItem(id) {
    const item = catalog.find(i => i.id === id);
    if (coins >= item.price) { coins -= item.price; ownedItems.push(id); updateCoinDisplays(); renderShop(); saveData(); } 
    else { alert("Not enough coins!"); }
}
function equipItem(id) { const item = catalog.find(i => i.id === id); equippedItems[item.type] = item.id; renderInventory(); renderPugOverlays(); saveData(); }
function unequipItem(type) { equippedItems[type] = null; renderInventory(); renderPugOverlays(); saveData(); }

function renderPugOverlays() {
    const overlay = document.getElementById('shop-overlay'); overlay.innerHTML = ''; 
    Object.values(equippedItems).forEach(itemId => {
        if (itemId) {
            const item = catalog.find(i => i.id === itemId);
            const el = document.createElement('div'); el.className = item.equipClass;
            el.appendChild(buildPixelGrid(itemId, '100%')); overlay.appendChild(el);
        }
    });
}

// Initialize App
loadData(); // Overwrites local variables if data exists
