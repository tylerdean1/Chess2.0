// Minimal 3D board/pieces using Three.js (CDN module). Exposes init/update/dispose.
// This is a self-contained module to keep UI logic decoupled.

let THREE;
let scene, camera, renderer, raycaster, mouse;
let boardGroup, piecesGroup, highlightGroup;
let containerEl;
let boardSize = 14; // will be reset from state
let callbacks = { onSquareClick: null };

const tileSize = 1; // world units per square
const tileGap = 0.02; // small gap for grid lines

function worldPos(r, c) {
    const half = (boardSize - 1) / 2;
    return { x: (c - half) * (tileSize + tileGap), z: (r - half) * (tileSize + tileGap) };
}

function makeTileMaterial(light) {
    return new THREE.MeshStandardMaterial({ color: light ? 0x9ea9bd : 0x55617a, metalness: 0.5, roughness: 0.6 });
}

function makePieceMaterial(col, level) {
    const base = col === 'w' ? 0xd7dbe6 : 0x3a4158;
    const mat = new THREE.MeshStandardMaterial({ color: base, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.0 });
    if (level > 0) {
        mat.emissive = new THREE.Color(level >= 3 ? 0xffd166 : level === 2 ? 0x2be1a7 : 0x7c9cff);
        mat.emissiveIntensity = level >= 3 ? 0.25 : 0.15;
    }
    return mat;
}

function meshPawn(col, level) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 24), makePieceMaterial(col, level));
    body.position.y = 0.25;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), makePieceMaterial(col, level));
    head.position.y = 0.62;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 32), makePieceMaterial(col, level));
    base.position.y = 0.06;
    g.add(base, body, head);
    return g;
}

function meshRook(col, level) {
    const g = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 24), makePieceMaterial(col, level));
    tower.position.y = 0.35;
    const crenel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12), makePieceMaterial(col, level));
    crenel.position.y = 0.75;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 32), makePieceMaterial(col, level));
    base.position.y = 0.06;
    g.add(base, tower, crenel);
    return g;
}

function meshBishop(col, level) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 24), makePieceMaterial(col, level));
    body.position.y = 0.35;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), makePieceMaterial(col, level));
    cap.position.y = 0.7;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 32), makePieceMaterial(col, level));
    base.position.y = 0.06;
    g.add(base, body, cap);
    return g;
}

function meshKnight(col, level) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 32), makePieceMaterial(col, level));
    base.position.y = 0.06;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.4, 18), makePieceMaterial(col, level));
    chest.position.y = 0.32;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 12), makePieceMaterial(col, level));
    neck.position.y = 0.54;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 16), makePieceMaterial(col, level));
    head.position.y = 0.74; head.rotation.z = Math.PI * -0.15;
    g.add(base, chest, neck, head);
    return g;
}

function meshQueen(col, level) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 32), makePieceMaterial(col, level));
    base.position.y = 0.06;
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.6, 24), makePieceMaterial(col, level));
    skirt.position.y = 0.36;
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.25, 18), makePieceMaterial(col, level));
    mid.position.y = 0.68;
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 12, 24), makePieceMaterial(col, level));
    crown.position.y = 0.9; crown.rotation.x = Math.PI / 2;
    g.add(base, skirt, mid, crown);
    return g;
}

function meshKing(col, level) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 32), makePieceMaterial(col, level));
    base.position.y = 0.06;
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.62, 24), makePieceMaterial(col, level));
    skirt.position.y = 0.36;
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.28, 18), makePieceMaterial(col, level));
    mid.position.y = 0.7;
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), makePieceMaterial(col, level));
    crossV.position.y = 1.0;
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), makePieceMaterial(col, level));
    crossH.position.y = 0.98;
    g.add(base, skirt, mid, crossV, crossH);
    return g;
}

function meshForPiece(p) {
    const t = p.t; const col = p.col; const lv = p.u?.level || 0;
    switch (t) {
        case 'P': return meshPawn(col, lv);
        case 'R': return meshRook(col, lv);
        case 'N': return meshKnight(col, lv);
        case 'B': return meshBishop(col, lv);
        case 'Q': return meshQueen(col, lv);
        case 'K': return meshKing(col, lv);
    }
}

async function ensureThree() {
    if (THREE) return;
    THREE = await import('https://unpkg.com/three@0.158.0/build/three.module.js');
}

export async function init3D(container, state, cb = {}) {
    await ensureThree();
    callbacks = { ...callbacks, ...cb };
    containerEl = container;
    boardSize = state.board.length;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 800;
    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    // Position to see the whole board; distance scales with board size
    const dist = Math.max(10, boardSize * 0.9);
    camera.position.set(dist * 0.55, dist, dist * 0.55);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(6, 10, 4);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.3);
    rim.position.set(-6, 8, -6);
    scene.add(rim);

    // Board and groups
    boardGroup = new THREE.Group();
    piecesGroup = new THREE.Group();
    highlightGroup = new THREE.Group();
    scene.add(boardGroup);
    scene.add(piecesGroup);
    scene.add(highlightGroup);

    // Build tiles
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const geo = new THREE.BoxGeometry(tileSize, 0.06, tileSize);
            const mat = makeTileMaterial((r + c) % 2 === 0);
            const tile = new THREE.Mesh(geo, mat);
            const { x, z } = worldPos(r, c);
            tile.position.set(x, 0, z);
            tile.userData = { r, c, tile: true };
            boardGroup.add(tile);
        }
    }

    // Mouse events
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    animate();
    update3D(state);
}

function onResize() {
    if (!renderer || !camera || !containerEl) return;
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    camera.aspect = (w || 1) / (h || 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function onMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function onClick(e) {
    if (!callbacks.onSquareClick) return;
    const tile = pickTile();
    if (tile) callbacks.onSquareClick(tile.userData.r, tile.userData.c);
}

function pickTile() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boardGroup.children, false);
    return intersects.length ? intersects[0].object : null;
}

export function update3D(state) {
    boardSize = state.board.length;
    // Rebuild pieces if needed
    piecesGroup.clear();
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const p = state.board[r][c];
            if (!p) continue;
            const m = meshForPiece(p);
            const { x, z } = worldPos(r, c);
            m.position.set(x, 0, z);
            m.userData = { r, c };
            // Slight scale up per level to feel stronger
            const s = 1 + Math.min(0.12, (p.u?.level || 0) * 0.03);
            m.scale.setScalar(s);
            piecesGroup.add(m);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer && renderer.render(scene, camera);
}

export function dispose3D() {
    try {
        renderer.domElement.removeEventListener('mousemove', onMove);
        renderer.domElement.removeEventListener('click', onClick);
        window.removeEventListener('resize', onResize);
    } catch { }
    renderer && renderer.dispose();
    scene = camera = renderer = null;
}
