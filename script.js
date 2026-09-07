// Auto-update grade based on school year (advances each August)
// Base: 8th grade starting fall 2026
const GRADE_BASE = 8;
const GRADE_BASE_YEAR = 2026; // school year starting August 2026

function getSchoolYearStart(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 = Jan, 7 = Aug
    return month >= 7 ? year : year - 1;
}

function getCurrentGrade(date = new Date()) {
    const yearsPassed = getSchoolYearStart(date) - GRADE_BASE_YEAR;
    return GRADE_BASE + yearsPassed;
}

function toOrdinal(n) {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}

function getGradeDisplay(date = new Date()) {
    const grade = getCurrentGrade(date);
    if (grade < 1) {
        return { ordinal: 'K', labelCapital: 'Kindergarten', labelLower: 'kindergarten' };
    }
    if (grade > 12) {
        return { ordinal: 'Graduate', labelCapital: 'Graduate', labelLower: 'graduate' };
    }
    const ordinal = toOrdinal(grade);
    return {
        ordinal,
        labelCapital: `${ordinal} Grade`,
        labelLower: `${ordinal} grade`
    };
}

function updateGradeDisplays() {
    const { labelCapital, labelLower } = getGradeDisplay();
    document.querySelectorAll('[data-grade="label"]').forEach((el) => {
        el.textContent = el.dataset.case === 'lower' ? labelLower : labelCapital;
    });
}

updateGradeDisplays();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animate skill bars on scroll
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const skillFill = entry.target.querySelector('.skill-fill');
            if (skillFill) {
                const width = skillFill.style.width;
                skillFill.style.width = '0';
                setTimeout(() => {
                    skillFill.style.width = width;
                }, 100);
            }
        }
    });
}, observerOptions);

// Observe all skill items
document.querySelectorAll('.skill-item').forEach(item => {
    observer.observe(item);
});

// Add active state to navigation on scroll
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-menu a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Add fade-in animation on scroll
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1
});

// Observe cards for fade-in effect
document.querySelectorAll('.interest-card, .project-card, .skill-item, .goal-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    fadeObserver.observe(card);
});

