// SVG piece rendering with 3D token look and tier-based embellishments
const NS = 'http://www.w3.org/2000/svg';

export function buildPieceEl(piece) {
    const tier = Math.max(0, piece?.u?.level || 0);
    const team = piece.col === 'w' ? 'team-w' : 'team-b';
    const ptype = piece.t; // K,Q,R,B,N,P

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', `piece-svg ${team} tier-${tier}`);
    svg.setAttribute('aria-hidden', 'true');

    // Defs: radial and linear gradients for 3D coin effect
    const defs = document.createElementNS(NS, 'defs');
    const gradId = `g-${team}`;
    const rg = document.createElementNS(NS, 'radialGradient');
    rg.setAttribute('id', gradId);
    rg.setAttribute('cx', '35%');
    rg.setAttribute('cy', '30%');
    rg.setAttribute('r', '70%');
    const stops = [
        ['0%', 'var(--coin-spec)'],
        ['65%', 'var(--coin-mid)'],
        ['100%', 'var(--coin-edge)']
    ];
    for (const [o, c] of stops) {
        const st = document.createElementNS(NS, 'stop');
        st.setAttribute('offset', o); st.setAttribute('stop-color', c); rg.appendChild(st);
    }
    defs.appendChild(rg);
    // Piece body gradient
    const lg = document.createElementNS(NS, 'linearGradient');
    const bodyId = `p-${team}`;
    lg.setAttribute('id', bodyId);
    lg.setAttribute('x1', '0%'); lg.setAttribute('y1', '0%');
    lg.setAttribute('x2', '0%'); lg.setAttribute('y2', '100%');
    const bStops = [
        ['0%', 'var(--piece-spec)'], ['60%', 'var(--piece-mid)'], ['100%', 'var(--piece-deep)']
    ];
    for (const [o, c] of bStops) {
        const st = document.createElementNS(NS, 'stop');
        st.setAttribute('offset', o); st.setAttribute('stop-color', c); lg.appendChild(st);
    }
    defs.appendChild(lg);

    // Outer rim
    const rim = document.createElementNS(NS, 'circle');
    rim.setAttribute('cx', '50'); rim.setAttribute('cy', '50'); rim.setAttribute('r', '46');
    rim.setAttribute('fill', 'url(#' + gradId + ')');
    rim.setAttribute('class', 'rim');

    // Inner bevel
    const inner = document.createElementNS(NS, 'circle');
    inner.setAttribute('cx', '50'); inner.setAttribute('cy', '50'); inner.setAttribute('r', '36');
    inner.setAttribute('class', 'inner');

    // Tier rings (aura)
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('cx', '50'); ring.setAttribute('cy', '50'); ring.setAttribute('r', '42');
    ring.setAttribute('class', 'ring');

    // Piece body
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'body');
    g.setAttribute('fill', `url(#${bodyId})`);
    g.setAttribute('stroke', 'rgba(0,0,0,.45)');
    g.setAttribute('stroke-width', '1');

    // Base shadow ellipse
    const base = document.createElementNS(NS, 'ellipse');
    base.setAttribute('cx', '50'); base.setAttribute('cy', '78'); base.setAttribute('rx', '26'); base.setAttribute('ry', '8');
    base.setAttribute('class', 'base');

    // Simple silhouettes per piece
    function makePath(d) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); return p; }
    function makeRect(x, y, w, h, rx = 3) { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('rx', rx); return r; }
    function makeCircle(cx, cy, r) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r); return c; }

    if (ptype === 'P') {
        g.appendChild(makeRect(44, 46, 12, 22, 4));
        g.appendChild(makeCircle(50, 40, 8));
        g.appendChild(makeRect(38, 68, 24, 6, 2));
    } else if (ptype === 'R') {
        g.appendChild(makeRect(38, 30, 24, 30, 2));
        // crenellations
        g.appendChild(makeRect(36, 24, 6, 6, 1));
        g.appendChild(makeRect(46, 24, 8, 6, 1));
        g.appendChild(makeRect(60, 24, 6, 6, 1));
        g.appendChild(makeRect(34, 62, 32, 6, 2));
    } else if (ptype === 'N') {
        // stylized horse head
        const d = 'M36,62 C38,48 50,36 60,34 58,40 61,44 64,46 60,46 56,48 54,52 52,56 48,60 44,62 Z';
        g.appendChild(makePath(d));
        g.appendChild(makeRect(34, 64, 32, 6, 2));
    } else if (ptype === 'B') {
        // bishop mitre
        const d = 'M50,26 C42,32 40,44 50,56 C60,44 58,32 50,26 Z';
        g.appendChild(makePath(d));
        g.appendChild(makeRect(44, 56, 12, 6, 2));
        g.appendChild(makeRect(40, 62, 20, 6, 2));
    } else if (ptype === 'Q') {
        // crown
        const d = 'M36,54 L42,36 L50,50 L58,36 L64,54 Z';
        g.appendChild(makePath(d));
        g.appendChild(makeRect(40, 54, 20, 6, 2));
        g.appendChild(makeRect(36, 60, 28, 6, 2));
    } else if (ptype === 'K') {
        // cross + crown
        g.appendChild(makeRect(48, 26, 4, 10, 1));
        g.appendChild(makeRect(44, 30, 12, 4, 1));
        g.appendChild(makeRect(40, 36, 20, 6, 2));
        g.appendChild(makeRect(38, 42, 24, 6, 2));
        g.appendChild(makeRect(36, 50, 28, 6, 2));
    }

    // Subtle top specular highlight
    const sp = document.createElementNS(NS, 'ellipse');
    sp.setAttribute('cx', '36'); sp.setAttribute('cy', '28'); sp.setAttribute('rx', '18'); sp.setAttribute('ry', '10');
    sp.setAttribute('class', 'spec');

    svg.appendChild(defs);
    svg.appendChild(rim);
    svg.appendChild(inner);
    svg.appendChild(ring);
    svg.appendChild(g);
    svg.appendChild(sp);

    // Tier ornaments: add small chevrons depending on level
    const chevrons = Math.min(3, tier);
    for (let i = 0; i < chevrons; i++) {
        const y = 78 + i * 2;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M35 ${y} L50 ${y - 5} L65 ${y}`);
        path.setAttribute('class', 'chev');
        svg.appendChild(path);
    }

    return svg;
}
