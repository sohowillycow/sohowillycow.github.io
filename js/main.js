document.addEventListener('DOMContentLoaded', () => {
    // --- Hamburger Menu Toggle ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            hamburger.classList.toggle('toggle');

            links.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
        });
    }

    // --- Language Switch & Persistence ---
    const langSwitchLinks = document.querySelectorAll('.lang-switch a');
    const currentPath = window.location.pathname.split('/').pop();
    const currentLang = document.documentElement.lang;

    function switchToLanguage(targetLang) {
        let newPath;
        if (targetLang === 'zh-TW' || targetLang === 'zh') {
            if (currentPath.includes('-zh.html')) {
                newPath = currentPath;
            } else {
                newPath = currentPath.replace('.html', '-zh.html');
                if (currentPath === '' || currentPath === 'index.html') newPath = 'index-zh.html';
            }
        } else {
            if (currentPath.includes('-zh.html')) {
                newPath = currentPath.replace('-zh.html', '.html');
            } else {
                newPath = currentPath;
                if (newPath === 'index-zh.html') newPath = 'index.html';
            }
        }
        if (newPath === '-zh.html') newPath = 'index-zh.html';
        if (newPath === '.html' && (currentPath === '' || currentPath === 'index-zh.html')) newPath = 'index.html';


        if (newPath !== currentPath && newPath !== '') {
            window.location.href = newPath;
        }
    }

    langSwitchLinks.forEach(link => {
        if (link.getAttribute('data-lang') === currentLang.substring(0, 2)) {
            link.classList.add('active-lang');
        } else {
            link.classList.remove('active-lang');
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            localStorage.setItem('preferredLang', selectedLang);
            const targetLangForSwitch = (selectedLang === 'zh') ? 'zh-TW' : 'en';
            switchToLanguage(targetLangForSwitch);
        });
    });

    const preferredLang = localStorage.getItem('preferredLang');
    if (preferredLang) {
        const currentLangShort = currentLang.substring(0, 2);
        if (preferredLang !== currentLangShort) {
            if (preferredLang === 'zh' && !currentPath.includes('-zh.html')) {
                switchToLanguage('zh-TW');
            } else if (preferredLang === 'en' && currentPath.includes('-zh.html')) {
                switchToLanguage('en');
            }
        }
    }

    // --- Three.js Earth Initialization ---
    const earthContainer = document.getElementById('digital-earth-container');
    let scene, camera, renderer, earthGroup, composer; // Added composer
    const earthRadius = 0.85; // Moved to higher scope

    // --- Global Clock for Animation Timing ---
    const clock = new THREE.Clock();

    // attackColors will be passed to ArcSystem constructor
    // activeArcs will be managed by ArcSystem instance

    // Shader source code
    const vertexShaderSource = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShaderSource = `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uHeadProgress; // Current head position of the beam (0.0 to 1.0)
        uniform float uTrailLength;  // Length of the beam/trail (0.0 to 1.0)

        void main() {
            // vUv.x is the position along the tube (0.0 at start, 1.0 at end)
            float beamStart = uHeadProgress - uTrailLength;
            float beamEnd = uHeadProgress;

            // Calculate alpha based on whether vUv.x is within the beam segment
            // smoothstep can be used for softer edges, step for hard edges
            float alpha = smoothstep(beamStart, beamStart + 0.05, vUv.x) * (1.0 - smoothstep(beamEnd - 0.05, beamEnd, vUv.x));
            
            // Ensure alpha is zero if outside the trail (handles progress < trailLength)
            alpha *= step(0.0, vUv.x); // Ensure we are not before the start
            alpha *= step(vUv.x, beamEnd); // Ensure we are not after the head

            if (uHeadProgress < uTrailLength) { // Special handling when the beam is still "growing" from the start
                 alpha *= smoothstep(0.0, beamStart + uTrailLength, vUv.x);
            }


            if (alpha < 0.01) discard;

            // Optional: Make the head brighter
            float headGlow = smoothstep(uHeadProgress - 0.05, uHeadProgress, vUv.x) * 0.5; // Extra glow at the very head

            gl_FragColor = vec4(uColor, alpha * 0.85 + headGlow * 0.5);
        }
    `;

    const particleVertexShaderSource = `
        varying vec3 vNormal_view;
        varying vec3 vPosition_view;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vPosition_view = mvPosition.xyz;
            vNormal_view = normalize(normalMatrix * normal); // Normal in view space
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const particleFragmentShaderSource = `
        varying vec3 vNormal_view;
        varying vec3 vPosition_view;

        uniform vec3 uParticleBaseColor;
        uniform float uFresnelPower;    // e.g., 3.0
        uniform float uCoreSharpness;   // e.g., 1.5

        void main() {
            vec3 normal = normalize(vNormal_view);
            vec3 viewDir = normalize(-vPosition_view); // Vector from fragment to camera

            float fresnelTerm = 1.0 - clamp(dot(viewDir, normal), 0.0, 1.0); // 0 at center, 1 at edge
            float fresnelEffect = pow(fresnelTerm, uFresnelPower);

            float coreGlow = pow(clamp(dot(viewDir, normal), 0.0, 1.0), uCoreSharpness); // Brighter at center

            float alpha = clamp(coreGlow * 0.7 + fresnelEffect * 0.8, 0.0, 1.0); // Combine, base opacity for core

            if (alpha < 0.01) discard;

            gl_FragColor = vec4(uParticleBaseColor, alpha);
        }
    `;

    // Trail Segment Geometry & Material
    const trailSegmentGeo = new THREE.SphereGeometry(0.008, 5, 5);
    // Shader for trail segments
    const trailVertexShaderSource = `
        attribute float aInstanceProgress; // 0 (head) to 1 (tail end)
        varying float vInstanceProgress;
        void main() {
            vInstanceProgress = aInstanceProgress;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
    `;
    const trailFragmentShaderSource = `
        varying float vInstanceProgress;
        uniform vec3 uTrailColor;
        uniform float uBaseOpacity;
        void main() {
            float opacity = uBaseOpacity * (1.0 - vInstanceProgress); // Fades out towards the tail end
            if (opacity < 0.01) discard;
            gl_FragColor = vec4(uTrailColor, opacity);
        }
    `;
    const trailSegmentMaterial = new THREE.ShaderMaterial({
        vertexShader: trailVertexShaderSource,
        fragmentShader: trailFragmentShaderSource,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
            uTrailColor: { value: new THREE.Color(0xccddff) }, // Light blueish-white trail
            uBaseOpacity: { value: 0.7 }
        }
    });
    const NUM_TRAIL_SEGMENTS = 8;


    // The createAttackArc function is now a method of ArcSystem.
    // Removed redundant/commented-out clock declaration.

    let bloomPass; // Declare bloomPass here to access it in onWindowResize

    // --- ArcSystem Class Definition ---
    class ArcSystem {
        constructor(sceneOrGroup, baseGeometry, attackColorsConfig, particleAssets = {}) {
            this.container = sceneOrGroup; // The object to add arcs to (e.g., earthGroup)
            this.baseGeometry = baseGeometry; // For node positions
            this.attackColors = attackColorsConfig;
            this.particleAssets = particleAssets; // For shared geo/mat if implemented

            this.activeArcs = [];
            this.earthRadius = 0.85; // Assuming this is relatively constant for arc calculations
            this.frameCount = 0; // Frame counter for attack triggering

            // Shader sources - can be defined here or passed in if they become more complex/configurable
            this.arcVertexShader = `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `;
            this.arcFragmentShader = `
                varying vec2 vUv;
                uniform vec3 uColor;
                uniform float uHeadProgress;
                uniform float uTrailLength;
                void main() {
                    float beamStart = uHeadProgress - uTrailLength;
                    float beamEnd = uHeadProgress;
                    float alpha = smoothstep(beamStart, beamStart + 0.05, vUv.x) * (1.0 - smoothstep(beamEnd - 0.05, beamEnd, vUv.x));
                    alpha *= step(0.0, vUv.x);
                    alpha *= step(vUv.x, beamEnd);
                    if (uHeadProgress < uTrailLength) {
                         alpha *= smoothstep(0.0, beamStart + uTrailLength, vUv.x);
                    }
                    if (alpha < 0.01) discard;
                    float headGlow = smoothstep(uHeadProgress - 0.05, uHeadProgress, vUv.x) * 0.5;
                    gl_FragColor = vec4(uColor, alpha * 0.85 + headGlow * 0.5);
                }
            `;
            this.particleVertexShader = `
                varying vec3 vNormal_view;
                varying vec3 vPosition_view;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vPosition_view = mvPosition.xyz;
                    vNormal_view = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
            this.particleFragmentShader = `
                varying vec3 vNormal_view;
                varying vec3 vPosition_view;
                uniform vec3 uParticleBaseColor;
                uniform float uFresnelPower;
                uniform float uCoreSharpness;
                void main() {
                    vec3 normal = normalize(vNormal_view);
                    vec3 viewDir = normalize(-vPosition_view);
                    float fresnelTerm = 1.0 - clamp(dot(viewDir, normal), 0.0, 1.0);
                    float fresnelEffect = pow(fresnelTerm, uFresnelPower);
                    float coreGlow = pow(clamp(dot(viewDir, normal), 0.0, 1.0), uCoreSharpness);
                    float alpha = clamp(coreGlow * 0.7 + fresnelEffect * 0.8, 0.0, 1.0);
                    if (alpha < 0.01) discard;
                    gl_FragColor = vec4(uParticleBaseColor, alpha);
                }
            `;
            this.trailVertexShader = `
                attribute float aInstanceProgress;
                varying float vInstanceProgress;
                void main() {
                    vInstanceProgress = aInstanceProgress;
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                }
            `;
            this.trailFragmentShader = `
                varying float vInstanceProgress;
                uniform vec3 uTrailColor;
                uniform float uBaseOpacity;
                void main() {
                    float opacity = uBaseOpacity * (1.0 - vInstanceProgress);
                    if (opacity < 0.01) discard;
                    gl_FragColor = vec4(uTrailColor, opacity);
                }
            `;

            // Shared assets (can be expanded)
            this.trailSegmentGeo = this.particleAssets.trailSegmentGeo || new THREE.SphereGeometry(0.008, 5, 5);
            this.trailSegmentMaterial = this.particleAssets.trailSegmentMaterial || new THREE.ShaderMaterial({
                vertexShader: this.trailVertexShader,
                fragmentShader: this.trailFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                uniforms: {
                    uTrailColor: { value: new THREE.Color(0xccddff) },
                    uBaseOpacity: { value: 0.7 }
                }
            });
            this.NUM_TRAIL_SEGMENTS = this.particleAssets.numTrailSegments || 8;
        }

        createAttack(startPointVec3, endPointVec3, colorValue) {
            if (!this.container || !startPointVec3 || !endPointVec3) {
                console.warn("ArcSystem.createAttack: Missing container or points.", startPointVec3, endPointVec3);
                return;
            }

            let chosenColor = colorValue;
            if (typeof chosenColor === 'undefined') { // If no color passed, pick one
                const threatLevels = Object.keys(this.attackColors);
                const randomThreatLevel = threatLevels[Math.floor(Math.random() * threatLevels.length)];
                const colorsForLevel = this.attackColors[randomThreatLevel];
                chosenColor = colorsForLevel[Math.floor(Math.random() * colorsForLevel.length)];
            }
            // console.log("ArcSystem: Creating arc from:", startPointVec3, "to:", endPointVec3, "color:", chosenColor.toString(16));

            const midPoint = new THREE.Vector3().addVectors(startPointVec3, endPointVec3).multiplyScalar(0.5);
            const controlPoint = midPoint.clone().normalize().multiplyScalar(midPoint.length() + this.earthRadius * 0.4);

            const curve = new THREE.QuadraticBezierCurve3(startPointVec3, controlPoint, endPointVec3);
            const tubeRadius = 0.003;
            const tubeGeometry = new THREE.TubeGeometry(curve, 32, tubeRadius, 8, false);
            const arcMaterial = new THREE.ShaderMaterial({
                vertexShader: this.arcVertexShader,
                fragmentShader: this.arcFragmentShader,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                uniforms: {
                    uColor: { value: new THREE.Color(chosenColor) },
                    uHeadProgress: { value: 0.0 },
                    uTrailLength: { value: 0.2 + Math.random() * 0.3 }
                }
            });
            const arcMesh = new THREE.Mesh(tubeGeometry, arcMaterial);

            const particleGeo = new THREE.SphereGeometry(0.015, 8, 8);
            const baseParticleColor = new THREE.Color(chosenColor).offsetHSL(0, 0.05, 0.15);
            const particleMaterial = new THREE.ShaderMaterial({
                vertexShader: this.particleVertexShader,
                fragmentShader: this.particleFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                uniforms: {
                    uParticleBaseColor: { value: baseParticleColor },
                    uFresnelPower: { value: 3.5 },
                    uCoreSharpness: { value: 1.0 }
                }
            });
            const particleMesh = new THREE.Mesh(particleGeo, particleMaterial);
            particleMesh.position.copy(startPointVec3);

            const trailInstancedMesh = new THREE.InstancedMesh(this.trailSegmentGeo, this.trailSegmentMaterial, this.NUM_TRAIL_SEGMENTS);
            const dummyMatrix = new THREE.Object3D();
            const trailProgressArray = new Float32Array(this.NUM_TRAIL_SEGMENTS);
            for (let i = 0; i < this.NUM_TRAIL_SEGMENTS; i++) {
                dummyMatrix.position.copy(startPointVec3);
                dummyMatrix.scale.set(0, 0, 0);
                dummyMatrix.updateMatrix();
                trailInstancedMesh.setMatrixAt(i, dummyMatrix.matrix);
                trailProgressArray[i] = i / this.NUM_TRAIL_SEGMENTS;
            }
            trailInstancedMesh.geometry.setAttribute('aInstanceProgress', new THREE.InstancedBufferAttribute(trailProgressArray, 1));
            trailInstancedMesh.instanceMatrix.needsUpdate = true;

            this.container.add(arcMesh);
            this.container.add(particleMesh);
            this.container.add(trailInstancedMesh);

            const arcLifetime = 2.5;
            const newArcData = {
                mesh: arcMesh,
                material: arcMaterial,
                particleMesh: particleMesh,
                curve: curve,
                elapsedTime: 0,
                totalLife: arcLifetime,
                progress: 0,
                trailInstancedMesh: trailInstancedMesh,
                trailPositions: []
            };
            this.activeArcs.push(newArcData);

            setTimeout(() => {
                if (arcMesh.parent) arcMesh.parent.remove(arcMesh);
                arcMesh.geometry.dispose();
                arcMesh.material.dispose();

                if (particleMesh.parent) particleMesh.parent.remove(particleMesh);
                particleMesh.geometry.dispose();
                particleMesh.material.dispose();

                if (trailInstancedMesh.parent) trailInstancedMesh.parent.remove(trailInstancedMesh);
                // Note: trailSegmentGeo and trailSegmentMaterial are potentially shared,
                // so they are NOT disposed here. They are managed by the ArcSystem instance.

                this.activeArcs = this.activeArcs.filter(item => item.mesh !== arcMesh);
            }, arcLifetime * 1000); // Ensure timeout is in milliseconds
        }

        update(deltaTime) {
            this.activeArcs.forEach(attackData => {
                // Animate the peak particle first to get its progress
                let particleProgress = 0;
                if (attackData.particleMesh && attackData.curve) {
                    attackData.elapsedTime += deltaTime; // Use passed deltaTime
                    let t = attackData.elapsedTime / attackData.totalLife;
                    let clampedT = Math.max(0, Math.min(1, t));
                    attackData.progress = 1 - Math.pow(1 - clampedT, 3); // easeOutCubic
                    particleProgress = attackData.progress;

                    if (particleProgress < 1) {
                        attackData.curve.getPointAt(particleProgress, attackData.particleMesh.position);
                        attackData.particleMesh.visible = true;

                        // Update trail positions
                        attackData.trailPositions.unshift(attackData.particleMesh.position.clone());
                        if (attackData.trailPositions.length > this.NUM_TRAIL_SEGMENTS) { // Use this.NUM_TRAIL_SEGMENTS
                            attackData.trailPositions.pop();
                        }
                    } else {
                        attackData.particleMesh.visible = false;
                        // Trail will use last known positions
                    }
                }

                // Animate shader for the arc tube, syncing with particle progress
                if (attackData.material && attackData.material.uniforms.uHeadProgress) {
                    attackData.material.uniforms.uHeadProgress.value = particleProgress;
                }

                // Update Trail InstancedMesh
                if (attackData.trailInstancedMesh) {
                    const M = new THREE.Matrix4();
                    for (let i = 0; i < this.NUM_TRAIL_SEGMENTS; i++) { // Use this.NUM_TRAIL_SEGMENTS
                        if (i < attackData.trailPositions.length) {
                            const scaleFactor = Math.max(0.05, 0.9 * (1.0 - (i / this.NUM_TRAIL_SEGMENTS)));
                            M.compose(attackData.trailPositions[i], new THREE.Quaternion(), new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor));
                            attackData.trailInstancedMesh.setMatrixAt(i, M);
                        } else {
                            M.identity().scale(new THREE.Vector3(0, 0, 0)); // Hide unused segments
                            attackData.trailInstancedMesh.setMatrixAt(i, M);
                        }
                    }
                    attackData.trailInstancedMesh.instanceMatrix.needsUpdate = true;
                }
            });

            // Note: The logic for filtering completed arcs (this.activeArcs = this.activeArcs.filter(...))
            // is currently handled by the setTimeout in the createAttack method, which removes arcs after their lifetime.
            // If more immediate or complex cleanup based on progress is needed in the future,
            // it could be added here.
        }

        triggerRandomAttack() {
            this.frameCount++;

            let performClusterAttack = false;
            // Determine if a cluster attack should happen (e.g., every 300 frames, or roughly 10 seconds if attacks are checked every 30 frames)
            if (this.frameCount % 200 === 0) { // Adjusted for potentially more frequent clusters for testing, e.g. every ~6-7 seconds
                performClusterAttack = true;
            }

            // Determine if any attack (regular or cluster) should be triggered
            const shouldTriggerRegularAttack = (this.frameCount % 30 === 0) && !performClusterAttack;
            const shouldTriggerAttack = shouldTriggerRegularAttack || performClusterAttack;

            if (shouldTriggerAttack) {
                if (!this.baseGeometry || !this.baseGeometry.attributes.position) {
                    console.warn("ArcSystem: Base geometry not available for triggering attack.");
                    return;
                }
                const positions = this.baseGeometry.attributes.position;
                const numVertices = positions.count;

                if (numVertices > 1) {
                    const attackCount = performClusterAttack ? (3 + Math.floor(Math.random() * 3)) : 1; // Cluster: 3-5 arcs, Regular: 1 arc
                    let mainOriginIndex = -1;
                    let mainOriginPoint = null;

                    if (performClusterAttack) {
                        mainOriginIndex = Math.floor(Math.random() * numVertices);
                        mainOriginPoint = new THREE.Vector3().fromBufferAttribute(positions, mainOriginIndex);
                        // console.log(`ArcSystem: Cluster attack! Origin index: ${mainOriginIndex}, Count: ${attackCount}`);
                    }

                    for (let i = 0; i < attackCount; i++) {
                        let startPoint;
                        let originIndexForThisArc;

                        if (performClusterAttack && mainOriginPoint) {
                            startPoint = mainOriginPoint.clone();
                            originIndexForThisArc = mainOriginIndex;
                        } else {
                            originIndexForThisArc = Math.floor(Math.random() * numVertices);
                            startPoint = new THREE.Vector3().fromBufferAttribute(positions, originIndexForThisArc);
                        }

                        let targetIndex = Math.floor(Math.random() * numVertices);
                        while (targetIndex === originIndexForThisArc) { // Ensure different start and end points
                            targetIndex = Math.floor(Math.random() * numVertices);
                        }
                        const endPoint = new THREE.Vector3().fromBufferAttribute(positions, targetIndex);

                        // createAttack method will handle color selection if 'undefined' is passed.
                        this.createAttack(startPoint, endPoint, undefined);
                    }
                }
            }
        }

        // Helper to get a random node position
        _getRandomNodePosition() {
            if (!this.baseGeometry || !this.baseGeometry.attributes.position) return null;
            const positions = this.baseGeometry.attributes.position;
            const numVertices = positions.count;
            if (numVertices <= 1) return null;
            const randomIndex = Math.floor(Math.random() * numVertices);
            return new THREE.Vector3().fromBufferAttribute(positions, randomIndex);
        }
    }
    // --- End ArcSystem Class Definition ---

    let arcSystemInstance; // To hold the instance of ArcSystem

    function initThreeJSEarth() {
        if (!earthContainer || typeof THREE === 'undefined') {
            console.warn("Three.js library or #digital-earth-container not found. Earth will not be rendered.");
            return;
        }

        scene = new THREE.Scene(); // Assign to higher-scoped scene

        camera = new THREE.PerspectiveCamera(75, earthContainer.clientWidth / earthContainer.clientHeight, 0.1, 1000);
        camera.position.z = 1.8;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(earthContainer.clientWidth, earthContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearAlpha(0.0);

        while (earthContainer.firstChild) {
            earthContainer.removeChild(earthContainer.firstChild);
        }
        earthContainer.appendChild(renderer.domElement);

        // Post-processing
        if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));

            bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(earthContainer.clientWidth, earthContainer.clientHeight),
                1.2, // strength
                0.4, // radius
                0.85 // threshold
            );
            composer.addPass(bloomPass);
        } else {
            console.warn("EffectComposer or required passes not found. Bloom effect will be disabled.");
            composer = null; // Ensure composer is null if setup fails
        }

        scene.add(new THREE.AmbientLight(0x404040, 1.2));
        const pointLight = new THREE.PointLight(0x99ccff, 1, 5);
        pointLight.position.set(2, 2, 2);
        scene.add(pointLight);

        // earthRadius is now from higher scope
        const icoDetail = 3;
        const baseGeometry = new THREE.IcosahedronGeometry(earthRadius, icoDetail);

        const sphereGeo = new THREE.SphereGeometry(0.0035, 12, 12);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0x00B4D8,
            emissive: 0x0066ff,
            roughness: 0.3,
            metalness: 0.1
        });
        const instanceCount = baseGeometry.attributes.position.count;
        const instancedSpheres = new THREE.InstancedMesh(sphereGeo, sphereMaterial, instanceCount);

        const dummy = new THREE.Object3D();
        for (let i = 0; i < instanceCount; i++) {
            dummy.position.fromBufferAttribute(baseGeometry.attributes.position, i);
            dummy.updateMatrix();
            instancedSpheres.setMatrixAt(i, dummy.matrix);
        }

        const edgesGeometry = new THREE.EdgesGeometry(baseGeometry);
        const linesMaterial = new THREE.LineBasicMaterial({
            color: 0x005073,
            transparent: true,
            opacity: 0.5,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
        const earthLines = new THREE.LineSegments(edgesGeometry, linesMaterial);

        earthGroup = new THREE.Group(); // Assign to higher-scoped earthGroup
        earthGroup.add(instancedSpheres);
        earthGroup.add(earthLines);

        earthGroup.rotation.y = Math.PI;
        scene.add(earthGroup);

        window.addEventListener('resize', onWindowResize, false);

        // attackColorsConfig is now defined inside ArcSystem or passed if needed.
        // For this stage, ArcSystem uses its internally defined attackColors.
        // We will pass the baseGeometry and earthGroup.
        // The attackColorsConfig that was here is now part of the ArcSystem's constructor logic.
        const globalAttackColorsConfig = {
            low: [0x00ff00, 0x33cc33, 0x66ff66],
            medium: [0xffff00, 0xffcc00, 0xffaa00],
            high: [0xff8800, 0xff6600, 0xff4400],
            critical: [0xff0000, 0xcc0000, 0xff00ff, 0xcc00cc]
        };
        arcSystemInstance = new ArcSystem(earthGroup, baseGeometry, globalAttackColorsConfig);

        animateEarth(baseGeometry); // baseGeometry is passed for now, ArcSystem might use it internally
    }

    function onWindowResize() {
        if (camera && renderer && earthContainer && earthContainer.clientWidth > 0 && earthContainer.clientHeight > 0) {
            camera.aspect = earthContainer.clientWidth / earthContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(earthContainer.clientWidth, earthContainer.clientHeight);
            if (composer) {
                composer.setSize(earthContainer.clientWidth, earthContainer.clientHeight);
            }
            // It's generally good practice to also update bloomPass resolution if it exists and is sensitive
            // However, composer.setSize often handles this for its passes.
            // if (bloomPass) {
            //     bloomPass.resolution.set(earthContainer.clientWidth, earthContainer.clientHeight);
            // }
        }
    }

    // frameCount is now managed by arcSystemInstance.
    // The currentBaseGeometry parameter might become obsolete for animateEarth if ArcSystem fully encapsulates its use.
    function animateEarth(currentBaseGeometry) {
        if (earthGroup && renderer && scene && camera) {
            requestAnimationFrame(() => animateEarth(currentBaseGeometry));
            earthGroup.rotation.y += 0.0006;

            const delta = clock.getDelta();

            if (arcSystemInstance) {
                arcSystemInstance.update(delta);          // Update existing arcs
                arcSystemInstance.triggerRandomAttack();  // Let ArcSystem decide if/when to create new attacks
            }

            // All attack creation logic (frameCount, if(shouldTriggerAttack), loops, etc.)
            // has been moved into arcSystemInstance.triggerRandomAttack().

            if (composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }
    }

    // Call Three.js initialization
    initThreeJSEarth();

    // --- tsparticles Initialization for Abstract Digital Grid & Pulses ---
    if (typeof tsParticles !== 'undefined' && document.getElementById('tsparticles')) {
        tsParticles.load("tsparticles", {
            fpsLimit: 60,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: "bubble"
                    },
                    onClick: {
                        enable: true,
                        mode: "push"
                    },
                    resize: true
                },
                modes: {
                    bubble: {
                        distance: 150,
                        size: 10,
                        duration: 0.6,
                        opacity: 0.8,
                        color: "#38F321"
                    },
                    push: {
                        quantity: 3
                    },
                    repulse: {
                        distance: 100,
                        duration: 0.4
                    }
                }
            },
            particles: {
                number: {
                    value: 60,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: ["#00B4D8", "#5E60CE"]
                },
                shape: {
                    type: "triangle",
                },
                opacity: {
                    value: { min: 0.2, max: 0.7 },
                    random: true,
                    anim: {
                        enable: true,
                        speed: 0.8,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: { min: 1, max: 4 },
                    random: true,
                    anim: {
                        enable: true,
                        speed: 2,
                        size_min: 0.5,
                        sync: false
                    }
                },
                links: {
                    enable: true,
                    distance: 130,
                    color: "rgba(0, 180, 216, 0.3)",
                    opacity: 0.3,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 1.2,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    attract: {
                        enable: true,
                        rotateX: 600,
                        rotateY: 1200,
                        strength: 0.1
                    }
                }
            },
            detectRetina: true
        });
    }

    // --- Console Easter Egg ---
    console.log("%c白帽駭客 — Stay ethical!", "color:#38f321; font-family: Orbitron, sans-serif; font-size: 1.2em;");
    console.log("%cWelcome to the console. If you're inspecting this, you might be one of us. Keep exploring, keep learning.", "color:#00B4D8;");

    // --- Dynamic Year in Footer ---
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- Intersection Observer for Reveal Animations ---
    const revealElements = document.querySelectorAll('.content-panel, .project-card, .skill-card');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                // observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        revealObserver.observe(el);
    });

});