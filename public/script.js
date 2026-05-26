/* ══════════════════════════════════════════
   NINJA9IT · Main Script
══════════════════════════════════════════ */

// ── SMOKE CANVAS ──────────────────────────
(function initSmoke() {
  const canvas = document.getElementById('smokeCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, running = true;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Smoke {
    constructor() { this.reset(true); }
    reset(immediate) {
      this.x  = W / 2 + (Math.random() - .5) * 90;
      this.y  = H / 2 + 80;
      this.vx = (Math.random() - .5) * .55;
      this.vy = -(Math.random() * 1.1 + .4);
      this.r  = Math.random() * 50 + 15;
      this.life    = immediate ? Math.random() * 140 : 0;
      this.maxLife = Math.random() * 160 + 120;
    }
    update() {
      this.x  += this.vx;
      this.y  += this.vy;
      this.r  += .28;
      this.life++;
      if (this.life >= this.maxLife) this.reset(false);
    }
    draw() {
      const t = this.life / this.maxLife;
      const a = .14 * Math.sin(t * Math.PI);
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      g.addColorStop(0, `rgba(120,15,15,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  const particles = Array.from({ length: 20 }, () => new Smoke());

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();

  window._stopSmoke = () => { running = false; };
})();


// ── LOADER ────────────────────────────────
(function initLoader() {
  const loader   = document.getElementById('loader');
  const mainPage = document.getElementById('mainPage');
  const fill     = document.getElementById('progressFill');
  const pct      = document.getElementById('progressPct');

  const DURATION = 2800;
  const start    = performance.now();

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(100, (elapsed / DURATION) * 100);
    fill.style.width   = progress + '%';
    pct.textContent    = Math.floor(progress) + '%';

    if (progress < 100) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => {
        window._stopSmoke?.();
        loader.classList.add('fade-out');
        mainPage.classList.add('visible');
        setTimeout(() => {
          loader.style.display = 'none';
          initReveal();
        }, 800);
      }, 280);
    }
  }
  requestAnimationFrame(tick);
})();


// ── NAVBAR SCROLL ─────────────────────────
(function initNavbar() {
  const nav = document.getElementById('navbar');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


// ── HAMBURGER ─────────────────────────────
(function initHamburger() {
  const burger = document.getElementById('navBurger');
  const links  = document.getElementById('navLinks');

  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    links.classList.toggle('open');
  });

  links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      links.classList.remove('open');
    })
  );
})();


// ── MENU DATA ─────────────────────────────
const MENU = {
  beers: [
    {
      name: 'Phoenix Beer',
      price: 'Rs 85',
      tag: '🇲🇺 Local Legend',
      desc: "Mauritius' golden lager — the island's pride since 1963."
    },
    {
      name: 'Blue Marlin',
      price: 'Rs 95',
      tag: '🇲🇺 Local',
      desc: 'Crisp Mauritian craft lager with a tropical finish.'
    },
    {
      name: 'Stella Artois',
      price: 'Rs 120',
      tag: 'Premium',
      desc: 'Belgian pilsner. Smooth, balanced, timeless.'
    },
    {
      name: 'Heineken',
      price: 'Rs 115',
      tag: 'Import',
      desc: 'Dutch premium lager. A world favourite.'
    },
    {
      name: 'Corona Extra',
      price: 'Rs 130',
      tag: 'Import',
      desc: 'Mexican pale lager — best with a wedge of lime.'
    },
    {
      name: 'Guinness',
      price: 'Rs 145',
      tag: 'Dark Stout',
      desc: 'Irish dry stout with rich roasted depth.'
    },
  ],
  spirits: [
    {
      name: 'Green Island Rum',
      price: 'Rs 450',
      tag: '🇲🇺 Local',
      desc: 'Smooth Mauritian white rum — legendary on the island.'
    },
    {
      name: 'Chamarel Rum',
      price: 'Rs 780',
      tag: '🇲🇺 Premium',
      desc: 'Award-winning aged rum from the hills of Chamarel, Mauritius.'
    },
    {
      name: "Grey Goose Vodka",
      price: 'Rs 1,450',
      tag: 'Vodka',
      desc: 'French ultra-premium vodka. Pure, smooth, refined.'
    },
    {
      name: "Jameson",
      price: 'Rs 1,100',
      tag: 'Irish Whiskey',
      desc: 'Triple-distilled Irish whiskey. Smooth and versatile.'
    },
    {
      name: 'Chivas Regal 12',
      price: 'Rs 1,800',
      tag: 'Scotch',
      desc: 'Blended Scotch whisky aged 12 years. Rich and warm.'
    },
    {
      name: 'Moët & Chandon',
      price: 'Rs 3,500',
      tag: 'Champagne',
      desc: 'French Brut Impérial. Pure celebration in a bottle.'
    },
  ],
  wines: [
    {
      name: 'Malbec Reserve',
      price: 'Rs 850',
      tag: 'Red Wine',
      desc: 'Argentinian full-bodied red with dark fruit and velvet tannins.'
    },
    {
      name: 'Sauvignon Blanc',
      price: 'Rs 780',
      tag: 'White Wine',
      desc: 'New Zealand crisp white — citrus, elderflower, gooseberry.'
    },
    {
      name: 'Rosé Provençal',
      price: 'Rs 950',
      tag: 'Rosé',
      desc: 'Classic French rosé. Elegant, dry, refreshing.'
    },
    {
      name: 'Prosecco DOC',
      price: 'Rs 1,100',
      tag: 'Sparkling',
      desc: 'Italian sparkling wine — vibrant bubbles and light fruit.'
    },
    {
      name: 'Shiraz Classic',
      price: 'Rs 720',
      tag: 'Red Wine',
      desc: 'Bold Australian Shiraz. Spiced plum with a smoky finish.'
    },
    {
      name: 'Pinot Grigio',
      price: 'Rs 810',
      tag: 'White Wine',
      desc: 'Italian dry white — crisp, clean and food-friendly.'
    },
  ],
  cocktails: [
    {
      name: 'Ninja Shadow',
      price: 'Rs 280',
      tag: '★ Signature',
      desc: 'Black vodka, elderflower liqueur, fresh lime, activated charcoal. Bold and dark.'
    },
    {
      name: 'Isle Punch',
      price: 'Rs 250',
      tag: '🇲🇺 MU Special',
      desc: 'Local rum, tropical fruits, island spices. Pure Mauritius in a glass.'
    },
    {
      name: 'Dark Striker',
      price: 'Rs 290',
      tag: '★ Signature',
      desc: 'Dark rum, ginger beer, aromatic bitters, orange twist.'
    },
    {
      name: 'Mango Katana',
      price: 'Rs 240',
      tag: 'Tropical',
      desc: 'Mango rum, passion fruit, fresh mint, soda water.'
    },
    {
      name: 'Blue Lagoon MU',
      price: 'Rs 260',
      tag: '🇲🇺 MU Special',
      desc: 'Vodka, blue curaçao, lemon juice — inspired by our Indian Ocean.'
    },
    {
      name: 'Cane Warrior',
      price: 'Rs 270',
      tag: '★ Signature',
      desc: 'Mauritian rum, fresh cane sugar, lime, Angostura bitters.'
    },
  ],
  softs: [
    {
      name: 'Eski Cola',
      price: 'Rs 45',
      tag: '🇲🇺 Local',
      desc: "Mauritius' own cola. Refreshing and nostalgic."
    },
    {
      name: 'Tropical Juice Mix',
      price: 'Rs 65',
      tag: 'Fresh',
      desc: 'Mango, passion fruit & guava blend. 100% island flavour.'
    },
    {
      name: 'Perrier Sparkling',
      price: 'Rs 85',
      tag: 'Premium',
      desc: 'French sparkling mineral water — refined fizz.'
    },
    {
      name: 'Red Bull',
      price: 'Rs 95',
      tag: 'Energy',
      desc: 'The classic energy drink. Wings guaranteed.'
    },
    {
      name: 'Lemon Squash',
      price: 'Rs 55',
      tag: 'Refresh',
      desc: 'Fresh-squeezed lemon with sparkling water.'
    },
    {
      name: 'Virgin Mojito',
      price: 'Rs 120',
      tag: 'Mocktail',
      desc: 'Fresh mint, lime, cane sugar, sparkling water. Zero alcohol, full flavour.'
    },
  ],
};


// ── MENU RENDERER ─────────────────────────
(function initMenu() {
  const grid = document.getElementById('menuGrid');
  const tabs = document.querySelectorAll('.tab-btn');

  function render(tabKey) {
    grid.classList.add('fading');
    setTimeout(() => {
      grid.innerHTML = MENU[tabKey].map((item, i) => `
        <div class="menu-card" style="animation-delay:${i * 0.055}s">
          <div class="card-top">
            <span class="card-name">${item.name}</span>
            <span class="card-price">${item.price}</span>
          </div>
          <span class="card-tag">${item.tag}</span>
          <p class="card-desc">${item.desc}</p>
          <button class="card-order-btn" onclick="prefillOrder('${item.name.replace(/'/g, "\\'")}')">
            Order this →
          </button>
        </div>
      `).join('');
      grid.classList.remove('fading');
    }, 220);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      render(tab.dataset.tab);
    });
  });

  render('beers');
})();


// ── PREFILL ORDER FROM MENU ────────────────
function prefillOrder(drinkName) {
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const notes = document.querySelector('textarea[name="notes"]');
    if (notes && !notes.value.trim()) notes.value = drinkName;
  }, 650);
}


// ── FORM SUBMISSION ────────────────────────
(function initForm() {
  const form   = document.getElementById('orderForm');
  const modal  = document.getElementById('orderModal');
  const btn    = document.getElementById('submitBtn');

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Validate required fields
    const required = form.querySelectorAll('[required]');
    let valid = true;
    required.forEach(field => {
      if (!field.value.trim()) {
        valid = false;
        field.style.borderColor = 'var(--red)';
        field.style.boxShadow   = '0 0 0 3px rgba(230,57,70,.2)';
        setTimeout(() => {
          field.style.borderColor = '';
          field.style.boxShadow   = '';
        }, 2200);
      }
    });
    if (!valid) return;

    btn.innerHTML = '<span>Deploying…</span> ⏳';
    btn.disabled  = true;

    setTimeout(() => {
      btn.innerHTML = `<span>Deploy My Order</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>`;
      btn.disabled = false;
      form.reset();
      modal.classList.add('active');
    }, 1200);
  });
})();

function closeModal() {
  document.getElementById('orderModal').classList.remove('active');
}

// Close modal on backdrop click
document.getElementById('orderModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});


// ── SCROLL REVEAL ─────────────────────────
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

  items.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 5) * 0.07}s`;
    obs.observe(el);
  });
}


// ── SMOOTH ANCHOR LINKS ───────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
