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
    let scene, camera, renderer, earthMesh;

    function initThreeJSEarth() {
        if (!earthContainer || typeof THREE === 'undefined') {
            console.warn("Three.js library or #digital-earth-container not found. Earth will not be rendered.");
            return;
        }

        // Scene
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(75, earthContainer.clientWidth / earthContainer.clientHeight, 0.1, 1000);
        camera.position.z = 1.8; // Adjusted for a 0.8 radius sphere to be visible

        // Renderer
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(earthContainer.clientWidth, earthContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        while (earthContainer.firstChild) { // Clear previous CSS-only div if any
            earthContainer.removeChild(earthContainer.firstChild);
        }
        earthContainer.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xb0c0d0, 0.5); // Further reduced intensity
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Further reduced intensity
        directionalLight.position.set(4, 4, 6); // Position maintained
        scene.add(directionalLight);

        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5); // Further reduced intensity
        scene.add(hemisphereLight);


        // Texture Loaders
        const textureLoader = new THREE.TextureLoader();

        // Error handling for texture loading
        const onTextureError = function (xhr) {
            console.error('An error occurred loading a texture:', xhr);
        };

        const dayMap = textureLoader.load(
            'assets/images/8k_earth_daymap.jpg',
            undefined, // onLoad callback (optional)
            undefined, // onProgress callback (optional)
            onTextureError // onError callback
        );
        const specularMap = textureLoader.load(
            'assets/images/8k_earth_specular_map.png',
            undefined,
            undefined,
            onTextureError
        );

        // Earth Material
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: dayMap,
            specularMap: specularMap,
            roughness: 0.5, // Roughness maintained
            metalness: 0.05, // Kept low for non-metallic earth
            emissive: new THREE.Color(0x282828), // Emissive color maintained
            emissiveIntensity: 0.1 // Further reduced emissive intensity
        });

        // Earth Geometry
        const earthGeometry = new THREE.SphereGeometry(0.85, 64, 64); // Radius maintained

        // Earth Mesh
        earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        earthMesh.rotation.y = Math.PI; // Start with a different view
        scene.add(earthMesh);

        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);

        animateEarth();
    }

    function onWindowResize() {
        if (camera && renderer && earthContainer && earthContainer.clientWidth > 0 && earthContainer.clientHeight > 0) {
            camera.aspect = earthContainer.clientWidth / earthContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(earthContainer.clientWidth, earthContainer.clientHeight);
        }
    }

    function animateEarth() {
        if (earthMesh && renderer && scene && camera) {
            requestAnimationFrame(animateEarth);
            earthMesh.rotation.y += 0.0006; // Slower, more majestic rotation
            // earthMesh.rotation.x += 0.00005; // Very subtle X wobble
            renderer.render(scene, camera);
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