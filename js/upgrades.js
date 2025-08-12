// Upgrade options and application
import { PIECES } from './state.js';

export function getUpgradeOptions(p) {
    const u = p.u, t = p.t; const opts = [];
    switch (t) {
        case 'P': {
            const fwdNext = u.forwardRange + 1;
            const diagNext = u.diagRange + 1;
            opts.push({ key: 'P_FWD', title: `Extend Forward to ${fwdNext}`, desc: `Increase non-capturing forward range to ${fwdNext} squares.` });
            opts.push({ key: 'P_DIAG', title: `Extend Diagonal Capture to ${diagNext}`, desc: `Increase diagonal capture range to ${diagNext} squares.` });
            opts.push({ key: 'P_SIDE', title: `Side Step`, desc: `Gain the ability to move 1 square sideways (non-capturing).` });
            if (!u.mimic) opts.push({ key: 'P_MIMIC', title: `Mimic Captured`, desc: `After future captures, transform into the piece you capture, gaining all its abilities.` });
            break;
        }
        case 'N': {
            if (!u.hasDiag22) {
                opts.push({ key: 'N_22', title: `Add (2,2) Jump`, desc: `Gain an extra diagonal leap of (2,2).` });
            }
            const nextFlex = (u.knFlex || 0) + 1;
            opts.push({ key: 'N_FLEX', title: `Knight Flex +1`, desc: `Increase L-range flexibility to allow combos like (${2 + nextFlex},1), (${2 + nextFlex - 1},${1 + 1}), … totaling +${nextFlex}.` });
            break;
        }
        case 'B': {
            if (u.orthoRange === 0) opts.push({ key: 'B_ORTHO1', title: `+1 Orthogonal`, desc: `Move 1 square orthogonally.` });
            else if (u.orthoRange > 0 && u.orthoRange < 7) opts.push({ key: 'B_ORTHO_PLUS', title: `Extend Orthogonal +1`, desc: `Increase limited orthogonal range to ${u.orthoRange + 1}.` });
            if (!u.diagJump) opts.push({ key: 'B_JUMP', title: `Diagonal Jump`, desc: `Jump over one piece diagonally (cannot capture).` });
            break;
        }
        case 'R': {
            if (u.diagRange === 0) opts.push({ key: 'R_DIAG1', title: `+1 Diagonal`, desc: `Move 1 square diagonally.` });
            else if (u.diagRange > 0 && u.diagRange < 7) opts.push({ key: 'R_DIAG_PLUS', title: `Extend Diagonal +1`, desc: `Increase limited diagonal range to ${u.diagRange + 1}.` });
            if (!u.charge) opts.push({ key: 'R_CHARGE', title: `Rook Charge`, desc: `Move up to 4 squares forward, jumping over pieces (cannot capture).` });
            break;
        }
        case 'Q': {
            if (!u.hasKnight) opts.push({ key: 'Q_KNIGHT', title: `Add Knight Jump`, desc: `Gain standard knight jumps (2,1).` });
            else if (!u.extKnight) opts.push({ key: 'Q_EXT', title: `Extend Knight Jump (3,2)`, desc: `Knight jump becomes (3,2).` });
            opts.push({ key: 'Q_CHAIN', title: `Increase Knight Chain`, desc: `Chain up to ${Math.min(u.knightChain + 1, 5)} knight jumps per move.` });
            break;
        }
        case 'K': {
            if (u.maxStep < 2) opts.push({ key: 'K_STEP2', title: `2‑Step Movement`, desc: `Move up to 2 squares in any direction.` });
            if (!u.hasKnight) opts.push({ key: 'K_KNIGHT', title: `Add Knight Jump`, desc: `Gain a knight-style (2,1) jump.` });
            if (!u.adjImmunity) opts.push({ key: 'K_IMMUNE', title: `Royal Circle`, desc: `Opponents cannot move to squares adjacent to your King.` });
            break;
        }
    }
    return opts;
}

export function applyUpgrade(p, key) {
    const u = p.u; u.level = (u.level || 0) + 1;
    switch (key) {
        case 'P_FWD': u.forwardRange += 1; break;
        case 'P_DIAG': u.diagRange += 1; break;
        case 'N_22': u.hasDiag22 = true; break;
        case 'N_FLEX': u.knFlex = (u.knFlex || 0) + 1; break;
        case 'B_ORTHO1': u.orthoRange = 1; break;
        case 'B_ORTHO_PLUS': u.orthoRange = Math.min(7, u.orthoRange + 1); break;
        case 'B_ORTHO_FULL': u.orthoFull = true; break;
        case 'R_DIAG1': u.diagRange = 1; break;
        case 'R_DIAG_PLUS': u.diagRange = Math.min(7, u.diagRange + 1); break;
        case 'R_DIAG_FULL': u.diagFull = true; break;
        case 'Q_KNIGHT': u.hasKnight = true; break;
        case 'Q_EXT': u.extKnight = true; break;
        case 'Q_CHAIN': u.knightChain = Math.min(5, u.knightChain + 1); break;
        case 'K_STEP2': u.maxStep = 2; break;
        case 'K_KNIGHT': u.hasKnight = true; break;
        case 'K_IMMUNE': u.adjImmunity = true; break;
        case 'P_SIDE': u.sideStep = true; break;
        case 'P_MIMIC': u.mimic = true; break;
        case 'B_JUMP': u.diagJump = true; break;
        case 'R_CHARGE': u.charge = true; break;
    }
}
