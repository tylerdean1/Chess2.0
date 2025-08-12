// SVG piece rendering with 3D token look and tier-based embellishments
const NS = 'http://www.w3.org/2000/svg';

export function buildPieceEl(piece) {
    const tier = Math.max(0, piece?.u?.level || 0);
    const team = piece.col === 'w' ? 'team-w' : 'team-b';
    const label = piece.t; // K,Q,R,B,N,P

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

    // Center glyph (letter)
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', '50'); text.setAttribute('y', '60');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', `glyph glyph-${label}`);
    text.textContent = label;

    // Subtle top specular highlight
    const sp = document.createElementNS(NS, 'ellipse');
    sp.setAttribute('cx', '36'); sp.setAttribute('cy', '28'); sp.setAttribute('rx', '18'); sp.setAttribute('ry', '10');
    sp.setAttribute('class', 'spec');

    svg.appendChild(defs);
    svg.appendChild(rim);
    svg.appendChild(inner);
    svg.appendChild(ring);
    svg.appendChild(text);
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
