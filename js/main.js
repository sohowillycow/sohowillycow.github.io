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

    // Function to navigate to the other language version of the current page
    function switchToLanguage(targetLang) {
        let newPath;
        if (targetLang === 'zh-TW' || targetLang === 'zh') {
            if (currentPath.includes('-zh.html')) {
                newPath = currentPath; // Already on Chinese page
            } else {
                newPath = currentPath.replace('.html', '-zh.html');
                if (currentPath === '' || currentPath === 'index.html') newPath = 'index-zh.html';
            }
        } else { // Switching to English
            if (currentPath.includes('-zh.html')) {
                newPath = currentPath.replace('-zh.html', '.html');
            } else {
                newPath = currentPath; // Already on English page
                if (newPath === 'index-zh.html') newPath = 'index.html'; // case for homepage from zh to en
            }
        }
        // Ensure index.html for root
        if (newPath === '-zh.html') newPath = 'index-zh.html';


        if (newPath !== currentPath) {
            window.location.href = newPath;
        }
    }

    // Set active language based on current page's lang attribute
    langSwitchLinks.forEach(link => {
        if (link.getAttribute('data-lang') === currentLang.substring(0, 2)) { // 'en' or 'zh'
            link.classList.add('active-lang');
        } else {
            link.classList.remove('active-lang');
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedLang = link.getAttribute('data-lang');
            localStorage.setItem('preferredLang', selectedLang);

            // Determine target language for switchToLanguage
            const targetLangForSwitch = (selectedLang === 'zh') ? 'zh-TW' : 'en';
            switchToLanguage(targetLangForSwitch);
        });
    });

    // Redirect based on localStorage preference if not on the preferred language page
    const preferredLang = localStorage.getItem('preferredLang');
    if (preferredLang) {
        const currentLangShort = currentLang.substring(0, 2); // 'en' or 'zh'
        if (preferredLang !== currentLangShort) {
            // If on an English page but prefer Chinese
            if (preferredLang === 'zh' && !currentPath.includes('-zh.html')) {
                switchToLanguage('zh-TW');
            }
            // If on a Chinese page but prefer English
            else if (preferredLang === 'en' && currentPath.includes('-zh.html')) {
                switchToLanguage('en');
            }
        }
    }


    // --- tsparticles Initialization for Abstract Digital Grid & Pulses ---
    if (typeof tsParticles !== 'undefined' && document.getElementById('tsparticles')) {
        tsParticles.load("tsparticles", {
            fpsLimit: 60,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: "bubble" // Pulse effect on hover
                    },
                    onClick: {
                        enable: true,
                        mode: "push" // Push particles on click
                    },
                    resize: true
                },
                modes: {
                    bubble: {
                        distance: 150,
                        size: 10, // Larger pulse size
                        duration: 0.6,
                        opacity: 0.8,
                        color: "#38F321" // Signal Green for pulse
                    },
                    push: {
                        quantity: 3
                    },
                    repulse: { // Kept if needed for other interactions, but bubble is primary for hover
                        distance: 100,
                        duration: 0.4
                    }
                }
            },
            particles: {
                number: {
                    value: 60, // Medium-low density
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: ["#00B4D8", "#5E60CE"] // Neon Blue and Ultraviolet
                },
                shape: {
                    type: "triangle", // Or "circle"
                },
                opacity: {
                    value: { min: 0.2, max: 0.7 }, // Energy-like transparency
                    random: true,
                    anim: {
                        enable: true,
                        speed: 0.8,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: { min: 1, max: 4 }, // Mostly small particles
                    random: true,
                    anim: { // Subtle size animation for "breathing" effect
                        enable: true,
                        speed: 2,
                        size_min: 0.5,
                        sync: false
                    }
                },
                links: {
                    enable: true,
                    distance: 130,
                    color: "rgba(0, 180, 216, 0.3)", // Neon Blue links, more transparent
                    opacity: 0.3,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 1.2, // Slow, steady movement
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    attract: { // Slight attraction for a more organic feel
                        enable: true,
                        rotateX: 600,
                        rotateY: 1200,
                        strength: 0.1 // Very subtle attraction
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
                // Optional: unobserve after animation
                // observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        revealObserver.observe(el);
    });

    // --- Glitch Text Effect (Simple JS enhancement for timing/randomness if needed) ---
    // The CSS animation is already quite good. JS could be used to:
    // 1. Randomize animation timings or intensity.
    // 2. Trigger glitch on hover or other events.
    // For now, relying on CSS for simplicity as per "no build tools" and easy source view.
    // If more complex JS-driven glitch is desired, it can be added here.

    // --- Parallax Scroll (Basic example if needed, CSS might be preferred for simplicity) ---
    // window.addEventListener('scroll', () => {
    //     const scrolled = window.pageYOffset;
    //     const heroContent = document.querySelector('#hero .hero-content .glitch'); // Example target
    //     if (heroContent) {
    //         // Adjust '0.5' for different parallax speeds
    //         heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
    //     }
    // });
    // Note: CSS transform for parallax can sometimes conflict with IntersectionObserver transforms.
    // Careful implementation is needed if both are heavily used on same elements.
    // The project plan focuses on CSS for parallax layers.

});