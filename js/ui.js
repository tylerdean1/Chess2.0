// Rendering, interactions, and modal management (3D-enabled with 2D fallback)
import { BOARD_SIZE, PIECES, UNICODE, algebra, clone, colorName, initial } from './state.js';
import { legalMoves } from './moves.js';
import { applyUpgrade, getUpgradeOptions } from './upgrades.js';
import { aiChooseMove } from './engine.js';
import { buildPieceEl } from './svg.js';
import { init3D, update3D, dispose3D } from './three-board.js';

let state = initial();
let history = [];
let gameMode = { type: 'pvp', aiLevel: 5 };
let use3D = false; // toggled at game start if WebGL is available

// Elements from current HTML
const landingEl = document.getElementById('landing');
const startPvpBtn = document.getElementById('start-pvp');
const startAiBtn = document.getElementById('start-ai');
const diffSlider = document.getElementById('difficulty');
const diffVal = document.getElementById('difficultyVal');
const gameEl = document.getElementById('game');
const turnInfoEl = document.getElementById('turnInfo');
const messageEl = document.getElementById('message');
const boardEl = document.getElementById('board');
const threeEl = document.getElementById('three-container');
const upgradeModal = document.getElementById('upgradeModal');
const upgradeOptions = document.getElementById('upgradeOptions');
const upgradeClose = document.getElementById('upgradeClose');
const gameoverEl = document.getElementById('gameover');
const gameoverTitle = document.getElementById('gameoverTitle');
const gameoverText = document.getElementById('gameoverText');
const gameoverClose = document.getElementById('gameoverClose');

function log(msg) {
    if (messageEl) messageEl.textContent = msg;
    try { console.log('[Chess2]', msg); } catch { }
}

function renderGrid() {
    boardEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    const rows = [...Array(BOARD_SIZE).keys()];
    const cols = [...Array(BOARD_SIZE).keys()];
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    rows.forEach(r => {
        cols.forEach(c => {
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
                const wrap = document.createElement('div');
                wrap.className = `piece wrap lv-${p.u.level || 0}`;
                const svg = buildPieceEl(p);
                wrap.appendChild(svg);
                sq.appendChild(wrap);
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
    boardEl.appendChild(frag);
}

function render() {
    if (turnInfoEl) turnInfoEl.textContent = state.turn === 'w' ? 'White to move' : 'Black to move';
    if (use3D) {
        if (threeEl) threeEl.classList.remove('hidden');
        if (boardEl) boardEl.classList.add('hidden');
        update3D(state);
    } else {
        if (threeEl) threeEl.classList.add('hidden');
        if (boardEl) boardEl.classList.remove('hidden');
        renderGrid();
    }
}

function clearHover() {
    boardEl.querySelectorAll('.sq.hov-move, .sq.hov-cap, .sq.hov-source').forEach(el => {
        el.classList.remove('hov-move', 'hov-cap', 'hov-source');
    });
}

function onSquareHover(r, c) {
    if (use3D) return; // hover preview in 3D pending
    clearHover();
    const p = state.board[r][c];
    if (!p) return;
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
            log(`${colorName(p.col)} ${PIECES[p.t]} upgraded: ${o.title}`);
            closeUpgradeModal(); render();
        });
        upgradeOptions.appendChild(el);
    });
    if (opts.length === 0) {
        const el = document.createElement('div');
        el.className = 'opt muted';
        el.innerHTML = `<h4>No upgrades available</h4><p>Bank your point for later.</p>`;
        upgradeOptions.appendChild(el);
    }
    upgradeModal.classList.remove('hidden');
}

function closeUpgradeModal() { upgradeModal.classList.add('hidden'); state.pendingUpgrade = null; }

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
            log(`${colorName(p.col)} wins by capturing the King!`);
            if (gameoverEl && gameoverTitle && gameoverText) {
                if (gameMode.type === 'pvp') {
                    const winner = state.winner === 'w' ? 'White' : 'Black';
                    gameoverTitle.textContent = `${winner} wins!`;
                    gameoverText.textContent = `${winner} has captured the King.`;
                } else {
                    // vs Computer: speak to the human (White)
                    const playerWon = state.winner === 'w';
                    gameoverTitle.textContent = playerWon ? 'Congratulations, you win!' : 'You have been defeated.';
                    gameoverText.textContent = playerWon ? 'Well played. The enemy King has fallen.' : 'Your King has been captured. Try a different strategy.';
                }
                gameoverEl.classList.remove('hidden');
            }
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
                log(`${colorName(p.col)} piece mimics ${PIECES[newType]} and transforms!`);
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
                log(`AI shields ${PIECES[p.t]} on ${algebra(target.r, target.c)} for one enemy turn.`);
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

    if (!use3D && state.lastMove) {
        const [tr, tc] = state.lastMove.to;
        const node = boardEl.querySelector(`.sq[data-r="${tr}"][data-c="${tc}"]`);
        if (node) node.classList.add('attack-anim');
        setTimeout(() => { if (node) node.classList.remove('attack-anim'); }, 320);
    }
}

// Landing controls and start flow
if (diffSlider && diffVal) diffSlider.addEventListener('input', () => { diffVal.textContent = String(diffSlider.value); });
if (upgradeClose) upgradeClose.addEventListener('click', () => closeUpgradeModal());
if (gameoverClose) gameoverClose.addEventListener('click', () => { if (gameoverEl) gameoverEl.classList.add('hidden'); });

function startGame(type, level) {
    gameMode = { type, aiLevel: Math.max(1, Math.min(10, level || 5)) };
    state = initial(); history = [];
    if (landingEl) landingEl.classList.add('hidden');
    if (gameEl) gameEl.classList.remove('hidden');
    use3D = !!window.__WEBGL_OK__;
    if (use3D && threeEl) {
        init3D(threeEl, state, { onSquareClick: onSquareClick }).catch(() => { use3D = false; render(); });
    }
    render();
    log(type === 'cpu' ? `Mode: vs Computer (difficulty ${gameMode.aiLevel}). White to move.` : 'Mode: Local PvP. White to move.');
}

if (startPvpBtn) startPvpBtn.onclick = () => startGame('pvp', 5);
if (startAiBtn) startAiBtn.onclick = () => startGame('cpu', parseInt(diffSlider?.value || '5', 10));

// AI turn (Black)
function aiTurn() {
    if (state.winner) return;
    const mv = aiChooseMove(state, gameMode.aiLevel || 5);
    if (!mv) return;
    state.selected = { r: mv.from[0], c: mv.from[1] };
    state.moves = [mv.meta];
    moveSelectedTo(mv.to[0], mv.to[1], mv.meta);
}

// Initial landing
if (landingEl) landingEl.classList.remove('hidden');
if (gameEl) gameEl.classList.add('hidden');
if (diffVal && diffSlider) diffVal.textContent = String(diffSlider.value || '3');

// Heuristic for AI upgrade auto-pick
function autoApplyUpgrade(p) {
    if (!p?.u || (p.u.bank || 0) <= 0) return;
    const opts = getUpgradeOptions(p);
    if (!opts.length) { p.u.bank = Math.max(0, p.u.bank - 1); return; }
    // Prioritize by type
    const priority = {
        P: ['P_MIMIC', 'P_DIAG', 'P_FWD', 'P_SIDE'],
        N: ['N_FLEX', 'N_22'],
        B: ['B_ORTHO1', 'B_ORTHO_PLUS', 'B_JUMP'],
        R: ['R_DIAG1', 'R_DIAG_PLUS', 'R_CHARGE'],
        Q: ['Q_EXT', 'Q_KNIGHT', 'Q_CHAIN'],
        K: ['K_STEP2', 'K_KNIGHT', 'K_IMMUNE']
    };
    const order = priority[p.t] || [];
    const pick = opts.find(o => order.includes(o.key)) || opts[0];
    applyUpgrade(p, pick.key);
    p.u.bank = Math.max(0, (p.u.bank || 0) - 1);
    log(`AI auto-upgraded ${PIECES[p.t]}: ${pick.title}`);
}
