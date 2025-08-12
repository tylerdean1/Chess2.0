// AI engine: move generation, simulation, evaluation, and search
import { BOARD_SIZE, clone } from './state.js';
import { legalMoves } from './moves.js';

export function listAllMoves(state, color) {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
        const p = state.board[r][c];
        if (p && p.col === color) {
            const list = legalMoves(state, r, c, p);
            for (const m of list) moves.push({ from: [r, c], to: [m.r, m.c], meta: m });
        }
    }
    return moves;
}

function transformOnMimic(piece, captured) {
    if (!piece || !captured) return;
    if (piece.u && piece.u.mimic) {
        const prevU = { ...piece.u };
        const newType = captured.t;
        piece.t = newType;
        const clonedU = structuredClone(captured.u || {});
        clonedU.bank = prevU.bank;
        clonedU.level = prevU.level;
        clonedU.mimic = prevU.mimic === true;
        if (newType !== 'P' && 'reverse' in clonedU) delete clonedU.reverse;
        piece.u = clonedU;
    }
}

export function applyMoveClone(state, move) {
    const ns = clone(state);
    const [fr, fc] = move.from; const [tr, tc] = move.to;
    const p = ns.board[fr][fc];
    if (!p) return ns;
    const preType = p.t;
    const captured = ns.board[tr][tc];
    ns.board[tr][tc] = p; ns.board[fr][fc] = null; p.moved = true;
    // Pawn reverse unlock on reaching end or capture
    if (p.t === 'P') {
        const endRank = (p.col === 'w') ? 0 : (BOARD_SIZE - 1);
        if (tr === endRank || !!captured) p.u.reverse = true;
    }
    if (captured) {
        // Bank increment (kept for potential future evals)
        if (p.u) p.u.bank = (p.u.bank || 0) + 1;
        // Mimic
        transformOnMimic(p, captured);
        // If mover is K/Q (pre-type), grant shield to moved square and set expiry on mover's color
        if (preType === 'K' || preType === 'Q') {
            ns.shielded = { r: tr, c: tc, owner: p.col, expiresOn: p.col };
        }
    }
    ns.selected = null; ns.moves = [];
    // Flip turn, handle shield expiry
    ns.turn = (p.col === 'w') ? 'b' : 'w';
    if (ns.shielded && ns.turn === ns.shielded.expiresOn) ns.shielded = null;
    return ns;
}

function evaluate(state) {
    // Material + levels + small mobility bonus; positive favors Black
    const pieceVal = { K: 200, Q: 9, R: 5, B: 3.25, N: 3, P: 1 };
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
        const p = state.board[r][c];
        if (!p) continue;
        let v = pieceVal[p.t] || 0;
        v += (p.u?.level || 0) * 0.25;
        if (state.shielded && state.shielded.r === r && state.shielded.c === c) v += 0.5;
        score += (p.col === 'b') ? v : -v;
    }
    // Mobility
    try {
        const bm = listAllMoves(state, 'b').length;
        const wm = listAllMoves(state, 'w').length;
        score += (bm - wm) * 0.04;
    } catch { /* ignore */ }
    return score;
}

function depthForLevel(level) {
    // Map 1..10 -> depth
    const map = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 5 };
    const d = map[Math.max(1, Math.min(10, level | 0))];
    return d;
}

function minimax(state, depth, alpha, beta, maximizingBlack, deadline) {
    if (depth === 0 || (deadline && Date.now() > deadline)) return { score: evaluate(state) };
    const color = maximizingBlack ? 'b' : 'w';
    const moves = listAllMoves(state, color);
    if (moves.length === 0) return { score: evaluate(state) };
    // Move ordering: captures first by target value desc
    moves.sort((a, b) => {
        const ta = state.board[a.to[0]][a.to[1]]; const tb = state.board[b.to[0]][b.to[1]];
        const pv = t => ({ K: 200, Q: 9, R: 5, B: 3.25, N: 3, P: 1 }[t] || 0);
        return (tb ? pv(tb.t) : -1) - (ta ? pv(ta.t) : -1);
    });
    let best = maximizingBlack ? -Infinity : Infinity;
    for (const m of moves) {
        const ns = applyMoveClone(state, m);
        const val = minimax(ns, depth - 1, alpha, beta, !maximizingBlack, deadline).score;
        if (maximizingBlack) {
            if (val > best) best = val;
            if (best > alpha) alpha = best;
            if (beta <= alpha) break;
        } else {
            if (val < best) best = val;
            if (best < beta) beta = best;
            if (beta <= alpha) break;
        }
    }
    return { score: best };
}

export function aiChooseMove(state, level) {
    const color = 'b';
    const moves = listAllMoves(state, color);
    if (moves.length === 0) return null;
    const depth = depthForLevel(level);
    const timeBudgetMs = 300 + Math.min(900, level * 120);
    const deadline = Date.now() + timeBudgetMs;
    // Evaluate each move with alpha-beta
    let bestMove = null; let bestScore = -Infinity;
    // Order as in minimax for good pruning
    moves.sort((a, b) => {
        const ta = state.board[a.to[0]][a.to[1]]; const tb = state.board[b.to[0]][b.to[1]];
        const pv = t => ({ K: 200, Q: 9, R: 5, B: 3.25, N: 3, P: 1 }[t] || 0);
        return (tb ? pv(tb.t) : -1) - (ta ? pv(ta.t) : -1);
    });
    for (const m of moves) {
        const ns = applyMoveClone(state, m);
        const { score } = minimax(ns, depth - 1, -Infinity, Infinity, false, deadline);
        if (score > bestScore) { bestScore = score; bestMove = m; }
        if (Date.now() > deadline) break;
    }
    return bestMove || moves[0];
}
