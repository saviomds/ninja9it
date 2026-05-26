/* ══════════════════════════════════════════
   NINJA9IT · Client Script
   Cart · Toast · Call Widget · Animations
══════════════════════════════════════════ */

// ── SERVICE WORKER + PWA INSTALL ──────────
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var deferredPrompt = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isStandalone = window.navigator.standalone === true ||
                     window.matchMedia('(display-mode: standalone)').matches;
  var DISMISS_KEY  = 'n9it_pwa_dismissed';
  var DISMISS_DAYS = 7;

  // Elements (resolved after DOMContentLoaded)
  var banner, navBtn, mobileLink, cardOverlay;

  function wasDismissed() {
    var ts = localStorage.getItem(DISMISS_KEY);
    return ts && (Date.now() - parseInt(ts, 10)) < DISMISS_DAYS * 86400000;
  }

  /* ── Pop Card ── */
  function openCard() {
    if (!cardOverlay) return;
    cardOverlay.style.display = 'flex';
    hideBanner();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { cardOverlay.classList.add('open'); });
    });
  }

  function closeCard() {
    if (!cardOverlay) return;
    cardOverlay.classList.remove('open');
    setTimeout(function () { cardOverlay.style.display = 'none'; }, 280);
  }

  /* ── Banner ── */
  function showBanner(ios) {
    if (!banner || wasDismissed()) return;
    if (ios) {
      banner.classList.add('ios-hint');
      var sub = document.getElementById('pwaBannerSub');
      if (sub) sub.textContent = 'Tap Share ⬆ then "Add to Home Screen"';
      var btn = document.getElementById('pwaInstallBtn');
      if (btn) btn.textContent = 'How to Install';
    }
    banner.style.display = 'flex';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { banner.classList.add('visible'); });
    });
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('visible');
    setTimeout(function () { banner.style.display = 'none'; }, 450);
  }

  /* ── Nav buttons ── */
  function showNavBtn() {
    if (navBtn)    navBtn.style.display    = 'inline-flex';
    if (mobileLink) mobileLink.style.display = 'block';
  }
  function hideNavBtn() {
    if (navBtn)    navBtn.style.display    = 'none';
    if (mobileLink) mobileLink.style.display = 'none';
  }

  /* ── Actual browser install ── */
  function doInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (result) {
      closeCard();
      if (result.outcome === 'accepted') hideNavBtn();
      deferredPrompt = null;
    });
  }

  /* ── DOM ready ── */
  document.addEventListener('DOMContentLoaded', function () {
    banner      = document.getElementById('pwaBanner');
    navBtn      = document.getElementById('navInstallBtn');
    mobileLink  = document.getElementById('mobileInstallLink');
    cardOverlay = document.getElementById('pwaCardOverlay');

    var bannerInstallBtn = document.getElementById('pwaInstallBtn');
    var bannerDismissBtn = document.getElementById('pwaDismissBtn');
    var cardInstallBtn   = document.getElementById('pwaCardInstallBtn');
    var cardCloseBtn     = document.getElementById('pwaCardClose');
    var cardLaterBtn     = document.getElementById('pwaCardLater');

    // Banner "Install" → open card (or show iOS tip)
    if (bannerInstallBtn) bannerInstallBtn.addEventListener('click', function () {
      isIOS ? null : openCard();
    });
    if (bannerDismissBtn) bannerDismissBtn.addEventListener('click', function () {
      localStorage.setItem(DISMISS_KEY, Date.now());
      hideBanner();
    });

    // Navbar + mobile link → open card
    if (navBtn) navBtn.addEventListener('click', function (e) {
      e.preventDefault();
      isIOS ? showBanner(true) : openCard();
    });
    if (mobileLink) mobileLink.addEventListener('click', function (e) {
      e.preventDefault();
      isIOS ? showBanner(true) : openCard();
    });

    // Card buttons
    if (cardInstallBtn) cardInstallBtn.addEventListener('click', doInstall);
    if (cardCloseBtn)   cardCloseBtn.addEventListener('click',   closeCard);
    if (cardLaterBtn)   cardLaterBtn.addEventListener('click',   closeCard);

    // Close on overlay click
    if (cardOverlay) cardOverlay.addEventListener('click', function (e) {
      if (e.target === cardOverlay) closeCard();
    });

    // iOS: show nav btn + banner after delay
    if (isIOS && !isStandalone) {
      showNavBtn();
      setTimeout(function () { showBanner(true); }, 4000);
    }
  });

  /* ── beforeinstallprompt (Chrome / Android / Edge desktop) ── */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showNavBtn();
    setTimeout(function () { showBanner(false); }, 3000);
  });

  /* ── After successful install ── */
  window.addEventListener('appinstalled', function () {
    hideNavBtn();
    hideBanner();
    closeCard();
    deferredPrompt = null;
  });
})();

// ── SMOKE CANVAS (loader only) ─────────────
(function () {
  const canvas = document.getElementById('smokeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, running = true;
  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  addEventListener('resize', resize);

  class Smoke {
    constructor() { this.reset(true); }
    reset(imm) {
      this.x = W / 2 + (Math.random() - .5) * 90;
      this.y = H / 2 + 80;
      this.vx = (Math.random() - .5) * .55;
      this.vy = -(Math.random() * 1.1 + .4);
      this.r = Math.random() * 50 + 15;
      this.life = imm ? Math.random() * 140 : 0;
      this.maxLife = Math.random() * 160 + 120;
    }
    update() {
      this.x += this.vx; this.y += this.vy; this.r += .28; this.life++;
      if (this.life >= this.maxLife) this.reset(false);
    }
    draw() {
      const a = .13 * Math.sin((this.life / this.maxLife) * Math.PI);
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      g.addColorStop(0, `rgba(120,15,15,${a})`); g.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    }
  }

  const ps = Array.from({ length: 20 }, () => new Smoke());
  function loop() { if (!running) return; ctx.clearRect(0, 0, W, H); ps.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(loop); }
  loop();
  window._stopSmoke = () => { running = false; };
})();

// ── LOADER ────────────────────────────────
(function () {
  if (typeof SHOW_LOADER === 'undefined' || !SHOW_LOADER) return;
  const loader = document.getElementById('loader');
  if (!loader) return;
  const fill = document.getElementById('progressFill');
  const pct  = document.getElementById('progressPct');
  const page = document.getElementById('__body__') || document.body;
  const DURATION = 2800, start = performance.now();

  function tick(now) {
    const p = Math.min(100, ((now - start) / DURATION) * 100);
    fill.style.width = p + '%';
    pct.textContent  = Math.floor(p) + '%';
    if (p < 100) { requestAnimationFrame(tick); return; }
    setTimeout(() => {
      window._stopSmoke?.();
      loader.classList.add('fade-out');
      setTimeout(() => { loader.style.display = 'none'; initReveal(); }, 800);
    }, 280);
  }
  requestAnimationFrame(tick);
})();

// ── NAVBAR ────────────────────────────────
(function () {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── HAMBURGER ─────────────────────────────
(function () {
  const burger   = document.getElementById('navBurger');
  const mobileNav = document.getElementById('mobileNav');
  if (!burger || !mobileNav) return;
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open');
    mobileNav.classList.remove('open');
  }));
})();

// ── TOAST ─────────────────────────────────
function showToast(msg, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icon  = type === 'success' ? '✓' : '✕';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ── CART UI UPDATE ─────────────────────────
function updateCartBadge(count) {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
  if (count > 0) badge.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 300 });
}

// ── ADD TO CART ────────────────────────────
function initAddToCart() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id   = this.dataset.id;
      const name = this.dataset.name;
      // read qty if control exists
      const qtyEl = document.getElementById('qty-' + id);
      const qty   = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;

      this.disabled   = true;
      this.textContent = '…';

      try {
        const res  = await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, qty }),
        });
        const data = await res.json();
        if (data.success) {
          updateCartBadge(data.cartCount);
          showToast(`🥷 ${name} added to cart!`, 'success');
          this.textContent = '✓ Added';
          this.classList.add('added');
          setTimeout(() => {
            this.textContent = '+ Add to Cart';
            this.classList.remove('added');
            this.disabled = false;
          }, 1800);
        } else {
          showToast(data.error || 'Error adding to cart', 'error');
          this.textContent = '+ Add to Cart';
          this.disabled = false;
        }
      } catch {
        showToast('Network error. Try again.', 'error');
        this.textContent = '+ Add to Cart';
        this.disabled = false;
      }
    });
  });
}

// ── QTY CONTROLS (menu page) ───────────────
function initQtyControls() {
  document.querySelectorAll('.qty-btn').forEach(btn => {
    // skip cart-page qty btns (handled separately)
    if (btn.closest('.cart-item')) return;
    btn.addEventListener('click', function () {
      const id  = this.dataset.id;
      const el  = document.getElementById('qty-' + id);
      if (!el) return;
      let val = parseInt(el.textContent) || 1;
      if (this.classList.contains('plus'))  val = Math.min(val + 1, 99);
      if (this.classList.contains('minus')) val = Math.max(val - 1, 1);
      el.textContent = val;
    });
  });
}

// ── CART PAGE CONTROLS ────────────────────
function initCartPage() {
  // Qty + / - on cart items
  document.querySelectorAll('.cart-item .qty-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id   = this.dataset.id;
      const el   = document.getElementById('ci-qty-' + id);
      const subEl= document.getElementById('ci-sub-' + id);
      const row  = document.getElementById('cartrow-' + id);
      if (!el) return;
      let val = parseInt(el.textContent) || 1;
      if (this.classList.contains('plus'))  val++;
      if (this.classList.contains('minus')) val--;

      const res  = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, qty: val }),
      });
      const data = await res.json();
      if (data.success) {
        updateCartBadge(data.cartCount);
        updateCartTotals(data.cartTotal);
        if (val <= 0 && row) {
          row.style.opacity = '0';
          setTimeout(() => { row.remove(); checkEmptyCart(); }, 350);
        } else {
          el.textContent = val;
          if (subEl && row) {
            const price = parseInt(row.dataset.price) || 0;
            subEl.textContent = `Rs ${price * val}`;
          }
        }
      }
    });
  });

  // Remove buttons
  document.querySelectorAll('.ci-remove').forEach(btn => {
    btn.addEventListener('click', async function () {
      const id  = this.dataset.id;
      const row = document.getElementById('cartrow-' + id);
      const res = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        updateCartBadge(data.cartCount);
        updateCartTotals(data.cartTotal);
        if (row) { row.style.opacity = '0'; setTimeout(() => { row.remove(); checkEmptyCart(); }, 350); }
        showToast('Item removed from cart.', 'success');
      }
    });
  });

  // Clear all
  const clearBtn = document.getElementById('clearCartBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const res  = await fetch('/api/cart/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) { updateCartBadge(0); location.reload(); }
    });
  }
}

function updateCartTotals(total) {
  const sub   = document.getElementById('cartSubtotal');
  const final = document.getElementById('cartFinalTotal');
  const mini  = document.getElementById('formTotal');
  if (sub)   sub.textContent   = `Rs ${total}`;
  if (final) final.textContent = `Rs ${total}`;
  if (mini)  mini.textContent  = `Rs ${total}`;
}

function checkEmptyCart() {
  const items = document.querySelectorAll('.cart-item');
  if (items.length === 0) setTimeout(() => location.reload(), 300);
}

// ── ORDER FORM SUBMIT ─────────────────────
function initOrderForm() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const required = form.querySelectorAll('[required]');
    let valid = true;
    required.forEach(f => {
      if (!f.value.trim()) {
        valid = false;
        f.style.borderColor = 'var(--red)';
        f.style.boxShadow   = '0 0 0 3px rgba(230,57,70,.2)';
        setTimeout(() => { f.style.borderColor = ''; f.style.boxShadow = ''; }, 2200);
      }
    });
    if (!valid) { showToast('Please fill in all required fields.', 'error'); return; }

    const btn   = document.getElementById('submitBtn');
    btn.innerHTML = '<span>Deploying…</span> ⏳';
    btn.disabled  = true;

    const body = Object.fromEntries(new FormData(form));

    try {
      const res  = await fetch('/api/order/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        updateCartBadge(0);
        const refEl = document.getElementById('modalOrderRef');
        if (refEl) refEl.textContent = 'Ref: ' + data.orderRef;
        const trackBtn = document.getElementById('modalTrackBtn');
        if (trackBtn) { trackBtn.href = '/track/' + data.orderRef; trackBtn.style.display = 'inline-flex'; }
        document.getElementById('orderSuccessModal').classList.add('active');
      } else {
        showToast(data.error || 'Order failed. Try again.', 'error');
        btn.innerHTML = '<span>Deploy My Order</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        btn.disabled = false;
      }
    } catch {
      showToast('Network error. Try again.', 'error');
      btn.disabled = false;
    }
  });
}

// ── ORDER MODAL ───────────────────────────
function closeOrderModal() {
  document.getElementById('orderSuccessModal').classList.remove('active');
  setTimeout(() => location.href = '/', 200);
}

document.getElementById('orderSuccessModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeOrderModal();
});

// ── CALL WIDGET ───────────────────────────
(function () {
  const fab   = document.getElementById('callFab');
  const panel = document.getElementById('callPanel');
  const close = document.getElementById('closeCallPanel');
  const trigger = document.getElementById('callWidgetTrigger');
  if (!fab || !panel) return;

  function openPanel()  { panel.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); }

  fab.addEventListener('click', () => panel.classList.contains('open') ? closePanel() : openPanel());
  close?.addEventListener('click', closePanel);
  trigger?.addEventListener('click', e => { e.preventDefault(); openPanel(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.call-widget')) closePanel();
  });
})();

// ── FAQ ACCORDION ─────────────────────────
(function () {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', function () {
      const item = this.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
})();

// ── SCROLL REVEAL ─────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
  els.forEach((el, i) => { el.style.transitionDelay = `${(i % 5) * 0.07}s`; obs.observe(el); });
}

// ── SMOOTH SCROLLING ──────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // If no loader, start reveal immediately
  if (typeof SHOW_LOADER === 'undefined' || !SHOW_LOADER) initReveal();

  initAddToCart();
  initQtyControls();
  initCartPage();
  initOrderForm();
});
