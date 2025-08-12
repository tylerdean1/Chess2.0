// Game state, utilities, and constants
export const PIECES = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };
export const UNICODE = {
    w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
    b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
};

export let BOARD_SIZE = 14; // default 14x14
export const setBoardSize = n => { BOARD_SIZE = n; };
export const inBounds = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
export const filesStr = 'abcdefghijklmnopqrstuvwxyz';
export const algebra = (r, c) => filesStr[c] + (BOARD_SIZE - r);
export const fromAlg = a => {
    const file = filesStr.indexOf(a[0]);
    const rank = BOARD_SIZE - parseInt(a.slice(1), 10);
    return [rank, file];
};

export const clone = obj => structuredClone(obj);
export const colorName = c => c === 'w' ? 'White' : 'Black';

export function baseUpgrades(type) {
    switch (type) {
        case 'P': return { level: 0, bank: 0, forwardRange: 1, diagRange: 1, sideStep: false, reverse: false, mimic: false };
        case 'N': return { level: 0, bank: 0, longLeg: 2, shortLeg: 1, hasDiag22: false, knFlex: 0 };
        case 'B': return { level: 0, bank: 0, orthoRange: 0, orthoFull: false, diagJump: false };
        case 'R': return { level: 0, bank: 0, diagRange: 0, diagFull: false, charge: false };
        case 'Q': return { level: 0, bank: 0, hasKnight: false, extKnight: false, knightChain: 0, adjImmunity: false };
        case 'K': return { level: 0, bank: 0, maxStep: 1, hasKnight: false, adjImmunity: false };
    }
}

export function initial(N = BOARD_SIZE) {
    const board = Array.from({ length: N }, () => Array(N).fill(null));
    const order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    const offset = Math.floor((N - order.length) / 2);
    for (let c = 0; c < N; c++) {
        // Place pawns: inner files only, with special case to move files c and l (2 and N-3) to base rows
        const innerFile = c >= 2 && c <= N - 3;
        const isC = c === 2; // 'c' file
        const isL = c === (N - 3); // 'l' file on 14x14
        if (innerFile) {
            if (isC || isL) {
                // Move these pawns to base rows to surround the royal house
                if (!board[0][c]) board[0][c] = { t: 'P', col: 'b', u: baseUpgrades('P'), moved: false };
                if (!board[N - 1][c]) board[N - 1][c] = { t: 'P', col: 'w', u: baseUpgrades('P'), moved: false };
            } else {
                board[1][c] = { t: 'P', col: 'b', u: baseUpgrades('P'), moved: false };
                board[N - 2][c] = { t: 'P', col: 'w', u: baseUpgrades('P'), moved: false };
            }
        }
        const oIdx = c - offset;
        if (oIdx >= 0 && oIdx < order.length) {
            board[0][c] = { t: order[oIdx], col: 'b', u: baseUpgrades(order[oIdx]), moved: false };
            board[N - 1][c] = { t: order[oIdx], col: 'w', u: baseUpgrades(order[oIdx]), moved: false };
        }
    }
    // Removed extra pawns adjacent to rooks per user request
    return {
        board, turn: 'w', selected: null, moves: [], lastMove: null, pendingUpgrade: null, winner: null,
        pendingShield: null, shielded: null
    };
}

export function findPieces(state, pred) {
    const arr = [];
    for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
        const p = state.board[r][c];
        if (p && pred(p)) arr.push({ r, c, p });
    }
    return arr;
}
