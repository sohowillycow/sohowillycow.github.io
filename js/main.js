/* =========  main.js  ========= */

document.addEventListener('DOMContentLoaded', () => {
    /* ------------------------------------------------------------------
       🛰️  UI helpers (hamburger, lang‑switch, etc.)
       ------------------------------------------------------------------ */
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            hamburger.classList.toggle('toggle');
            links.forEach((link, idx) => {
                link.style.animation = link.style.animation ? ''
                    : `navLinkFade 0.5s ease forwards ${idx / 7 + 0.3}s`;
            });
        });
    }

    /* ------------------------------------------------------------------
       🌐  language persistence (en  / zh‑TW)
       ------------------------------------------------------------------ */
    const langSwitchLinks = document.querySelectorAll('.lang-switch a');
    const currentPath = window.location.pathname.split('/').pop();
    const currentLang = document.documentElement.lang;

    function switchToLanguage(targetLang) {
        let newPath;
        if (targetLang === 'zh-TW' || targetLang === 'zh') {
            if (!currentPath.includes('-zh.html')) {
                newPath = currentPath.replace('.html', '-zh.html');
                if (currentPath === '' || currentPath === 'index.html') newPath = 'index-zh.html';
            } else {
                newPath = currentPath;
            }
        } else {
            if (currentPath.includes('-zh.html')) {
                newPath = currentPath.replace('-zh.html', '.html');
                if (newPath === 'index-zh.html') newPath = 'index.html';
            } else {
                newPath = currentPath;
            }
        }
        if (!newPath || newPath === '-zh.html') newPath = 'index-zh.html';
        if (!newPath || newPath === '.html') newPath = 'index.html';
        if (newPath !== currentPath) window.location.href = newPath;
    }

    langSwitchLinks.forEach(link => {
        link.classList.toggle('active-lang', link.dataset.lang === currentLang.substring(0, 2));
        link.addEventListener('click', e => {
            e.preventDefault();
            const sel = link.dataset.lang;
            localStorage.setItem('preferredLang', sel);
            switchToLanguage(sel === 'zh' ? 'zh-TW' : 'en');
        });
    });

    const prefLang = localStorage.getItem('preferredLang');
    if (prefLang && prefLang !== currentLang.substring(0, 2)) {
        if (prefLang === 'zh' && !currentPath.includes('-zh.html')) switchToLanguage('zh-TW');
        if (prefLang === 'en' && currentPath.includes('-zh.html')) switchToLanguage('en');
    }

    /* ------------------------------------------------------------------
       🌍  THREE.js DIGITAL EARTH INITIALISATION
       ------------------------------------------------------------------ */
    const container = document.getElementById('digital-earth-container');
    const earthRadius = 0.85;

    let scene, camera, renderer, composer, earthGroup;
    const clock = new THREE.Clock();

    /* ----------------  MinPriorityQueue Implementation ---------------- */
    // Simple MinPriorityQueue for Dijkstra, as suggested by change.md
    class MinPriorityQueue {
        constructor(options = {}) {
            this._priority = options.priority || (x => x); // 取「數值」的函式 (change02.md L49)
            this._elements = [];
        }

        enqueue(element) {
            this._elements.push(element);
            // 使用 _priority 進行排序 (change02.md L51)
            this._elements.sort((a, b) => this._priority(a) - this._priority(b));
        }

        dequeue() {
            if (this.isEmpty()) {
                return undefined;
            }
            return this._elements.shift();
        }

        isEmpty() {
            return this._elements.length === 0;
        }

        get size() {
            return this._elements.length;
        }
    }

    /* ----------------  Graph Building Function ---------------- */
    // As per change.md
    function buildGraph(geo) {
        const n = geo.attributes.position.count;
        const adj = Array.from({ length: n }, () => new Set());

        if (geo.index) { // Important: Check if geometry is indexed
            const idx = geo.index.array;
            for (let i = 0; i < idx.length; i += 3) {
                const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]];
                adj[a].add(b).add(c);
                adj[b].add(a).add(c);
                adj[c].add(a).add(b);
            }
        } else {
            // Fallback for non-indexed geometries (though IcosahedronGeometry is indexed)
            // This part would need a more complex way to determine adjacency
            // based on vertex proximity if geo.index is null.
            // For IcosahedronGeometry, geo.index should exist.
            console.warn("Geometry is not indexed, graph construction might be incomplete or incorrect.");
        }
        return adj.map(set => [...set]); // → Array<number[]>
    }


    /* ----------------  common vertex / fragment shaders ---------------- */

    const tubeVS = /* glsl */`
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `;

    const tubeFS = /* glsl */`
        varying vec2 vUv;
        uniform vec3  uColor;
        uniform float uHeadProgress;
        uniform float uTrailLength;
        void main(){
            float start = uHeadProgress - uTrailLength;
            float alpha = smoothstep(start, start+0.05, vUv.x) * (1. - smoothstep(uHeadProgress-0.05, uHeadProgress, vUv.x));
            alpha *= step(0., vUv.x) * step(vUv.x, uHeadProgress);
            if(uHeadProgress < uTrailLength) alpha *= smoothstep(0., start+uTrailLength, vUv.x);
            if(alpha < 0.01) discard;
            float headGlow = smoothstep(uHeadProgress-0.05, uHeadProgress, vUv.x)*0.5;
            gl_FragColor = vec4(uColor, alpha*0.85 + headGlow*0.5);
        }
    `;

    const particleVS = /* glsl */`
        varying vec3 vN,vP;
        void main(){ vec4 mv= modelViewMatrix*vec4(position,1.); vP=mv.xyz; vN=normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }
    `;

    const particleFS = /* glsl */`
        varying vec3 vN,vP; uniform vec3 uColor; uniform float uFresnel, uSharp;
        void main(){ vec3 V = normalize(-vP); float fres = 1.-clamp(dot(V,vN),0.,1.); float f = pow(fres,uFresnel); float core = pow(clamp(dot(V,vN),0.,1.),uSharp);
            float a = clamp(core*0.7 + f*0.8,0.,1.); if(a<0.01) discard; gl_FragColor = vec4(uColor,a); }
    `;

    const trailSegVS = /* glsl */`
        attribute float aProgress; varying float vP; void main(){ vP=aProgress; gl_Position = projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }
    `;

    const trailSegFS = /* glsl */`
        varying float vP; uniform vec3 uColor; uniform float uBase;
        void main(){ float a = uBase*(1.-vP); if(a<0.01) discard; gl_FragColor = vec4(uColor,a); }
    `;

    const NUM_TRAIL_SEGMENTS = 8;

    /* ------------------------------------------------------------------
       ⚔️  ArcSystem – handles creation / update of attack beams
       ------------------------------------------------------------------ */

    class ArcSystem {
        constructor(group, nodeGeo, attackColors, graph) { // ★ graph is already passed due to previous diff
            this.host = group;      // earthGroup
            this.nodeGeo = nodeGeo; // This is baseGeo from init
            this.colors = attackColors;
            this.graph = graph;                            // ★ Store graph
            this.activeArcs = [];
            this.frameCount = 0;
            // shared geometries / materials
            this.trailGeo = new THREE.SphereGeometry(0.008, 5, 5);
            this.trailMat = new THREE.ShaderMaterial({
                vertexShader: trailSegVS,
                fragmentShader: trailSegFS,
                transparent: true, depthWrite: false,
                blending: THREE.AdditiveBlending,
                uniforms: { uColor: { value: new THREE.Color(0xccddff) }, uBase: { value: 0.7 } }
            });
        }

        /* --- (1) 以 Dijkstra 找 node 索引路徑 --- */
        // As per change.md
        shortestPath(sIdx, eIdx) {
            const dist = new Array(this.graph.length).fill(Infinity);
            const prev = new Array(this.graph.length).fill(-1);
            // Uses the MinPriorityQueue defined earlier in the file
            const pq = new MinPriorityQueue({ priority: d => d[1] });

            dist[sIdx] = 0;
            pq.enqueue([sIdx, 0]);

            let u, d; // Declare u and d outside the loop for broader scope if needed for debugging
            while (!pq.isEmpty()) {
                // My MinPriorityQueue implementation does not wrap in .element
                const dequeuedElement = pq.dequeue();
                u = dequeuedElement[0];
                d = dequeuedElement[1];

                if (d > dist[u]) continue; // ← 新增，丟掉過期條目 (change02.md L58)
                if (u === eIdx) break;

                if (this.graph[u]) {
                    for (const v of this.graph[u]) {
                        const w = 1;
                        if (d + w < dist[v]) {
                            dist[v] = d + w;
                            prev[v] = u;
                            pq.enqueue([v, dist[v]]);
                        }
                    }
                }
            }
            const path = [];
            for (let currentV = eIdx; currentV !== -1 && path.length < this.graph.length; currentV = prev[currentV]) {
                path.push(currentV);
                if (currentV === sIdx) break; // Path reconstruction complete if we reached start
            }

            // Check if a valid path was found
            if (path.length === 0 || path[path.length - 1] !== sIdx) {
                // If sIdx and eIdx are the same, path should be [sIdx]
                if (sIdx === eIdx) return [sIdx];
                return []; // No path found or path doesn't reach start
            }

            return path.reverse();
        }

        /* --- (2) 產生貼地曲線並建立 tubeMesh 等 --- */
        // Modified as per change.md
        createArc(startIdx, endIdx, color) {
            if (startIdx === endIdx) return;       // very first line of createArc() (change02.md L65)
            const idxPath = this.shortestPath(startIdx, endIdx);
            if (!idxPath || idxPath.length < 1) return; // Path needs at least one point (for sIdx === eIdx) or two points

            const posAttr = this.nodeGeo.attributes.position;
            const rough = idxPath.map(i => new THREE.Vector3().fromBufferAttribute(posAttr, i));

            const smooth = [];
            const nSeg = 4;

            if (rough.length < 2) { // If path has only one point (startIdx === endIdx)
                if (rough.length === 1) smooth.push(rough[0].clone().normalize().multiplyScalar(earthRadius));
            } else {
                for (let i = 0; i < rough.length - 1; i++) {
                    const a = rough[i].clone();
                    const b = rough[i + 1].clone();
                    for (let t = 0; t < nSeg; t++) {
                        const p = a.clone().lerp(b, t / nSeg).normalize().multiplyScalar(earthRadius);
                        smooth.push(p);
                    }
                }
                smooth.push(rough[rough.length - 1].clone().normalize().multiplyScalar(earthRadius));
            }

            if (smooth.length < 2 && !(startIdx === endIdx && smooth.length === 1)) { // Need at least 2 points for CatmullRom, unless start=end
                if (startIdx === endIdx && smooth.length === 1) {
                    // allow single point for same start/end, tube will be just a dot
                } else {
                    return;
                }
            }

            // For single point path (startIdx === endIdx), CatmullRomCurve3 needs at least two identical points
            const curvePoints = (smooth.length === 1) ? [smooth[0], smooth[0].clone()] : smooth;
            const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.6);

            let c = color;
            if (c === undefined) {
                const levels = Object.keys(this.colors);
                const lvl = levels[Math.floor(Math.random() * levels.length)];
                const arr = this.colors[lvl];
                c = arr[Math.floor(Math.random() * arr.length)];
            }

            const tubeGeo = new THREE.TubeGeometry(curve, Math.max(1, curvePoints.length * 3), 0.003, 8, false);
            const tubeMat = new THREE.ShaderMaterial({
                vertexShader: tubeVS, fragmentShader: tubeFS, transparent: true, depthWrite: false,
                blending: THREE.AdditiveBlending,
                uniforms: { uColor: { value: new THREE.Color(c) }, uHeadProgress: { value: 0. }, uTrailLength: { value: 0. } }
            });
            const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);

            const pGeo = new THREE.SphereGeometry(0.015, 8, 8);
            const pMat = new THREE.ShaderMaterial({
                vertexShader: particleVS, fragmentShader: particleFS, transparent: true, depthWrite: false,
                blending: THREE.AdditiveBlending,
                uniforms: { uColor: { value: new THREE.Color(c).offsetHSL(0, 0.05, 0.15) }, uFresnel: { value: 3.5 }, uSharp: { value: 1.0 } }
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(curvePoints[0]);

            const trailInst = new THREE.InstancedMesh(this.trailGeo, this.trailMat, NUM_TRAIL_SEGMENTS);
            const tmp = new THREE.Object3D();
            const progAttr = new Float32Array(NUM_TRAIL_SEGMENTS);
            for (let i = 0; i < NUM_TRAIL_SEGMENTS; i++) {
                tmp.position.copy(curvePoints[0]); tmp.scale.set(0, 0, 0); tmp.updateMatrix();
                trailInst.setMatrixAt(i, tmp.matrix); progAttr[i] = i / NUM_TRAIL_SEGMENTS;
            }
            trailInst.geometry.setAttribute('aProgress', new THREE.InstancedBufferAttribute(progAttr, 1));
            trailInst.instanceMatrix.needsUpdate = true;

            this.host.add(tubeMesh); this.host.add(pMesh); this.host.add(trailInst);

            const initialLen = 0.2 + Math.random() * 0.3;
            tubeMat.uniforms.uTrailLength.value = initialLen;

            const avgLen = 3.2;
            const baseTime = 2.2;
            // 防甚短 life (change02.md L70)
            const curveLen = Math.max(curve.getLength(), 0.2);
            const life = baseTime * (curveLen / avgLen);

            const data = {
                curve,
                tubeMesh, tubeMat,
                pMesh,
                trailInst,
                trailPositions: [],
                elapsed: 0,
                life,
                initialTrailLength: initialLen,
                tailFadeElapsed: 0,
                trailFadeInterval: 0.04
            };
            this.activeArcs.push(data);

            setTimeout(() => {
                [tubeMesh, pMesh, trailInst].forEach(m => { if (m.parent) m.parent.remove(m); });
                tubeGeo.dispose(); tubeMat.dispose(); pGeo.dispose(); pMat.dispose();
                this.activeArcs = this.activeArcs.filter(a => a !== data);
            }, life * 1000);
        }

        /** per‑frame update */
        update(dt) {
            this.activeArcs.forEach(a => {
                /* --- head particle & progress --- */
                a.elapsed += dt;
                const t = Math.min(1, a.elapsed / a.life);
                const p = 1 - Math.pow(1 - t, 3); // easeOutCubic

                if (p < 1) {
                    a.curve.getPointAt(p, a.pMesh.position);
                    a.pMesh.visible = true;
                    // push trail head
                    a.trailPositions.unshift(a.pMesh.position.clone());
                    if (a.trailPositions.length > NUM_TRAIL_SEGMENTS) a.trailPositions.pop();
                } else {
                    a.pMesh.visible = false;
                    /* tail‑fade after arrival - "做法 A" from change.md */

                    // 1. Get the end position of the curve
                    const endPos = new THREE.Vector3();
                    a.curve.getPointAt(1, endPos); // t = 1 is the end point

                    // 2. Unshift the end position to the trailPositions array each frame after head arrival
                    a.trailPositions.unshift(endPos.clone());

                    // 3. Pop from the tail at a fixed interval to maintain/shorten the trail
                    a.tailFadeElapsed += dt;
                    if (a.tailFadeElapsed >= a.trailFadeInterval) {
                        a.tailFadeElapsed = 0;
                        if (a.trailPositions.length > 0) { // Only pop if there are positions
                            a.trailPositions.pop();          // This shortens the visual trail
                        }
                    }

                    // Ensure trailPositions does not exceed NUM_TRAIL_SEGMENTS if unshifting makes it too long
                    // before the pop can catch up (though with unshift+pop it should balance or shrink)
                    while (a.trailPositions.length > NUM_TRAIL_SEGMENTS) {
                        a.trailPositions.pop();
                    }

                    // 4. Update shader's trail length based on current trailPositions length
                    const ratio = a.trailPositions.length / NUM_TRAIL_SEGMENTS;
                    a.tubeMat.uniforms.uTrailLength.value = a.initialTrailLength * ratio;
                }

                // sync shader head progress
                a.tubeMat.uniforms.uHeadProgress.value = p;

                /* --- update instanced trail --- */
                const M = new THREE.Matrix4();
                for (let i = 0; i < NUM_TRAIL_SEGMENTS; i++) {
                    if (i < a.trailPositions.length) {
                        const s = Math.max(0.05, 0.9 * (1 - i / NUM_TRAIL_SEGMENTS));
                        M.compose(a.trailPositions[i], new THREE.Quaternion(), new THREE.Vector3(s, s, s));
                    } else {
                        M.identity(); M.scale(new THREE.Vector3(0, 0, 0));
                    }
                    a.trailInst.setMatrixAt(i, M);
                }
                a.trailInst.instanceMatrix.needsUpdate = true;
            });
        }

        /** probabilistic attack spawning each frame */
        maybeTrigger() {
            this.frameCount++;
            const cluster = this.frameCount % 200 === 0;
            const single = !cluster && this.frameCount % 30 === 0;
            if (!cluster && !single) return;

            const posAttr = this.nodeGeo.attributes.position;
            if (!posAttr) return;
            const n = posAttr.count;
            if (n < 2) return;

            const attacks = cluster ? 3 + Math.floor(Math.random() * 3) : 1;
            const commonOriginIdx = cluster ? Math.floor(Math.random() * n) : null;

            for (let i = 0; i < attacks; i++) {
                const startIdx = commonOriginIdx !== null ? commonOriginIdx : Math.floor(Math.random() * n);
                let endIdx = Math.floor(Math.random() * n);
                while (endIdx === startIdx) { // Ensure endIdx is different from startIdx
                    endIdx = Math.floor(Math.random() * n);
                }
                this.createArc(startIdx, endIdx); // ★ Pass indices
            }
        }
    }

    /* ------------------------------------------------------------------
       🚀  init THREE scene
       ------------------------------------------------------------------ */

    let arcSystem;
    let adjacency; // To store the graph

    function init() {
        if (!container || !THREE) return console.warn('THREE.js not found');

        /* scene / camera / renderer */
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 1.8;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearAlpha(0);
        container.innerHTML = ''; container.appendChild(renderer.domElement);

        /* post‑processing (bloom) */
        if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));
            const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.2, 0.4, 0.85);
            composer.addPass(bloom);
        }

        /* earth nodes & edges */
        let rawBaseGeo = new THREE.IcosahedronGeometry(earthRadius, 3);
        console.log("--- Diagnosing rawBaseGeo ---");
        console.log("rawBaseGeo object:", rawBaseGeo);
        console.log("rawBaseGeo.index:", rawBaseGeo.index);

        let baseGeoToUse; // This will be the geometry used for graph and visuals

        if (THREE.BufferGeometryUtils && typeof THREE.BufferGeometryUtils.mergeVertices === 'function') {
            console.log("Attempting to use THREE.BufferGeometryUtils.mergeVertices()");
            try {
                // Create a clone to avoid modifying the original rawBaseGeo if mergeVertices works in-place on some versions
                const geoToMerge = rawBaseGeo.clone();
                baseGeoToUse = THREE.BufferGeometryUtils.mergeVertices(geoToMerge, 1e-5);
                console.log("baseGeo after mergeVertices:", baseGeoToUse);
                console.log("baseGeo.index after mergeVertices:", baseGeoToUse.index);
                if (!baseGeoToUse.index) {
                    console.warn("mergeVertices did not produce an indexed geometry. Falling back.");
                    baseGeoToUse = rawBaseGeo; // Fallback if mergeVertices didn't help
                }
            } catch (e) {
                console.error("Error using mergeVertices:", e);
                baseGeoToUse = rawBaseGeo; // Fallback to raw if mergeVertices fails
            }
        } else {
            console.warn("THREE.BufferGeometryUtils.mergeVertices not found or not a function. Using rawBaseGeo.");
            baseGeoToUse = rawBaseGeo;
        }

        // Final check on the baseGeo to be used
        console.log("--- Diagnosing final baseGeo to be used ---");
        console.log("Final baseGeo object:", baseGeoToUse);
        console.log("Final baseGeo.index:", baseGeoToUse.index);
        if (baseGeoToUse.index) {
            console.log("Final baseGeo.index.array (first 12):", baseGeoToUse.index.array.slice(0, 12));
        } else {
            console.log("Final baseGeo.index is still null or undefined.");
        }
        console.log("--- End Diagnosing final baseGeo ---");

        adjacency = buildGraph(baseGeoToUse); // ★ Build graph here using the processed geometry

        // IMPORTANT: Visual elements (nodes and edges) should also use this potentially re-indexed baseGeoToUse
        const nodeGeo = new THREE.SphereGeometry(0.0035, 12, 12);
        const nodeMat = new THREE.MeshStandardMaterial({ color: 0x00B4D8, emissive: 0x0066ff, roughness: 0.3, metalness: 0.1 });

        // instCnt should be based on the number of unique vertices in baseGeoToUse.
        // If baseGeoToUse is indexed, its attributes.position.count is the number of unique vertices.
        // If it's not indexed (e.g. fallback), then attributes.position.count is num_faces * 3.
        // For safety, if indexed, use attributes.position.count. If not, this count is too high for unique nodes.
        // However, the original IcosahedronGeometry (detail=3) has a known number of vertices (e.g. 642).
        // Let's use baseGeoToUse.attributes.position.count, assuming mergeVertices correctly sets this for unique vertices.
        const instCnt = baseGeoToUse.attributes.position.count;

        const inst = new THREE.InstancedMesh(nodeGeo, nodeMat, instCnt);
        const d = new THREE.Object3D();

        // Iterate through the *unique* vertex positions defined in baseGeoToUse.attributes.position
        for (let i = 0; i < instCnt; i++) {
            // Check if 'i' is a valid index for the position attribute
            if (i < baseGeoToUse.attributes.position.count) {
                d.position.fromBufferAttribute(baseGeoToUse.attributes.position, i);
                d.updateMatrix();
                if (i < inst.count) { // Ensure we don't write out of bounds for instanced mesh
                    inst.setMatrixAt(i, d.matrix);
                }
            }
        }
        inst.instanceMatrix.needsUpdate = true; // Moved out of loop


        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeoToUse), new THREE.LineBasicMaterial({ color: 0x005073, opacity: 0.5, transparent: true }));

        earthGroup = new THREE.Group();
        earthGroup.add(inst); earthGroup.add(edges);
        earthGroup.rotation.y = Math.PI;
        scene.add(earthGroup);

        scene.add(new THREE.AmbientLight(0x404040, 1.2));
        const pt = new THREE.PointLight(0x99ccff, 1, 5); pt.position.set(2, 2, 2); scene.add(pt);

        /* arc system */
        const attackColors = {
            low: [0x00ff00, 0x33cc33, 0x66ff66],
            medium: [0xffff00, 0xffcc00, 0xffaa00],
            high: [0xff8800, 0xff6600, 0xff4400],
            critical: [0xff0000, 0xcc0000, 0xff00ff, 0xcc00cc]
        };
        arcSystem = new ArcSystem(earthGroup, baseGeoToUse, attackColors, adjacency); // ★ Use baseGeoToUse

        window.addEventListener('resize', onResize);
        animate();
    }

    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        if (composer) composer.setSize(container.clientWidth, container.clientHeight);
    }

    /* ------------------------------------------------------------------
       🎞️  animation loop
       ------------------------------------------------------------------ */

    function animate() {
        requestAnimationFrame(animate);
        const dt = clock.getDelta();
        earthGroup.rotation.y += 0.0006;
        arcSystem.update(dt);
        arcSystem.maybeTrigger();
        composer ? composer.render() : renderer.render(scene, camera);
    }

    /* ------------------------------------------------------------------
       ✨  initialise all subsystems
       ------------------------------------------------------------------ */
    init();

    /* ------------------------------------------------------------------
       � particles background & misc Easter eggs (unchanged)
       ------------------------------------------------------------------ */
    if (typeof tsParticles !== 'undefined' && document.getElementById('tsparticles')) {
        tsParticles.load('tsparticles', {
            fpsLimit: 60,
            interactivity: {
                events: { onHover: { enable: true, mode: 'bubble' }, onClick: { enable: true, mode: 'push' }, resize: true },
                modes: { bubble: { distance: 150, size: 10, duration: 0.6, opacity: 0.8, color: '#38F321' }, push: { quantity: 3 } }
            },
            particles: {
                number: { value: 60, density: { enable: true, value_area: 800 } },
                color: { value: ['#00B4D8', '#5E60CE'] }, shape: { type: 'triangle' },
                opacity: { value: { min: 0.2, max: 0.7 }, random: true, anim: { enable: true, speed: 0.8, opacity_min: 0.1 } },
                size: { value: { min: 1, max: 4 }, random: true, anim: { enable: true, speed: 2, size_min: 0.5 } },
                links: { enable: true, distance: 130, color: 'rgba(0, 180, 216, 0.3)', opacity: 0.3, width: 1 },
                move: { enable: true, speed: 1.2, random: true, out_mode: 'out' }
            },
            detectRetina: true
        });
    }

    console.log('%c白帽駭客 — Stay ethical!', 'color:#38f321;font-family:Orbitron,sans-serif;font-size:1.2em;');
    console.log('%cWelcome to the console. If you\'re inspecting this, you might be one of us. Keep exploring, keep learning.', 'color:#00B4D8;');

    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    /* ------------------------------------------------------------------
       🎛️  Toolkit effects (matrix, typewriter, cards, cursor)
       ------------------------------------------------------------------ */
    const heroCanvas = document.querySelector('.hero__canvas');
    if (heroCanvas) startMatrix(heroCanvas);

    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle) typewriter(heroTitle, '$ whoami — white-hat.hacker');

    setupCursor();
    setupCards();

    /* reveal animations */
    const revealEls = document.querySelectorAll('.content-panel, .project-card, .skill-card');
    const io = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } }); }, { threshold: 0.1 });
    revealEls.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(30px)'; el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out'; io.observe(el); });

});

/* ========= /main.js ========= */

function startMatrix(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;
    const columns = Math.floor(width / 20);
    const drops = Array(columns).fill(0);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    function draw() {
        ctx.fillStyle = 'rgba(5,5,5,0.05)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#00FF9F';
        ctx.font = '16px "IBM Plex Mono"';

        drops.forEach((y, i) => {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillText(text, i * 20, y);
            if (y > height && Math.random() > 0.975) {
                drops[i] = 0;
            } else {
                drops[i] = y + 20;
            }
        });

        requestAnimationFrame(draw);
    }

    draw();
}

function typewriter(element, text, speed = 100) {
    let index = 0;
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index += 1;
            setTimeout(type, speed);
        }
    }
    type();
}

function setupCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
}

function setupCards() {
    const cards = document.querySelectorAll('.card');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('card--show');
            }
        });
    }, { threshold: 0.1 });
    cards.forEach(card => {
        card.classList.add('card--flip');
        observer.observe(card);
    });
}
