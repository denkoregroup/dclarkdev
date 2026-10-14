/* ============================================================
   NAVBAR – scroll effect & hamburger
   ============================================================ */
(function () {
  const navbar   = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navDrawer = document.getElementById('navDrawer');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const isOpen = navDrawer.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close drawer when a link is clicked
  navDrawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navDrawer.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ============================================================
   CAROUSEL
   ============================================================ */
(function () {
  const track    = document.getElementById('carTrack');
  const viewport = document.getElementById('carViewport');
  const prevBtn  = document.getElementById('carPrev');
  const nextBtn  = document.getElementById('carNext');
  const dotsWrap = document.getElementById('carDots');

  if (!track) return;

  const cards    = Array.from(track.children);
  let current    = 0;

  function getVisible() {
    const vw = window.innerWidth;
    if (vw <= 700) return 1;
    if (vw <= 900) return 2;
    return 3;
  }

  function maxIndex() {
    return Math.max(0, cards.length - getVisible());
  }

  // Build dots
  function buildDots() {
    dotsWrap.innerHTML = '';
    const max = maxIndex();
    for (let i = 0; i <= max; i++) {
      const dot = document.createElement('button');
      dot.className = 'car-dot' + (i === current ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function updateDots() {
    dotsWrap.querySelectorAll('.car-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  function goTo(idx) {
    const max = maxIndex();
    // Wrap around for infinite navigation
    if (idx < 0) idx = max;
    if (idx > max) idx = 0;
    current = idx;
    const cardW  = cards[0].offsetWidth + 20; // gap = 20
    track.style.transform = `translateX(-${current * cardW}px)`;
    updateDots();
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Keyboard navigation when focused inside carousel
  viewport.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  // Touch / swipe
  let touchStartX = 0;
  viewport.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  viewport.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
  }, { passive: true });

  // Init & reflow on resize
  buildDots();
  goTo(0);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildDots();
      goTo(Math.min(current, maxIndex()));
    }, 120);
  }, { passive: true });
})();

/* ============================================================
   CONTACT MODAL
   ============================================================ */
(function () {
  const modal     = document.getElementById('contactModal');
  const closeBtn  = document.getElementById('modalClose');
  const form      = document.getElementById('contactForm');

  if (!modal) return;

  function openModal() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // All links/buttons pointing to #contact open the modal
  document.querySelectorAll('a[href="#contact"], button[href="#contact"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      openModal();
    });
  });

  closeBtn.addEventListener('click', closeModal);

  // Click backdrop to close
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // Form submission (demo – shows success state)
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      // Simple validation
      let valid = true;
      form.querySelectorAll('[required]').forEach(field => {
        field.closest('.form-field').classList.remove('error');
        if (!field.value.trim()) {
          field.closest('.form-field').classList.add('error');
          valid = false;
        }
      });

      // Email format check
      const emailField = form.querySelector('#fEmail');
      if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        emailField.closest('.form-field').classList.add('error');
        valid = false;
      }

      if (!valid) return;

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          form.innerHTML = `
            <div class="form-success">
              <i class="fas fa-check-circle"></i>
              <h4>Message Sent!</h4>
              <p>Thanks for reaching out. I'll get back to you within 24 hours.</p>
            </div>`;
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
          alert('Something went wrong. Please try again.');
        }
      })
      .catch(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        alert('Network error. Please try again.');
      });
    });
  }
})();

/* ============================================================
   FLOATING ACTION BUTTON (FAB)
   ============================================================ */
(function () {
  const fab = document.getElementById('fabButton');
  const hero = document.getElementById('home');
  const contactSect = document.getElementById('contact');
  const modal = document.getElementById('contactModal');

  if (!fab || !hero) return;

  function updateFABVisibility() {
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    const scrollPos = window.scrollY + window.innerHeight;

    // Show FAB after hero section
    let shouldShow = window.scrollY > heroBottom - 200;

    // Hide when contact section is visible (if it exists)
    if (contactSect) {
      const contactTop = contactSect.offsetTop;
      if (scrollPos >= contactTop + 200) {
        shouldShow = false;
      }
    }

    if (shouldShow) {
      fab.classList.add('visible');
      // Add pulse animation after 5 seconds of being visible
      setTimeout(() => {
        if (fab.classList.contains('visible')) fab.classList.add('pulse');
      }, 5000);
    } else {
      fab.classList.remove('visible', 'pulse');
    }
  }

  // FAB click opens modal
  fab.addEventListener('click', () => {
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    fab.classList.remove('pulse'); // Stop pulsing once clicked
  });

  // Update FAB on scroll
  window.addEventListener('scroll', updateFABVisibility, { passive: true });
  updateFABVisibility(); // Initial check
})();

/* ============================================================
   SCROLL-TRIGGERED ANIMATIONS
   ============================================================ */
(function () {
  const targets = document.querySelectorAll('[data-animate]');
  if (!targets.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
})();

/* ============================================================
   ACTIVE NAV LINK (highlight on scroll)
   ============================================================ */
(function () {
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .drawer-link');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
})();
