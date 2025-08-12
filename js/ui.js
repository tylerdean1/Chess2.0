// Rendering, interactions, and modal management
import { BOARD_SIZE, PIECES, UNICODE, algebra, clone, colorName, initial } from './state.js';
import { legalMoves } from './moves.js';
import { applyUpgrade, getUpgradeOptions } from './upgrades.js';
import { aiChooseMove } from './engine.js';

let flipped = false;
let state = initial();
let history = [];

// Elements
const logEl = document.getElementById('log');
const boardEl = document.getElementById('board');
// Landing elements
const landingBack = document.getElementById('landingBack');
const modePvp = document.getElementById('modePvp');
const modeCpu = document.getElementById('modeCpu');
const cpuLevel = document.getElementById('cpuLevel');
const cpuLevelVal = document.getElementById('cpuLevelVal');
const ingameCpuLevel = document.getElementById('ingameCpuLevel');
const ingameCpuVal = document.getElementById('ingameCpuVal');
const startBtn = document.getElementById('startBtn');
const turnLabel = document.getElementById('turnLabel');
const upgradeBack = document.getElementById('upgradeBack');
const upgradeOptions = document.getElementById('upgradeOptions');
let gameMode = { type: 'pvp', aiLevel: 5 }; // 'pvp' | 'cpu'
const newGameBtn = document.getElementById('newGame');
const undoBtn = document.getElementById('undoBtn');
const flipBtn = document.getElementById('flip');
const helpBtn = document.getElementById('help');
const closeModalBtn = document.getElementById('closeModal');
const skipUpgradeBtn = document.getElementById('skipUpgrade');

export function log(msg) {
    logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + logEl.textContent;
}

function levelClass(lv) {
    if (lv >= 3) return 'lv3';
    if (lv === 2) return 'lv2';
    if (lv === 1) return 'lv1';
    return '';
}

export function render() {
    boardEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    const rows = [...Array(BOARD_SIZE).keys()];
    const cols = [...Array(BOARD_SIZE).keys()];
    const orderRows = flipped ? rows.slice().reverse() : rows;
    const orderCols = flipped ? cols.slice().reverse() : cols;

    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    orderRows.forEach(r => {
        orderCols.forEach(c => {
            const sq = document.createElement('div');
            const sqColor = (r + c) % 2 === 0 ? 'light' : 'dark';
            sq.className = `sq ${sqColor}`;
            sq.dataset.r = r; sq.dataset.c = c; sq.title = algebra(r, c);

            const mv = state.moves.find(m => m.r === r && m.c === c);
            if (mv) sq.classList.add(mv.capture ? 'capture' : 'move');
            if (state.selected && state.selected.r === r && state.selected.c === c) sq.classList.add('highlight');

            if (state.lastMove) {
                const [fr, fc] = state.lastMove.from; const [tr, tc] = state.lastMove.to;
                if (r === fr && c === fc) sq.classList.add('last-from');
                if (r === tr && c === tc) sq.classList.add('last-to');
            }

            const p = state.board[r][c];
            if (p) {
                const el = document.createElement('div');
                el.className = `piece ${p.col} ${levelClass(p.u.level)} shape-${p.t.toLowerCase()} lv-${p.u.level || 0}`;
                el.textContent = UNICODE[p.col][p.t];
                const badge = document.createElement('div');
                badge.className = 'badge'; badge.textContent = p.u.level || '';
                if ((p.u.level || 0) === 0) badge.style.display = 'none';
                el.appendChild(badge);
                sq.appendChild(el);
            }

            if (state.shielded && state.shielded.r === r && state.shielded.c === c) sq.classList.add('shield');

            if (r === BOARD_SIZE - 1) {
                const coord = document.createElement('div');
                coord.className = 'coord file';
                const files = 'abcdefghijklmnopqrstuvwxyz';
                coord.textContent = files[c]; sq.appendChild(coord);
            }
            if (c === 0) {
                const coord = document.createElement('div');
                coord.className = 'coord rank';
                coord.textContent = String(BOARD_SIZE - r);
                sq.appendChild(coord);
            }

            sq.addEventListener('click', () => onSquareClick(r, c));
            sq.addEventListener('mouseenter', () => onSquareHover(r, c));
            sq.addEventListener('mouseleave', () => clearHover());
            frag.appendChild(sq);
        });
    });

    turnLabel.textContent = state.turn === 'w' ? 'White' : 'Black';
    boardEl.appendChild(frag);
}

function clearHover() {
    // Remove hover classes
    boardEl.querySelectorAll('.sq.hov-move, .sq.hov-cap, .sq.hov-source').forEach(el => {
        el.classList.remove('hov-move', 'hov-cap', 'hov-source');
    });
}

function onSquareHover(r, c) {
    clearHover();
    const p = state.board[r][c];
    if (!p) return;
    // Preview legal moves for the piece regardless of whose turn it is
    const list = legalMoves(state, r, c, p);
    const src = boardEl.querySelector(`.sq[data-r="${r}"][data-c="${c}"]`);
    if (src) src.classList.add('hov-source');
    for (const m of list) {
        const node = boardEl.querySelector(`.sq[data-r="${m.r}"][data-c="${m.c}"]`);
        if (!node) continue;
        node.classList.add(m.capture ? 'hov-cap' : 'hov-move');
    }
}

function openUpgradePicker(r, c) {
    state.pendingUpgrade = { r, c };
    const p = state.board[r][c];
    const opts = getUpgradeOptions(p);
    upgradeOptions.innerHTML = '';
    opts.forEach(o => {
        const el = document.createElement('div');
        el.className = 'opt'; el.innerHTML = `<h4>${o.title}</h4><p>${o.desc}</p>`;
        el.addEventListener('click', () => {
            applyUpgrade(p, o.key);
            p.u.bank = Math.max(0, (p.u.bank || 0) - 1);
            log(`⬆️ ${colorName(p.col)} ${PIECES[p.t]} upgraded: ${o.title}`);
            closeModal(); render();
        });
        upgradeOptions.appendChild(el);
    });
    if (opts.length === 0) {
        const el = document.createElement('div');
        el.className = 'opt muted';
        el.innerHTML = `<h4>No upgrades available</h4><p>Bank your point for later.</p>`;
        upgradeOptions.appendChild(el);
    }
    upgradeBack.style.display = 'flex';
}

function closeModal() { upgradeBack.style.display = 'none'; state.pendingUpgrade = null; }

function onSquareClick(r, c) {
    if (state.winner) return;
    if (state.pendingShield && state.pendingShield.owner) {
        const target = state.board[r][c];
        if (target && target.col === state.pendingShield.owner) {
            state.shielded = { r, c, owner: target.col, expiresOn: target.col };
            log(`${colorName(target.col)} shields ${PIECES[target.t]} on ${algebra(r, c)} for one enemy turn.`);
            state.pendingShield = null;
            state.selected = null; state.moves = [];
            state.turn = state.turn === 'w' ? 'b' : 'w';
            render();
            if (gameMode.type === 'cpu' && state.turn === 'b') setTimeout(() => aiTurn(), 120);
        }
        return;
    }

    const p = state.board[r][c];
    if (p && p.col === state.turn) {
        state.selected = { r, c };
        state.moves = legalMoves(state, r, c, p);
        render();
        return;
    }

    if (state.selected) {
        const can = state.moves.find(m => m.r === r && m.c === c);
        if (!can) { state.selected = null; state.moves = []; render(); return; }
        moveSelectedTo(r, c, can);
        if (gameMode.type === 'cpu' && state.turn === 'b' && !(state.pendingShield && state.pendingShield.owner)) setTimeout(() => aiTurn(), 150);
    }
}

function moveSelectedTo(r, c, meta) {
    const { r: sr, c: sc } = state.selected;
    const p = state.board[sr][sc];
    history.push(clone(state));

    const captured = state.board[r][c];
    state.board[r][c] = p; state.board[sr][sc] = null; p.moved = true;
    state.lastMove = { from: [sr, sc], to: [r, c], captured: captured ? { ...captured } : null, piece: { t: p.t, col: p.col }, meta };

    // Pawn special: unlock reverse if they reach the end rank or capture
    if (p.t === 'P') {
        const endRank = (p.col === 'w') ? 0 : (BOARD_SIZE - 1);
        if (r === endRank || !!captured) {
            p.u.reverse = true;
        }
    }

    if (captured) {
        p.u.bank += 1;
        log(`${colorName(p.col)} ${PIECES[p.t]} captured ${colorName(captured.col)} ${PIECES[captured.t]} on ${algebra(r, c)} (+1 Upgrade Point)`);
        if (captured.t === 'K') {
            state.winner = p.col;
            log(`🎉 ${colorName(p.col)} wins by capturing the King!`);
            alert(`${colorName(p.col)} wins by capturing the King!`);
        } else {
            // Pawn mimic transformation: if mimic is enabled, transform into captured piece and inherit its abilities
            if (p.u && p.u.mimic) {
                const prevU = { ...p.u };
                const newType = captured.t;
                p.t = newType;
                // Deep clone captured abilities and keep bank from the capturing piece; keep mimic flag to enable future transformations
                const clonedU = structuredClone(captured.u || {});
                clonedU.bank = prevU.bank; // preserve your upgrade bank
                clonedU.level = prevU.level; // treat as same level for visuals
                clonedU.mimic = prevU.mimic === true; // persist mimic capability
                // Reverse only applies to pawns; drop it on non-pawns
                if (newType !== 'P' && 'reverse' in clonedU) delete clonedU.reverse;
                p.u = clonedU;
                log(`✨ ${colorName(p.col)} piece mimics ${PIECES[newType]} and transforms!`);
            }
            // Post-capture upgrade: if human, open picker; if AI, auto-pick
            if (gameMode.type === 'cpu' && p.col === 'b') {
                autoApplyUpgrade(p);
                render();
            } else {
                openUpgradePicker(r, c);
            }
        }
        // Shield trigger should be based on mover's pre-move type (stored in lastMove)
        const moverWasRoyal = state.lastMove && (state.lastMove.piece.t === 'K' || state.lastMove.piece.t === 'Q');
        if (moverWasRoyal) {
            if (gameMode.type === 'cpu' && p.col === 'b') {
                // AI auto-selects a shield: prefer the moved piece; else the highest-value piece
                const target = { r, c };
                state.shielded = { r: target.r, c: target.c, owner: p.col, expiresOn: p.col };
                log(`🤖 AI shields ${PIECES[p.t]} on ${algebra(target.r, target.c)} for one enemy turn.`);
            } else {
                state.pendingShield = { owner: p.col };
                log(`${colorName(p.col)} may select a friendly piece to gain Royal Immunity for one enemy turn.`);
            }
        }
    }

    state.selected = null; state.moves = [];
    let flipNow = true;
    if (state.pendingShield && state.pendingShield.owner) flipNow = false;
    if (flipNow) {
        state.turn = state.turn === 'w' ? 'b' : 'w';
        if (state.shielded && state.turn === state.shielded.expiresOn) {
            log(`🛡️ Royal Immunity on ${algebra(state.shielded.r, state.shielded.c)} has expired.`);
            state.shielded = null;
        }
    }
    render();

    if (state.lastMove) {
        const [tr, tc] = state.lastMove.to;
        const node = boardEl.querySelector(`.sq[data-r="${tr}"][data-c="${tc}"]`);
        if (node) node.classList.add('attack-anim');
        setTimeout(() => { if (node) node.classList.remove('attack-anim'); }, 320);
    }
}

// Controls
newGameBtn.onclick = () => { state = initial(); history = []; render(); log('New game started. White to move.'); };
undoBtn.onclick = () => {
    if (history.length === 0) { log('Nothing to undo.'); return; }
    state = history.pop(); render(); log('Reverted one move.');
};
flipBtn.onclick = () => { flipped = !flipped; render(); };
helpBtn.onclick = () => {
    alert(`Quick Tips:

• Click a piece to see its legal moves.
• Yellow outline = selected piece; white ring = move; pink ring = capture.
• After a capture, choose an upgrade. Or click "Bank (Skip)" to save the point.
• Win condition (prototype): capture the opposing King.
• Royal Circle (King/Queen): opponents cannot move to squares adjacent to that piece.

Have fun!`);
};

// AI turn (Black)
function aiTurn() {
    if (state.winner) return;
    const mv = aiChooseMove(state, gameMode.aiLevel || 5);
    if (!mv) return;
    state.selected = { r: mv.from[0], c: mv.from[1] };
    state.moves = [mv.meta];
    moveSelectedTo(mv.to[0], mv.to[1], mv.meta);
}

// Landing boot
function showLanding() { if (landingBack) landingBack.style.display = 'flex'; }
function hideLanding() { if (landingBack) landingBack.style.display = 'none'; }
if (cpuLevel && cpuLevelVal) cpuLevel.addEventListener('input', () => cpuLevelVal.textContent = cpuLevel.value);
if (ingameCpuLevel && ingameCpuVal) ingameCpuLevel.addEventListener('input', () => {
    const v = Math.max(1, Math.min(10, parseInt(ingameCpuLevel.value || '5', 10)));
    ingameCpuVal.textContent = String(v);
    gameMode.aiLevel = v;
});
if (startBtn) {
    startBtn.onclick = () => {
        const type = (modeCpu && modeCpu.checked) ? 'cpu' : 'pvp';
        const level = cpuLevel ? parseInt(cpuLevel.value, 10) : 5;
        gameMode = { type, aiLevel: Math.max(1, Math.min(10, level || 5)) };
        if (ingameCpuLevel && ingameCpuVal) { ingameCpuLevel.value = String(gameMode.aiLevel); ingameCpuVal.textContent = String(gameMode.aiLevel); }
        state = initial(); history = []; flipped = false;
        hideLanding();
        render();
        log(type === 'cpu' ? `Mode: vs Computer (difficulty ${gameMode.aiLevel}). White to move.` : 'Mode: Local PvP. White to move.');
    };
}
showLanding();
render();
log('Welcome to Chess 2.0! Choose a mode to begin.');

// Heuristic for AI upgrade auto-pick
function autoApplyUpgrade(p) {
    if (!p?.u || (p.u.bank || 0) <= 0) return;
    const opts = getUpgradeOptions(p);
    if (!opts.length) { p.u.bank = Math.max(0, p.u.bank - 1); return; }
    // Prioritize by type
    const priority = {
        P: ['P_MIMIC', 'P_DIAG', 'P_FWD', 'P_SIDE'],
        N: ['N_BOTH', 'N_LONG', 'N_SHORT', 'N_22'],
        B: ['B_ORTHO1', 'B_ORTHO_PLUS', 'B_JUMP'],
        R: ['R_DIAG1', 'R_DIAG_PLUS', 'R_CHARGE'],
        Q: ['Q_EXT', 'Q_KNIGHT', 'Q_CHAIN', 'Q_IMMUNE'],
        K: ['K_STEP2', 'K_KNIGHT', 'K_IMMUNE']
    };
    const order = priority[p.t] || [];
    const pick = opts.find(o => order.includes(o.key)) || opts[0];
    applyUpgrade(p, pick.key);
    p.u.bank = Math.max(0, (p.u.bank || 0) - 1);
    log(`🤖 AI auto-upgraded ${PIECES[p.t]}: ${pick.title}`);
}
