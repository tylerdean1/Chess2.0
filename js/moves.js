// Move generation and constraints
import { BOARD_SIZE, inBounds, algebra, findPieces } from './state.js';

export function knightLegs(u) {
    // Base is (2,1); allow flexible increments up to knFlex steps distributed between legs.
    const baseA = 2, baseB = 1;
    const flex = Math.max(0, u.knFlex || 0);
    const set = new Set();
    for (let incA = 0; incA <= flex; incA++) {
        const incB = flex - incA;
        const a = baseA + incA;
        const b = baseB + incB;
        set.add(a + ',' + b);
        set.add(b + ',' + a);
    }
    return [...set].map(s => s.split(',').map(Number));
}

export function moveIsBlockedByAdjacencyImmunity(state, fromR, fromC, toR, toC, mover) {
    // Blocks entering squares adjacent to an opposing royal that has Royal Circle.
    // It should NOT grant a permanent shield to the royal itself, and should not block moving away.
    const opp = mover.col === 'w' ? 'b' : 'w';
    const royals = findPieces(state, k => (k.t === 'K') && k.col === opp && k.u.adjImmunity);
    for (const { r, c } of royals) {
        // If destination is the royal's square, allow capture as usual (no adjacent rule applies to the royal square)
        if (toR === r && toC === c) continue;
        const chebyshev = Math.max(Math.abs(toR - r), Math.abs(toC - c));
        if (chebyshev === 1) return true; // adjacent squares only
    }
    return false;
}

export function legalMoves(state, r, c, p) {
    const acc = [];
    const dir = p.col === 'w' ? -1 : 1;
    const B = state.board;

    const add = (rr, cc, cap = false, tag = null) => {
        if (!inBounds(rr, cc)) return;
        const occ = B[rr][cc];
        if (occ && occ.col === p.col) return;
        const shieldedHere = !!(state.shielded && state.shielded.r === rr && state.shielded.c === cc);
        if (occ && occ.col !== p.col && shieldedHere) return;
        acc.push({ r: rr, c: cc, capture: !!occ, tag });
    };

    const ray = (dr, dc, max = BOARD_SIZE, stopOnCapture = true, tag = null) => {
        for (let i = 1; i <= max; i++) {
            const rr = r + dr * i, cc = c + dc * i;
            if (!inBounds(rr, cc)) break;
            const occ = B[rr][cc];
            if (!occ) { add(rr, cc, false, tag); continue; }
            if (occ.col !== p.col) { add(rr, cc, true, tag); }
            if (stopOnCapture || occ) break;
        }
    };

    // Pawn
    if (p.t === 'P') {
        const forwardClear = (steps) => {
            for (let i = 1; i <= steps; i++) {
                const rr = r + dir * i;
                if (!inBounds(rr, c) || B[rr][c]) return false;
            }
            return true;
        };
        // Standard forward moves up to forwardRange
        for (let i = 1; i <= p.u.forwardRange; i++) {
            const rr = r + dir * i;
            if (!inBounds(rr, c)) break;
            if (B[rr][c]) break;
            add(rr, c, false, 'forward');
        }
        // First-move double step (exactly 2) if path is clear
        if (!p.moved) {
            const rr2 = r + dir * 2;
            if (inBounds(rr2, c) && forwardClear(2)) add(rr2, c, false, 'double');
        }
        // Diagonal captures
        for (let i = 1; i <= p.u.diagRange; i++) {
            [[dir * i, -i], [dir * i, i]].forEach(([dr, dc]) => {
                const rr = r + dr, cc = c + dc;
                if (!inBounds(rr, cc)) return;
                const occ = B[rr][cc];
                if (occ && occ.col !== p.col) add(rr, cc, true, 'diag-cap');
            });
        }
        // Reverse movement/captures if unlocked
        if (p.u.reverse) {
            const rdir = -dir; // move opposite
            const rForwardClear = (steps) => {
                for (let i = 1; i <= steps; i++) {
                    const rr = r + rdir * i;
                    if (!inBounds(rr, c) || B[rr][c]) return false;
                }
                return true;
            };
            for (let i = 1; i <= p.u.forwardRange; i++) {
                const rr = r + rdir * i;
                if (!inBounds(rr, c)) break;
                if (B[rr][c]) break;
                add(rr, c, false, 'rev-forward');
            }
            // Reverse diagonal captures
            for (let i = 1; i <= p.u.diagRange; i++) {
                [[rdir * i, -i], [rdir * i, i]].forEach(([dr, dc]) => {
                    const rr = r + dr, cc = c + dc;
                    if (!inBounds(rr, cc)) return;
                    const occ = B[rr][cc];
                    if (occ && occ.col !== p.col) add(rr, cc, true, 'rev-diag-cap');
                });
            }
            // Optional: allow reverse double-step on first move of reverse? Not specified, so omit.
        }
        if (p.u.sideStep) {
            [[0, -1], [0, 1]].forEach(([dr, dc]) => {
                const rr = r + dr, cc = c + dc;
                if (!inBounds(rr, cc)) return;
                if (!B[rr][cc]) add(rr, cc, false, 'side');
            });
        }
    }

    // Knight
    if (p.t === 'N') {
        const legs = knightLegs(p.u);
        legs.forEach(([a, b]) => {
            [[a, b], [a, -b], [-a, b], [-a, -b], [b, a], [b, -a], [-b, a], [-b, -a]].forEach(([dr, dc]) => {
                add(r + dr, c + dc);
            });
        });
        if (p.u.hasDiag22) {
            [[2, 2], [-2, 2], [2, -2], [-2, -2]].forEach(([dr, dc]) => add(r + dr, c + dc));
        }
    }

    // Bishop
    if (p.t === 'B') {
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => ray(dr, dc));
        if (p.u.orthoFull) {
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => ray(dr, dc));
        } else if (p.u.orthoRange > 0) {
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => ray(dr, dc, p.u.orthoRange, true));
        }
        if (p.u.diagJump) {
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
                const overR = r + dr, overC = c + dc;
                const landR = r + 2 * dr, landC = c + 2 * dc;
                if (!inBounds(landR, landC)) return;
                if (B[overR][overC] && !B[landR][landC]) add(landR, landC, false, 'jump');
            });
        }
    }

    // Rook
    if (p.t === 'R') {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => ray(dr, dc));
        if (p.u.diagFull) {
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => ray(dr, dc));
        } else if (p.u.diagRange > 0) {
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => ray(dr, dc, p.u.diagRange, true));
        }
        if (p.u.charge) {
            const fdr = (p.col === 'w') ? -1 : 1;
            for (let i = 1; i <= 4; i++) {
                const rr = r + fdr * i, cc = c;
                if (!inBounds(rr, cc)) break;
                if (!B[rr][cc]) add(rr, cc, false, 'charge');
            }
        }
    }

    // Queen
    if (p.t === 'Q') {
        [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => ray(dr, dc));
        if (p.u.hasKnight) {
            const Klegs = p.u.extKnight ? [[3, 2]] : [[2, 1]];
            Klegs.forEach(([a, b]) => {
                [[a, b], [a, -b], [-a, b], [-a, -b], [b, a], [b, -a], [-b, a], [-b, -a]].forEach(([dr, dc]) => {
                    add(r + dr, c + dc, false, 'knight');
                });
            });
            if (p.u.knightChain > 0) {
                const visited = new Set([r + ',' + c]);
                const queue = [{ rr: r, cc: c, steps: 0 }];
                const dirs = (p.u.extKnight ? [[3, 2]] : [[2, 1]]).flatMap(([a, b]) => [[a, b], [a, -b], [-a, b], [-a, -b], [b, a], [b, -a], [-b, a], [-b, -a]]);
                const finals = new Map();
                while (queue.length) {
                    const { rr, cc, steps } = queue.shift();
                    if (steps === p.u.knightChain) continue;
                    for (const [dr, dc] of dirs) {
                        const nr = rr + dr, nc = cc + dc;
                        if (!inBounds(nr, nc)) continue;
                        const key = nr + ',' + nc;
                        const occ = state.board[nr][nc];
                        if (occ && occ.col === p.col) continue;
                        if (steps < p.u.knightChain - 1) {
                            if (occ) continue;
                            if (!visited.has(key)) {
                                visited.add(key);
                                queue.push({ rr: nr, cc: nc, steps: steps + 1 });
                                finals.set(key, false);
                            }
                        } else {
                            finals.set(key, !!occ && occ.col !== p.col);
                        }
                    }
                }
                finals.forEach((canCap, key) => {
                    const [nr, nc] = key.split(',').map(Number);
                    if (nr === r && nc === c) return;
                    const occ = state.board[nr][nc];
                    if (occ && occ.col === p.col) return;
                    acc.push({ r: nr, c: nc, capture: !!occ });
                });
            }
        }
    }

    // King
    if (p.t === 'K') {
        const max = p.u.maxStep || 1;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                for (let s = 1; s <= max; s++) {
                    const rr = r + dr * s, cc = c + dc * s;
                    if (!inBounds(rr, cc)) break;
                    const occ = B[rr][cc];
                    if (occ && occ.col === p.col) break;
                    add(rr, cc, !!occ);
                    if (occ) break;
                }
            }
        }
        if (p.u.hasKnight) {
            [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => add(r + dr, c + dc));
        }
    }

    // Dedupe
    const seen = new Set();
    const list = acc.filter(m => { const k = m.r + ',' + m.c; if (seen.has(k)) return false; seen.add(k); return true; });
    // Adjacency immunity filter
    return list.filter(m => !moveIsBlockedByAdjacencyImmunity(state, r, c, m.r, m.c, p));
}
