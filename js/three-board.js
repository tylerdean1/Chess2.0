// Minimal 3D board/pieces using Three.js (CDN module). Exposes init/update/dispose.
// This is a self-contained module to keep UI logic decoupled.

let THREE;
let OBJLoader, MTLLoader;
let OrbitControls;
let scene, camera, renderer, raycaster, mouse;
let controls;
let boardGroup, piecesGroup, highlightGroup;
let anim = null; // current animation state
let lastAnimSig = null; // dedupe consecutive animations
let containerEl;
let boardSize = 14; // will be reset from state
let callbacks = { onSquareClick: null };
let lastStateRef = null; // keep last state so we can refresh pieces after async loads
let baseCameraDistance = 0; // for zoom limits

// Asset cache: store loaded templates by type ('P','R','N','B','Q','K')
const modelCache = new Map(); // type => Promise<{template: THREE.Group, desiredHeight:number}>

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

// ---- Primitive fallback meshes (used until assets load) ----
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

// Attempt to create a mesh from the loaded asset; if not yet loaded, return primitive fallback and trigger load.
function meshForPiece(p) {
    const t = p.t; const col = p.col; const lv = p.u?.level || 0;
    const asset = cloneAssetIfReady(t, col, lv);
    if (asset) return asset;
    // Trigger load in background and return fallback
    ensurePieceModel(t).then(() => {
        // Once loaded, refresh pieces if we still have a state
        if (lastStateRef) rebuildPieces(lastStateRef);
    });
    switch (t) {
        case 'P': return meshPawn(col, lv);
        case 'R': return meshRook(col, lv);
        case 'N': return meshKnight(col, lv);
        case 'B': return meshBishop(col, lv);
        case 'Q': return meshQueen(col, lv);
        case 'K': return meshKing(col, lv);
    }
}

function cloneAssetIfReady(type, col, level) {
    const rec = modelCache.get(type);
    if (!rec || !rec.__ready) return null;
    const template = rec.template.clone(true);
    // Preserve provided materials/textures; optional: add light emissive sheen without changing base albedo
    if (level > 0) {
        template.traverse((obj) => {
            if (obj.isMesh && obj.material && obj.material.emissive) {
                obj.material.emissive.set(level >= 3 ? 0xffd166 : level === 2 ? 0x2be1a7 : 0x7c9cff);
                obj.material.emissiveIntensity = level >= 3 ? 0.12 : 0.08;
            }
        });
    }
    return template;
}

function normalizeModel(group, desiredHeight = 1.1) {
    // Scale to target height
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3(); box.getSize(size);
    if (size.y > 0) {
        const scale = desiredHeight / size.y;
        group.scale.setScalar(scale);
    }
    // Compute offsets and wrap so we can place the outer group freely later
    const box2 = new THREE.Box3().setFromObject(group);
    const min = new THREE.Vector3(); box2.getMin(min);
    const center = new THREE.Vector3(); box2.getCenter(center);
    const wrapper = new THREE.Group();
    // Lift to tile top (tile is 0.06 tall centered at 0, so top is y=0.03) and center X/Z by applying offsets to the inner model
    group.position.set(-center.x, (0.03 - min.y), -center.z);
    wrapper.add(group);
    return wrapper;
}

function assetInfo(type) {
    switch (type) {
        case 'P': return {
            dir: 'assets/working_pieces/pawn/',
            obj: 'Pawn_Side_A_V2_L3.obj',
            mtl: 'Pawn_Side_A_V2_L3.mtl',
            height: 1.0
        };
        case 'R': return {
            dir: 'assets/working_pieces/rook/',
            obj: 'Rook_Side_A_V2_l1.obj',
            mtl: 'Rook_Side_A_V2_l1.mtl',
            height: 1.05
        };
        case 'N': return {
            dir: 'assets/working_pieces/knight/',
            obj: 'Knight_Side_A_v2_l1.obj',
            mtl: 'Knight_Side_A_v2_l1.mtl',
            height: 1.05
        };
        case 'B': return {
            dir: 'assets/working_pieces/bishop/',
            obj: 'Bishop_V2_l1.obj',
            mtl: 'Bishop_V2_l1.mtl',
            height: 1.1
        };
        case 'Q': return {
            dir: 'assets/working_pieces/queen/',
            obj: 'Queen_Side_A_V2_l1.obj',
            mtl: 'Queen_Side_A_V2_l1.mtl',
            height: 1.2
        };
        case 'K': return {
            dir: 'assets/working_pieces/king/',
            obj: 'King_Side_A_V2_l1.obj',
            mtl: 'King_Side_A_V2_l1.mtl',
            height: 1.28
        };
    }
    return null;
}

async function ensureLoaders() {
    if (OBJLoader && MTLLoader) return;
    const modMTL = await import('https://unpkg.com/three@0.158.0/examples/jsm/loaders/MTLLoader.js');
    const modOBJ = await import('https://unpkg.com/three@0.158.0/examples/jsm/loaders/OBJLoader.js');
    MTLLoader = modMTL.MTLLoader;
    OBJLoader = modOBJ.OBJLoader;
}

async function ensurePieceModel(type) {
    if (modelCache.has(type)) return modelCache.get(type);
    const info = assetInfo(type);
    if (!info) return Promise.resolve(null);
    const promise = (async () => {
        await ensureLoaders();
        // Load MTL first
        const mtlLoader = new MTLLoader();
        mtlLoader.setMaterialOptions({ side: THREE.FrontSide });
        mtlLoader.setResourcePath(info.dir);
        mtlLoader.setPath(info.dir);
        const materials = await mtlLoader.loadAsync(info.mtl);
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(info.dir);
        const group = await objLoader.loadAsync(info.obj);
        // Normalize scale and origin into a wrapper
        const template = normalizeModel(group, info.height);
        return { template, desiredHeight: info.height };
    })();
    // Track readiness to allow clone without awaiting then-chains repeatedly
    promise.then((rec) => { promise.__ready = true; Object.assign(promise, rec); }).catch(() => { /* noop */ });
    modelCache.set(type, promise);
    return promise;
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
    lastStateRef = state;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 800;
    setupPerspectiveCamera(w, h);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    // Ensure textures look correct
    try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch { try { renderer.outputEncoding = THREE.sRGBEncoding; } catch { } }
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(6, 10, 4);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.25);
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

    // Controls and mouse events
    await ensureControls();
    setupControls();
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
    updatePerspectiveCamera(w, h);
    renderer.setSize(w, h);
    controls && controls.update();
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
    lastStateRef = state;
    rebuildPieces(state);
    updateHighlights(state);
    // Attempt to animate the last move (ghost tween)
    maybeStartMoveAnim(state);
}

function rebuildPieces(state) {
    if (!piecesGroup) return;
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
    updateHighlights(state);
}

function animate() {
    requestAnimationFrame(animate);
    // Advance animation if active
    if (anim) {
        const now = performance.now();
        const t = Math.min(1, (now - anim.start) / anim.duration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        anim.ghost.position.x = anim.from.x + (anim.to.x - anim.from.x) * ease;
        anim.ghost.position.z = anim.from.z + (anim.to.z - anim.from.z) * ease;
        // subtle arc
        anim.ghost.position.y = 0.0 + Math.sin(Math.PI * ease) * 0.25;
        if (t >= 1) {
            // finish
            if (anim.target) anim.target.visible = true;
            if (highlightGroup && anim.ghost) highlightGroup.remove(anim.ghost);
            anim = null;
        }
    }
    controls && controls.update();
    renderer && renderer.render(scene, camera);
}

export function dispose3D() {
    try {
        renderer.domElement.removeEventListener('mousemove', onMove);
        renderer.domElement.removeEventListener('click', onClick);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('keydown', onShiftToggle);
        window.removeEventListener('keyup', onShiftToggle);
    } catch { }
    if (controls) { try { controls.dispose(); } catch { } controls = null; }
    renderer && renderer.dispose();
    scene = camera = renderer = null;
}

// ---- Camera helpers (top-down orthographic, board-aligned) ----
function boardWorldHalfSpan() {
    const spacing = tileSize + tileGap;
    const full = spacing * (boardSize - 1) + tileSize;
    // small margin
    return full * 0.55; // 10% margin around (0.5 on each side approx)
}

// ---- 45° Perspective camera (angled "straight on") ----
function setupPerspectiveCamera(w, h) {
    const aspect = Math.max(0.1, (w || 1) / (h || 1));
    const fov = 45; // vertical FOV
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
    positionAngleCamera(fov, aspect);
}

function updatePerspectiveCamera(w, h) {
    if (!camera || !camera.isPerspectiveCamera) return setupPerspectiveCamera(w, h);
    camera.aspect = Math.max(0.1, (w || 1) / (h || 1));
    positionAngleCamera(camera.fov, camera.aspect);
    camera.updateProjectionMatrix();
}

function positionAngleCamera(fov, aspect) {
    const half = boardWorldHalfSpan();
    // Fit a circle that bounds the board, then compute a distance for 45° pitch
    const radius = half * Math.SQRT2; // diagonal half-span
    const fovRad = THREE.MathUtils.degToRad(fov);
    const distForFit = radius / Math.tan(fovRad / 2);
    const tilt = Math.PI / 4; // 45° down tilt
    const dist = distForFit * 1.1; // add margin
    const y = Math.sin(tilt) * dist;
    const z = Math.cos(tilt) * dist;
    camera.position.set(0, y, z);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    baseCameraDistance = dist;
}

async function ensureControls() {
    if (OrbitControls) return;
    const mod = await import('https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js');
    OrbitControls = mod.OrbitControls;
}

function setupControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Allow rotate; we'll map it to middle-drag
    controls.enableRotate = true;
    controls.screenSpacePanning = true;
    controls.minDistance = Math.max(1, baseCameraDistance * 0.55);
    controls.maxDistance = baseCameraDistance * 3.0;
    controls.zoomSpeed = 0.7;
    controls.panSpeed = 0.7;
    controls.target.set(0, 0, 0);
    // Map: middle = rotate (default); Shift+middle = pan
    try {
        controls.mouseButtons = { LEFT: THREE.MOUSE.NONE, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.NONE };
        controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    } catch { }
    controls.update();
    // Clamp pan within board bounds
    controls.addEventListener('change', clampPanWithinBounds);
    // Toggle middle button action when Shift is held
    window.addEventListener('keydown', onShiftToggle, { passive: true });
    window.addEventListener('keyup', onShiftToggle, { passive: true });
}

function clampPanWithinBounds() {
    if (!controls) return;
    const half = boardWorldHalfSpan();
    const bound = half * 0.95; // keep a small margin
    const t = controls.target;
    const ox = t.x, oz = t.z;
    t.x = Math.max(-bound, Math.min(bound, t.x));
    t.z = Math.max(-bound, Math.min(bound, t.z));
    if (t.x !== ox || t.z !== oz) {
        // shift camera position by same delta to preserve view offset
        const dx = t.x - ox;
        const dz = t.z - oz;
        camera.position.x += dx;
        camera.position.z += dz;
    }
}

let shiftPanMode = false;
function onShiftToggle(e) {
    if (!controls) return;
    const isDown = e.type === 'keydown';
    if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
        if (shiftPanMode !== isDown) {
            shiftPanMode = isDown;
            try {
                controls.mouseButtons.MIDDLE = isDown ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
            } catch { }
        }
    }
}

// ---- Highlights ----
function updateHighlights(state) {
    if (!highlightGroup) return;
    highlightGroup.clear();
    // Helper creators
    const makeSquare = (color, alpha = 0.28) => {
        const geo = new THREE.PlaneGeometry(tileSize * 0.96, tileSize * 0.96);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, depthWrite: false, depthTest: false });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2; // lay flat
        m.position.y = 0.065;
        return m;
    };
    const makeRing = (color, alpha = 0.95) => {
        const geo = new THREE.RingGeometry(tileSize * 0.24, tileSize * 0.44, 32);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, depthWrite: false, depthTest: false });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.y = 0.07;
        return m;
    };
    function placeAt(m, r, c) { const { x, z } = worldPos(r, c); m.position.x = x; m.position.z = z; highlightGroup.add(m); }

    // Last move from/to
    if (state.lastMove) {
        const [fr, fc] = state.lastMove.from; const [tr, tc] = state.lastMove.to;
        placeAt(makeSquare(0xffd166, 0.18), fr, fc);
        placeAt(makeSquare(0xffd166, 0.26), tr, tc);
    }
    // Selected source
    if (state.selected) {
        placeAt(makeSquare(0x7c9cff, 0.22), state.selected.r, state.selected.c);
    }
    // Moves for selected
    if (state.moves && state.moves.length) {
        for (const m of state.moves) {
            const c = m.capture ? 0xff6b6b : 0x2be1a7;
            placeAt(makeRing(c, 0.9), m.r, m.c);
        }
    }
    // Shielded piece
    if (state.shielded) {
        placeAt(makeRing(0x88c0ff, 0.95), state.shielded.r, state.shielded.c);
    }
}

// ---- Move animation (ghost tween) ----
function maybeStartMoveAnim(state) {
    const mv = state.lastMove;
    if (!mv) return;
    const sig = `${mv.from[0]},${mv.from[1]}->${mv.to[0]},${mv.to[1]}#${mv.piece?.col || ''}`;
    if (sig === lastAnimSig) return;
    lastAnimSig = sig;
    // Find the target mesh at destination to hide during tween
    let target = null;
    for (const child of piecesGroup.children) {
        if (child.userData && child.userData.r === mv.to[0] && child.userData.c === mv.to[1]) { target = child; break; }
    }
    if (!target) return;
    const p = state.board[mv.to[0]][mv.to[1]];
    if (!p) return;
    const ghost = meshForPiece(p);
    const s = target.scale?.x || 1; ghost.scale.setScalar(s);
    const from = worldPos(mv.from[0], mv.from[1]);
    const to = worldPos(mv.to[0], mv.to[1]);
    ghost.position.set(from.x, 0.0, from.z);
    if (highlightGroup) highlightGroup.add(ghost);
    if (target) target.visible = false;
    anim = { start: performance.now(), duration: 320, from, to, ghost, target };
}
