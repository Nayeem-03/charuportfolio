class PathfindingVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animationFrameId = null;
        this.cellSize = 25;
        this.headerFadeZone = 120; // The height (in pixels) of the fade-out area at the top

        this.reset();
        window.addEventListener('resize', () => this.reset());
        // Listen for theme changes to redraw with new colors
        document.querySelector('.theme-toggle').addEventListener('click', () => this.draw());
        document.querySelectorAll('.palette-option').forEach(el => el.addEventListener('click', () => setTimeout(() => this.draw(), 50)));
    }

    reset() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);

        this.grid = Array.from({ length: this.cols }, () => Array(this.rows).fill(0));
        this.queue = [];
        this.visited = new Set();
        this.path = [];
        this.parentMap = new Map();

        // Create random obstacles
        for (let i = 0; i < (this.cols * this.rows) * 0.2; i++) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);
            // Ensure obstacles are not in the fade zone to look cleaner
            if (y * this.cellSize > this.headerFadeZone) {
                this.grid[x][y] = 1; // 1 represents a wall
            }
        }

        // Set start and end points
        this.start = this.getRandomEmptyCell();
        this.end = this.getRandomEmptyCell();
        if(!this.start || !this.end) return; // Grid is too full

        this.grid[this.start.x][this.start.y] = 0;
        this.grid[this.end.x][this.end.y] = 0;

        this.queue.push(this.start);
        this.visited.add(`${this.start.x},${this.start.y}`);
        
        this.state = 'searching';
        this.lastUpdateTime = 0;
        this.searchSpeed = 15; // Adjusted speed

        this.animate();
    }
    
    getRandomEmptyCell() {
        let x, y, attempts = 0;
        do {
            x = Math.floor(Math.random() * this.cols);
            y = Math.floor(Math.random() * this.rows);
            if (attempts++ > 100) return null; // Prevent infinite loop
        } while (this.grid[x][y] === 1 || (y * this.cellSize < this.headerFadeZone));
        return { x, y };
    }

    bfsStep() {
        if (this.queue.length === 0) {
            this.state = 'done';
            setTimeout(() => this.reset(), 4000); // Restart if no path found
            return;
        }

        const current = this.queue.shift();

        if (current.x === this.end.x && current.y === this.end.y) {
            this.state = 'pathfound';
            let temp = current;
            while (temp) {
                this.path.unshift(temp);
                temp = this.parentMap.get(`${temp.x},${temp.y}`);
            }
            setTimeout(() => this.reset(), 4000); // Restart after 4 seconds
            return;
        }

        const neighbors = [
            { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
        ];

        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            if (neighbor.x >= 0 && neighbor.x < this.cols &&
                neighbor.y >= 0 && neighbor.y < this.rows &&
                this.grid[neighbor.x][neighbor.y] !== 1 && !this.visited.has(key)) {
                
                this.visited.add(key);
                this.parentMap.set(key, current);
                this.queue.push(neighbor);
            }
        }
    }
    
    draw() {
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
        
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const originalAlpha = this.ctx.globalAlpha;

        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                const yPos = y * this.cellSize;
                const fade = Math.min(1, Math.max(0, (yPos - this.headerFadeZone / 2) / (this.headerFadeZone / 2)));
                this.ctx.globalAlpha = fade;

                const key = `${x},${y}`;
                if (this.grid[x][y] === 1) { // Wall
                    this.ctx.fillStyle = `color-mix(in srgb, ${secondaryColor}, transparent 50%)`;
                    this.ctx.fillRect(x * this.cellSize, yPos, this.cellSize, this.cellSize);
                } else if (this.visited.has(key)) { // Visited
                    this.ctx.fillStyle = `color-mix(in srgb, ${accentColor}, transparent 85%)`;
                    this.ctx.fillRect(x * this.cellSize, yPos, this.cellSize - 1, this.cellSize - 1);
                }
            }
        }
        
        if (this.state === 'pathfound') {
            this.ctx.lineWidth = Math.max(2, this.cellSize / 5);
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.path.forEach((p, i) => {
                const xPos = p.x * this.cellSize + this.cellSize / 2;
                const yPos = p.y * this.cellSize + this.cellSize / 2;
                
                const fade = Math.min(1, Math.max(0, (yPos - this.headerFadeZone / 2) / (this.headerFadeZone / 2)));
                this.ctx.strokeStyle = `color-mix(in srgb, ${accentColor}, transparent ${100 - (fade * 100)}%)`;
                
                if (i === 0) this.ctx.moveTo(xPos, yPos);
                else this.ctx.lineTo(xPos, yPos);
            });
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = originalAlpha;

        this.ctx.fillStyle = accentColor;
        if (this.start) {
            this.ctx.beginPath();
            this.ctx.arc(
                this.start.x * this.cellSize + this.cellSize / 2,
                this.start.y * this.cellSize + this.cellSize / 2,
                this.cellSize / 3, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
        if (this.end) {
            this.ctx.beginPath();
            this.ctx.arc(
                this.end.x * this.cellSize + this.cellSize / 2,
                this.end.y * this.cellSize + this.cellSize / 2,
                this.cellSize / 3, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    animate(timestamp) {
        if (this.state === 'searching') {
            if (!this.lastUpdateTime || timestamp - this.lastUpdateTime > this.searchSpeed) {
                this.bfsStep();
                this.lastUpdateTime = timestamp;
            }
        }
        this.draw();
        this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
    }
}


// --- CONFIGURATION ---
const config = {
    name: "Charukesh G.R",
    title: "Full Stack Developer | Aspiring Cloud Engineer",
    socials: {
        github: "https://github.com/charuhere",
        linkedin: "https://www.linkedin.com/in/charukesh-grandhe-2247a6289/",
        leetcode: "https://leetcode.com/u/charu_here21/"
    },
    about: {
        bio: "I'm a B.Tech student in Information Technology at VIT Vellore (CGPA: 9.71/10), with a strong focus on data structures and algorithms, backend development, and machine learning. Proficient in C++ and Python, with hands-on experience in building AI models and full-stack web applications.",
        picture: "assets/charuProfile.png",
        facts: {
            "Location": "Chennai, India",
            "Education": "VIT Vellore (2023–2027)",
            "Hobbies": "Competitive Coding, Building Scalable Systems"
        }
    },
    skills: [
  { name: "HTML5", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" },
  { name: "CSS3", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" },
  { name: "JavaScript", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
  { name: "Python", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
  { name: "C++", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
  { name: "Node.js", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" },
  { name: "MongoDB", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" },
  { name: "Flask", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg" },
  { name: "TensorFlow", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
  { name: "Git", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
  { name: "GitHub", img: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" }
]
,
    projects: [
        { title: "Waste Classification Model", description: "Built a real-time waste classification model using SSD MobileNet V2 with 92% accuracy on a custom dataset. Optimized training with CUDA/cuDNN for 3x faster performance.", image: "https://placehold.co/400x250/3f3f46/f4f4f5?text=Project+1", stack: ["TensorFlow", "OpenCV", "Python"], links: { github: "https://github.com/Nayeem-03/WasteClassification", live: "#" } },
        { title: "CodeHint Assistant", description: "AI-powered Chrome Extension used by 100+ users to inject hints directly into LeetCode problem pages, featuring a secure Node.js backend with the Gemini API.", image: "https://placehold.co/400x250/3f3f46/f4f4f5?text=Project+2", stack: ["JavaScript", "Node.js", "Gemini API"], links: { github: "https://github.com/charuhere/ChromeExtension", live: "#" } },
        { title: "AquaLearn Mobile App", description: "A React Native mobile app for water hygiene awareness, featuring interactive quizzes and contextual chatbot support. Led frontend development in a 4-member team.", image: "https://placehold.co/400x250/3f3f46/f4f4f5?text=Project+3", stack: ["React Native", "Expo.js", "Gemini API"], links: { github: "#", live: "#" } }
    ],
    resume: {
        file: "assets/Charu_s_Resume.pdf",
        timeline: [
            { 
                role: "B.Tech in Information Technology", 
                date: "Aug 2023 – Aug 2027", 
                description: `Vellore Institute of Technology (CGPA: 9.71/10). Focusing on data structures, algorithms, backend development, and machine learning.
                <ul class="timeline-projects">
                    <li><b>AquaLearn Mobile App:</b> Led frontend development for a React Native app promoting water hygiene awareness during a 3-day sprint.</li>
                    <li><b>CodeHint Assistant:</b> Built an AI-powered Chrome Extension for 100+ users on LeetCode, handling 200+ hint requests via a Node.js backend.</li>
                    <li><b>Waste Classification Model:</b> Led model training and deployment for a real-time waste classification model with 92% accuracy using TensorFlow.</li>
                </ul>`
            },
            { 
                role: "Higher Secondary & Secondary Education", 
                date: "Jun 2009 – Mar 2023", 
                description: "Chinmaya Vidyalaya (CBSE). Completed schooling with a strong academic record, securing 97% in Class 12 and 98.6% in Class 10." 
            }
        ]
    }
};

const THEMES = {
    amber: {
        displayName: 'Amber',
        swatchColor: '#f59e0b',
        dark: { bg: '#18181b', primary: '#27272a', secondary: '#3f3f46', text: '#f4f4f5', accent: '#f59e0b', hover: '#d97706' },
        light: { bg: '#f4f4f5', primary: '#ffffff', secondary: '#e4e4e7', text: '#18181b', accent: '#f59e0b', hover: '#d97706' }
    },
    forest: {
        displayName: 'Forest',
        swatchColor: '#34d399',
        dark: { bg: '#1a2a27', primary: '#243b35', secondary: '#3e5e55', text: '#e8f1ee', accent: '#34d399', hover: '#059669' },
        light: { bg: '#f0fdf4', primary: '#ffffff', secondary: '#dcfce7', text: '#14532d', accent: '#34d399', hover: '#059669' }
    },
    sky: {
        displayName: 'Sky',
        swatchColor: '#38bdf8',
        dark: { bg: '#0c1d3e', primary: '#1a2c4a', secondary: '#2a446b', text: '#e0e8f6', accent: '#38bdf8', hover: '#0284c7' },
        light: { bg: '#f0f9ff', primary: '#ffffff', secondary: '#e0f2fe', text: '#075985', accent: '#38bdf8', hover: '#0284c7' }
    },
    rose: {
        displayName: 'Rose',
        swatchColor: '#f43f5e',
        dark: { bg: '#3a1928', primary: '#532135', secondary: '#7e324f', text: '#f9e8ee', accent: '#f43f5e', hover: '#be123c' },
        light: { bg: '#fff1f2', primary: '#ffffff', secondary: '#ffe4e6', text: '#881337', accent: '#f43f5e', hover: '#be123c' }
    }
};

// --- FUNCTIONS ---

function applyTheme() {
    const paletteName = localStorage.getItem('colorPalette') || 'amber';
    const mode = localStorage.getItem('themeMode') || 'dark';
    const palette = THEMES[paletteName][mode];
    const root = document.documentElement;
    Object.keys(palette).forEach(key => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-color`;
        root.style.setProperty(cssVar, palette[key]);
    });
    const themeIcon = document.getElementById('theme-icon');
    if (mode === 'light') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

function setupThemeToggle() {
    const themeToggleButton = document.querySelector('.theme-toggle');
    themeToggleButton.addEventListener('click', () => {
        const currentMode = localStorage.getItem('themeMode') || 'dark';
        const newMode = currentMode === 'dark' ? 'light' : 'dark';
        localStorage.setItem('themeMode', newMode);
        applyTheme();
    });
}

function setupColorPalette() {
    const paletteToggle = document.querySelector('.palette-toggle');
    const paletteOptions = document.getElementById('palette-options');
    Object.keys(THEMES).forEach(name => {
        const theme = THEMES[name];
        const swatch = document.createElement('button');
        swatch.classList.add('palette-option');
        swatch.style.backgroundColor = theme.swatchColor;
        swatch.dataset.paletteName = name;
        swatch.setAttribute('aria-label', `Select ${theme.displayName} theme`);
        paletteOptions.appendChild(swatch);
        swatch.addEventListener('click', (e) => {
            localStorage.setItem('colorPalette', e.currentTarget.dataset.paletteName);
            applyTheme();
            paletteOptions.classList.remove('active');
        });
    });
    paletteToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        paletteOptions.classList.toggle('active');
    });
    document.addEventListener('click', () => paletteOptions.classList.remove('active'));
}

function populateData() {
    document.getElementById('html-title').textContent = `${config.name} - Personal Portfolio`;
    document.getElementById('logo-name').textContent = config.name;
    document.getElementById('hero-name').textContent = `Hi, I'm ${config.name}`;
    document.getElementById('hero-title').textContent = config.title;
    const socialLinks = `<a href="${config.socials.github}" target="_blank" aria-label="GitHub"><i class="fa-brands fa-github"></i></a><a href="${config.socials.linkedin}" target="_blank" aria-label="LinkedIn"><i class="fa-brands fa-linkedin"></i></a><a href="${config.socials.leetcode}" target="_blank" aria-label="LeetCode"><i class="fa-solid fa-code"></i></a>`;
    document.getElementById('hero-socials').innerHTML = socialLinks;
    document.getElementById('footer-socials').innerHTML = socialLinks;
    document.getElementById('about-picture').src = config.about.picture;
    document.getElementById('about-bio').textContent = config.about.bio;
    const factsContainer = document.getElementById('about-facts');
    factsContainer.innerHTML = '';
    for (const [key, value] of Object.entries(config.about.facts)) {
        const icon = key === 'Location' ? 'fa-location-dot' : key === 'Education' ? 'fa-graduation-cap' : 'fa-code';
        factsContainer.innerHTML += `<span><i class="fa-solid ${icon}"></i> ${value}</span>`;
    }
    const skillsGrid = document.getElementById('skills-grid');
    skillsGrid.innerHTML = '';
    config.skills.forEach(skill => {
        let iconHtml;
        if (skill.icon) {
            // Handle Font Awesome icons
            iconHtml = `<i class="fa-brands ${skill.icon}"></i>`;
        } else if (skill.img) {
            // Handle image/SVG icons
            iconHtml = `<img src="${skill.img}" alt="${skill.name} icon" class="skill-img">`;
        }
        if (iconHtml) {
            skillsGrid.innerHTML += `<div class="skill-item">${iconHtml}<span>${skill.name}</span></div>`;
        }
    });
    const projectsGrid = document.getElementById('projects-grid');
    projectsGrid.innerHTML = '';
    config.projects.forEach(project => {
        projectsGrid.innerHTML += `<div class="project-card"><img src="${project.image}" alt="${project.title}" class="project-img" loading="lazy"><div class="project-content"><h3 class="project-title">${project.title}</h3><p class="project-description">${project.description}</p><div class="project-stack">${project.stack.map(tech => `<span>${tech}</span>`).join('')}</div><div class="project-links"><a href="${project.links.github}" target="_blank"><i class="fa-brands fa-github"></i> GitHub</a><a href="${project.links.live}" target="_blank"><i class="fa-solid fa-up-right-from-square"></i> Live Demo</a></div></div></div>`;
    });
    document.getElementById('download-cv').href = config.resume.file;
    const timelineContainer = document.getElementById('resume-timeline');
    timelineContainer.innerHTML = '';
    config.resume.timeline.forEach(item => {
        timelineContainer.innerHTML += `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4>${item.role}</h4><p class="timeline-date">${item.date}</p><div>${item.description}</div></div></div>`;
    });
    document.getElementById('copyright').innerHTML = `&copy; ${new Date().getFullYear()} ${config.name}. All Rights Reserved.`;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const statusDiv = document.getElementById('contact-status');
    const submitBtn = document.getElementById('contact-submit-btn');
    const formData = new FormData(form);
    const formspreeEndpoint = "https://formspree.io/f/movldrgo";

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending... <i class="fa-solid fa-spinner fa-spin"></i>';
    statusDiv.style.display = 'none';

    try {
        const response = await fetch(formspreeEndpoint, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            statusDiv.textContent = "Thank you for your message! I'll get back to you soon.";
            statusDiv.className = 'success';
            form.reset();
        } else {
            const data = await response.json();
            if (Object.hasOwn(data, 'errors')) {
                statusDiv.textContent = data["errors"].map(error => error["message"]).join(", ");
            } else {
                statusDiv.textContent = "Oops! Something went wrong. Please try again later.";
            }
            statusDiv.className = 'error';
        }
    } catch (error) {
        statusDiv.textContent = "Oops! Something went wrong. Please try again later.";
        statusDiv.className = 'error';
    } finally {
        statusDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message <i class="fa-solid fa-paper-plane"></i>';
    }
}

function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error("FATAL: Contact form not found.");
    }
}

function setupPathfindingVisualizer() {
    const canvas = document.getElementById('pathfinding-canvas');
    if (canvas) {
        new PathfindingVisualizer(canvas);
    }
}

function setupScrollListeners() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar a');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { rootMargin: '-50% 0px -50% 0px' });
    sections.forEach(section => observer.observe(section));
}

function setupTimelineAnimation() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    if (!timelineItems.length) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { rootMargin: '0px', threshold: 0.5 });
    timelineItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 150}ms`;
        observer.observe(item);
    });
}

function setupProjectAnimation() {
    const projectCards = document.querySelectorAll('.project-card');
    if (!projectCards.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { rootMargin: '0px', threshold: 0.1 });

    projectCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 100}ms`;
        observer.observe(card);
    });
}

// --- INITIALIZATION ---
console.log("✅ Portfolio script loaded. Initializing...");

populateData();
setupThemeToggle();
setupColorPalette();
setupContactForm();
setupScrollListeners();
setupTimelineAnimation();
setupProjectAnimation();
applyTheme();
setupPathfindingVisualizer();

console.log("✅ Initialization complete.");