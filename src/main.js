import './styles/enterprise.css';
import { store, actions } from './store';
import { authService, validateSignupEmail } from './services/auth';
import { ProductCard } from './components/ProductCard';
import { configService } from './services/config';
import { productService } from './services/products';
import { storageService } from './services/storage';
import { orderService } from './services/orders';
import { FALLBACK_IMAGE_URL, getImageUrl } from './utils/media';
import logoUrl from './assets/logo.png';
import heroDefaultUrl from './assets/hero.png';

const getDiscountedPrice = (product = {}) => {
  const price = Number(product.price) || 0;
  const discount = Number(product.discount) || 0;
  return discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const escapeAttr = escapeHtml;
const defaultImageFallback = FALLBACK_IMAGE_URL || heroDefaultUrl;

const safeImage = (value, fallback = defaultImageFallback) => getImageUrl(value, fallback);

const safeAppLink = (value, fallback = '/shop') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : fallback;
};

const safeMediaLink = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : fallback;
};

const CATEGORY_DEFINITIONS = [
  { name: 'Men', image: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=600&auto=format&fit=crop' },
  { name: 'Women', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop' },
  { name: 'Girls', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop' },
  { name: 'Boys', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=600&auto=format&fit=crop' },
  { name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=600&auto=format&fit=crop' },
  { name: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop' },
  { name: 'Stationeries', image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=600&auto=format&fit=crop' },
  { name: 'Accessories', image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=600&auto=format&fit=crop' },
];

const CATEGORY_NAMES = CATEGORY_DEFINITIONS.map((category) => category.name);
const DESKTOP_NAV_CATEGORIES = ['Men', 'Women', 'Girls', 'Boys', 'Accessories'];
const CATEGORY_LINKS = Object.fromEntries(CATEGORY_DEFINITIONS.map((category) => [category.name, `/shop?category=${encodeURIComponent(category.name)}`]));
const CATEGORY_IMAGE_FALLBACKS = {
  ...Object.fromEntries(CATEGORY_DEFINITIONS.map((category) => [category.name.toUpperCase(), category.image])),
  KIDS: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=600&auto=format&fit=crop',
};
const DEFAULT_HERO_SLIDES = [
  heroDefaultUrl,
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1600&auto=format&fit=crop',
];
const DEFAULT_SHOWCASE_CATEGORIES = ['Men', 'Women', 'Boys', 'Girls', 'Electronics', 'Footwear', 'Accessories', 'Stationeries'];
const DEFAULT_HOME_VIDEO_URL = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';
const TESTIMONIALS = [
  { name: 'Aarav S.', text: 'The fit and finish felt premium right away. Delivery was quick and the styling looked exactly like the photos.' },
  { name: 'Nithya R.', text: 'Loved the curation. I found outfits for myself and my kids in one place without scrolling through clutter.' },
  { name: 'Sana M.', text: 'The accessories and footwear picks are surprisingly strong. The whole store feels more polished now.' },
  { name: 'Rahul K.', text: 'Checkout was easy and the products looked better in person. I would definitely order again.' },
  { name: 'Divya P.', text: 'The collections are clear, the pricing feels fair, and the homepage now makes browsing much faster.' },
];

const getDefaultCategoryItems = () => CATEGORY_DEFINITIONS.map((category) => ({
  name: category.name,
  link: CATEGORY_LINKS[category.name],
  image: category.image,
}));

const normalizeCategoryItems = (items = []) => {
  const existingByName = new Map();
  items.forEach((item) => {
    const rawName = String(item?.name || '').trim();
    if (!rawName) return;
    const normalizedName = rawName.toLowerCase() === 'kids'
      ? null
      : CATEGORY_DEFINITIONS.find((category) => category.name.toLowerCase() === rawName.toLowerCase())?.name || rawName;
    if (!normalizedName || existingByName.has(normalizedName)) return;
    existingByName.set(normalizedName, {
      ...item,
      name: normalizedName,
      link: safeAppLink(item?.link, CATEGORY_LINKS[normalizedName] || '/shop'),
      image: item?.image || CATEGORY_IMAGE_FALLBACKS[normalizedName.toUpperCase()] || defaultImageFallback,
    });
  });

  CATEGORY_DEFINITIONS.forEach((category) => {
    if (!existingByName.has(category.name)) {
      existingByName.set(category.name, {
        name: category.name,
        link: CATEGORY_LINKS[category.name],
        image: category.image,
      });
    }
  });

  return CATEGORY_DEFINITIONS.map((category) => existingByName.get(category.name)).filter(Boolean);
};

const initCategoryMarquee = () => {
  const marquee = document.querySelector('.marquee-container');
  const track = marquee?.querySelector('.circle-track');
  if (!marquee || !track || marquee.dataset.ready === 'true') return;

  const firstSet = track.querySelector('.circle-grid');
  if (!firstSet) return;

  marquee.dataset.ready = 'true';

  let isDragging = false;
  let moved = false;
  let startX = 0;
  let startScrollLeft = 0;

  const getLoopWidth = () => firstSet.scrollWidth;
  const normalizeScroll = () => {
    const loopWidth = getLoopWidth();
    if (!loopWidth) return;
    if (marquee.scrollLeft >= loopWidth) marquee.scrollLeft -= loopWidth;
    if (marquee.scrollLeft < 0) marquee.scrollLeft += loopWidth;
  };

  marquee.scrollLeft = 0;
  marquee.addEventListener('pointerdown', (event) => {
    isDragging = true;
    moved = false;
    startX = event.clientX;
    startScrollLeft = marquee.scrollLeft;
    marquee.classList.add('is-dragging');
    marquee.setPointerCapture(event.pointerId);
  });

  marquee.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 6) moved = true;
    marquee.scrollLeft = startScrollLeft - delta;
    normalizeScroll();
  });

  const endDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    marquee.classList.remove('is-dragging');
    if (marquee.hasPointerCapture(event.pointerId)) marquee.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { moved = false; }, 0);
  };

  marquee.addEventListener('pointerup', endDrag);
  marquee.addEventListener('pointercancel', endDrag);

  track.querySelectorAll('.circle-item').forEach((item) => {
    item.addEventListener('click', (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });

  window.addEventListener('resize', normalizeScroll);
  marquee.__cleanupMarquee = () => {
    window.removeEventListener('resize', normalizeScroll);
  };
};

const getHeroSlides = (hero = {}) => {
  const configuredSlides = Array.isArray(hero?.slides)
    ? hero.slides.map((slide) => (typeof slide === 'string' ? slide : slide?.image)).filter(Boolean)
    : [];
  const configuredImages = Array.isArray(hero?.images) ? hero.images.filter(Boolean) : [];
  const primaryImage = hero?.image ? [hero.image] : [];
  return [...new Set([...configuredSlides, ...configuredImages, ...primaryImage, ...DEFAULT_HERO_SLIDES])];
};

const initHeroRotator = (slides = [], fallback = heroDefaultUrl) => {
  const heroCard = document.getElementById('hero-cta');
  const heroImage = heroCard?.querySelector('.m-hero-image');
  const dots = heroCard ? Array.from(heroCard.querySelectorAll('.m-hero-dots span')) : [];
  if (!heroCard || !heroImage || slides.length <= 1) return;

  let index = 0;
  let intervalId = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let isDragging = false;
  let moved = false;

  const paint = () => {
    heroImage.classList.add('is-transitioning');
    window.setTimeout(() => {
      heroImage.src = safeImage(slides[index], fallback);
      heroImage.dataset.fallbackSrc = fallback;
      dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
      heroImage.classList.remove('is-transitioning');
    }, 180);
  };

  const goTo = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    paint();
  };

  const advance = () => {
    goTo(index + 1);
  };

  const restartInterval = () => {
    window.clearInterval(intervalId);
    intervalId = window.setInterval(advance, 3500);
  };

  restartInterval();
  heroCard.addEventListener('mouseenter', () => window.clearInterval(intervalId));
  heroCard.addEventListener('mouseleave', () => {
    if (!isDragging) restartInterval();
  });

  heroCard.addEventListener('pointerdown', (event) => {
    isDragging = true;
    moved = false;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    window.clearInterval(intervalId);
    heroCard.classList.add('is-dragging');
  });

  heroCard.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      moved = true;
    }
  });

  const endDrag = (event) => {
    if (!isDragging) return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      goTo(index + (deltaX < 0 ? 1 : -1));
    }
    isDragging = false;
    heroCard.classList.remove('is-dragging');
    window.setTimeout(() => { moved = false; }, 0);
    restartInterval();
  };

  heroCard.addEventListener('pointerup', endDrag);
  heroCard.addEventListener('pointercancel', endDrag);

  heroCard.addEventListener('click', (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener('click', (event) => {
      event.stopPropagation();
      goTo(dotIndex);
      restartInterval();
    });
  });

  heroCard.__cleanupHero = () => {
    window.clearInterval(intervalId);
  };
};

const renderShowcaseProductCard = (product = {}) => {
  const safeId = escapeAttr(product.id || '');
  const safeName = escapeHtml(product.name || 'Untitled Product');
  const safeBrand = escapeHtml(product.brand || 'GUGAN');
  const safeCategory = escapeHtml(product.category || 'Category');
  const safePrice = Number(product.price) || 0;
  const safeDiscount = Number(product.discount) || 0;
  const discountedPrice = safeDiscount ? Math.round(safePrice * (1 - safeDiscount / 100)) : null;

  return `
    <article class="showcase-card product-card" data-id="${safeId}">
      <div class="showcase-card-image">
        <img src="${escapeAttr(safeImage(product.images))}" alt="${safeName}" loading="lazy" data-fallback-src="${escapeAttr(defaultImageFallback)}">
        <span class="showcase-category-pill">${safeCategory}</span>
      </div>
      <div class="showcase-card-info">
        <p class="showcase-category-text">${safeCategory}</p>
        <h3>${safeBrand}</h3>
        <p>${safeName}</p>
        <div class="showcase-price-row">
          <span class="showcase-price">Rs. ${(discountedPrice || safePrice).toLocaleString()}</span>
          ${discountedPrice ? `<span class="showcase-original-price">Rs. ${safePrice.toLocaleString()}</span>` : ''}
        </div>
      </div>
    </article>
  `;
};

const initTestimonialsMarquee = () => {
  const marquee = document.querySelector('.testimonials-marquee');
  const track = marquee?.querySelector('.testimonials-track');
  const firstSet = track?.querySelector('.testimonials-group');
  if (!marquee || !track || !firstSet || marquee.dataset.ready === 'true') return;

  marquee.dataset.ready = 'true';
  let rafId = 0;

  const normalizeScroll = () => {
    const loopWidth = firstSet.scrollWidth;
    if (!loopWidth) return;
    if (marquee.scrollLeft >= loopWidth) marquee.scrollLeft -= loopWidth;
  };

  const step = () => {
    marquee.scrollLeft += 0.45;
    normalizeScroll();
    rafId = window.requestAnimationFrame(step);
  };

  marquee.scrollLeft = 0;
  rafId = window.requestAnimationFrame(step);

  marquee.addEventListener('mouseenter', () => window.cancelAnimationFrame(rafId));
  marquee.addEventListener('mouseleave', () => {
    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(step);
  });

  marquee.__cleanupTestimonials = () => {
    if (rafId) window.cancelAnimationFrame(rafId);
  };
};

const installGlobalImageFallbacks = () => {
  if (window.__guganImageFallbacksInstalled) return;
  window.__guganImageFallbacksInstalled = true;
  document.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    const fallback = target.dataset.fallbackSrc || defaultImageFallback;
    if (!fallback || target.dataset.fallbackApplied === 'true') return;

    target.dataset.fallbackApplied = 'true';
    target.src = fallback;
  }, true);
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TOAST SYSTEM
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const toastQueue = [];
let toastContainer = null;

const showToast = (message, type = 'success', duration = 3500) => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-root';
    document.body.appendChild(toastContainer);
  }
  const icons = { success: 'âœ…', error: 'âŒ', info: 'â„¹ï¸', warning: 'âš ï¸' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || 'âœ…'}</span><span>${message}</span><button class="toast-close">âœ•</button>`;
  toastContainer.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  const dismiss = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); };
  t.querySelector('.toast-close').onclick = dismiss;
  setTimeout(dismiss, duration);
};

window.toast = {
  success: (m) => showToast(m, 'success'),
  error:   (m) => showToast(m, 'error'),
  info:    (m) => showToast(m, 'info'),
  warning: (m) => showToast(m, 'warning'),
};
const toast = window.toast;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NAVIGATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.app = window.app || {};
window.app.navigate = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
const navigate = window.app.navigate;
const PUBLIC_AUTH_ROUTES = ['/login', '/signup'];
const isAuthenticated = (user) => Boolean(user?.id);
const isAuthRoute = (path) => PUBLIC_AUTH_ROUTES.includes(path);

window.app.toggleWishlist = (id) => {
  actions.toggleWishlist(id);
  // Re-render specific pages if needed or just count on store subscription
  renderNavbar();
  const path = window.location.pathname;
  if (path === '/shop') renderShop();
  else if (path === '/wishlist') renderWishlist();
  else if (path.startsWith('/product/')) renderProductDetail(id);
  else renderHome();
};

window.app.quickAddToCart = async (id) => {
  try {
    const product = await productService.getProductById(id);
    const size = product.sizes?.[0] || 'M';
    actions.addToCart(product, size);
    renderNavbar();
    toast.success(`Added ${product.name} to bag!`);
  } catch (err) {
    toast.error('Failed to add to bag');
  }
};


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// IMAGE UPLOAD HELPER (with URL fallback)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const createImageInput = (currentUrl = '', bucket = 'products') => {
  const id = `img-${Date.now()}`;
  return `
    <div class="image-input-group">
      <div class="image-tabs">
        <button type="button" class="img-tab active" data-tab="upload">Upload File</button>
        <button type="button" class="img-tab" data-tab="url">URL</button>
      </div>
      <div class="img-panel" data-panel="upload">
        <input type="file" id="${id}-file" class="file-input" accept="image/*">
        <label for="${id}-file" class="file-label">
          <span>&#128194; Choose image file</span>
          <span class="file-name" id="${id}-filename">No file chosen</span>
        </label>
      </div>
      <div class="img-panel hidden" data-panel="url">
        <input type="text" id="${id}-url" class="img-url-input" placeholder="https://example.com/image.jpg" value="${currentUrl}">
      </div>
      ${currentUrl ? `<div class="image-preview mt-sm"><img src="${currentUrl}" id="${id}-preview"></div>` : `<div class="image-preview mt-sm hidden" id="${id}-preview-wrap"><img id="${id}-preview"></div>`}
      <input type="hidden" name="image_final" id="${id}-final" value="${currentUrl}">
    </div>
  `.trim();
};

const initImageInput = (container) => {
  container.querySelectorAll('.image-input-group').forEach(group => {
    const tabs = group.querySelectorAll('.img-tab');
    const panels = group.querySelectorAll('.img-panel');
    const finalInput = group.querySelector('[name="image_final"]');
    const preview = group.querySelector('[id$="-preview"]');
    const previewWrap = group.querySelector('[id$="-preview-wrap"]');
    const fileInput = group.querySelector('.file-input');
    const urlInput = group.querySelector('.img-url-input');
    const filenameEl = group.querySelector('.file-name');

    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.tab));
      };
    });

    if (urlInput) {
      urlInput.oninput = () => {
        const url = urlInput.value.trim();
        finalInput.value = url;
        if (url && preview) {
          preview.src = url;
          previewWrap?.classList.remove('hidden');
        }
      };
    }

    if (fileInput) {
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
        filenameEl.textContent = file.name;
        // Show local preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (preview) {
            preview.src = e.target.result;
            previewWrap?.classList.remove('hidden');
          }
        };
        reader.readAsDataURL(file);
        // Mark for upload (store file ref)
        fileInput.dataset.pendingUpload = 'true';
      };
    }
  });
};

const resolveImageUrl = async (container, bucket = 'products') => {
  const group = container.querySelector('.image-input-group');
  if (!group) return '';
  const fileInput = group.querySelector('.file-input');
  const finalInput = group.querySelector('[name="image_final"]');
  if (fileInput?.files?.length > 0 && fileInput.dataset.pendingUpload) {
    try {
      const url = await storageService.uploadImage(fileInput.files[0], bucket);
      return url;
    } catch (err) {
      // Fallback: if storage not configured, use URL field value
      console.warn('Storage upload failed, using URL field:', err.message);
      return finalInput?.value || '';
    }
  }
  return finalInput?.value || '';
};

const renderAuthLoading = () => {
  const main = document.getElementById('router-view');
  if (!main) return;

  main.innerHTML = `
    <section class="auth-page">
      <div class="auth-page-card text-center">
        <div class="spinner"></div>
        <p class="auth-loading-text">Checking your session...</p>
      </div>
    </section>
  `;
};

const renderAuthPage = (type = 'login') => {
  const main = document.getElementById('router-view');
  if (!main) return;

  const isSignup = type === 'signup';

  main.innerHTML = `
    <section class="auth-page">
      <div class="auth-page-card">
        <div class="auth-header">
          <span class="auth-badge">GUGAN FASHIONS</span>
          <h2>${isSignup ? 'Create Your Account' : 'Welcome Back'}</h2>
          <p>${isSignup ? 'Join our exclusive community.' : 'Log in to your luxury fashion hub.'}</p>
        </div>
        <form id="auth-route-form" class="auth-form">
          ${isSignup ? `
            <div class="form-group">
              <label for="auth-full-name">Full Name</label>
              <input type="text" id="auth-full-name" placeholder="E.g. Alexander McQueen" autocomplete="name" required>
            </div>
          ` : ''}
          <div class="form-group">
            <label for="auth-email">Email Address</label>
            <input type="email" id="auth-email" placeholder="name@luxury.com" autocomplete="email" required>
            <div id="auth-email-errors" class="validation-info"></div>
          </div>
          <div class="form-group">
            <label for="auth-password">Password</label>
            <input type="password" id="auth-password" placeholder="Enter your password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" required>
            <div id="auth-form-error" class="validation-info"></div>
          </div>
          <button type="submit" class="btn-gold-lg" id="auth-route-submit">${isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}</button>
        </form>
        <p class="auth-page-switch">
          ${isSignup
            ? 'Already a member? <a href="/login" id="switch-auth-route">Login here</a>'
            : 'New to Gugan Fashions? <a href="/signup" id="switch-auth-route">Join now</a>'}
        </p>
      </div>
    </section>
  `;

  const form = document.getElementById('auth-route-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const submitBtn = document.getElementById('auth-route-submit');
  const emailErrors = document.getElementById('auth-email-errors');
  const formError = document.getElementById('auth-form-error');

  if (isSignup) {
    emailInput.addEventListener('input', () => {
      const { errors } = validateSignupEmail(emailInput.value);
      emailErrors.innerHTML = errors.map(err => `<p class="error">${err}</p>`).join('');
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = document.getElementById('auth-full-name')?.value.trim() || '';

    emailErrors.innerHTML = '';
    formError.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'PROCESSING...';

    try {
      if (isSignup) {
        const { isValid, errors } = validateSignupEmail(email);
        if (!isValid) {
          emailErrors.innerHTML = errors.map(err => `<p class="error">${err}</p>`).join('');
          throw new Error('Please fix the email validation errors.');
        }
        await authService.signUp(email, password, fullName);
        toast.success('Signup successful! Please verify your email.');
        navigate('/login');
      } else {
        await authService.signIn(email, password);
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (err) {
      formError.innerHTML = `<p class="error">${err.message || 'Authentication failed.'}</p>`;
      toast.error(err.message || 'Authentication failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignup ? 'SIGN UP' : 'LOGIN';
    }
  };

  document.getElementById('switch-auth-route')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(isSignup ? '/login' : '/signup');
  });
};

const handleRoute = () => {
  const path = window.location.pathname;
  if (!document.getElementById('router-view')) return;
  document.body.classList.toggle('admin-mode', path.startsWith('/admin'));

  const { user, isAuthLoading } = store.getState();

  if (isAuthLoading) {
    renderAuthLoading();
    return;
  }

  if (isAuthRoute(path)) {
    if (isAuthenticated(user)) {
      navigate('/');
      return;
    }
    renderAuthPage(path === '/signup' ? 'signup' : 'login');
    return;
  }

  if (path === '/shop') renderShop();
  else if (path === '/wishlist') renderWishlist();
  else if (path.startsWith('/admin')) renderAdmin(path);
  else if (path.startsWith('/product/')) renderProductDetail(path.split('/').pop());
  else if (path === '/cart') renderCart();
  else renderHome();
};

const renderWishlist = async () => {
  const main = document.getElementById('router-view');
  const wishlistIds = store.getState().wishlist || [];

  if (wishlistIds.length === 0) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <div style="font-size:4rem">&#9825;</div>
        <h2 style="margin-top:1rem">Your Wishlist is Empty</h2>
        <p style="margin-top:0.5rem;color:var(--c-gray-400)">Save items you love to your wishlist.</p>
        <button class="btn-gold mt-lg" onclick="app.navigate('/shop')">EXPLORE SHOP</button>
      </div>`;
    return;
  }

  main.innerHTML = `
    <div class="container py-xl">
      <div class="shop-header mb-xl">
        <h1 class="pdp-title">YOUR WISHLIST</h1>
        <p class="item-count">${wishlistIds.length} Items</p>
      </div>
      <div class="product-grid" id="wishlist-grid">
        <div class="loading">Loading wishlist items...</div>
      </div>
    </div>
  `;

  try {
    const products = await Promise.all(
      wishlistIds.map(id => productService.getProductById(id).catch(() => null))
    );
    const validProducts = products.filter(p => p !== null);

    const grid = document.getElementById('wishlist-grid');
    if (validProducts.length === 0) {
      grid.innerHTML = '<p>No items found.</p>';
      return;
    }

    grid.innerHTML = validProducts.map(p => ProductCard(p)).join('');

    // Attach click handlers
    grid.querySelectorAll('.product-card').forEach(card => {
       card.onclick = () => navigate(`/product/${card.dataset.id}`);
    });
  } catch (err) {
    console.error('Failed to load wishlist:', err);
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APP INIT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const initApp = async () => {
  installGlobalImageFallbacks();
  actions.setAuthLoading(true);
  try {
    const [userResult, configResult] = await Promise.allSettled([
      authService.getCurrentUser(),
      configService.getHomepageConfig()
    ]);

    if (userResult.status === 'fulfilled') {
      actions.setUser(userResult.value);
    } else {
      actions.setUser(null);
    }

    if (configResult.status === 'fulfilled') {
      store.setState({ homepage: configResult.value });
    }
  } finally {
    actions.setAuthLoading(false);
  }

  authService.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      try {
        const user = await authService.getCurrentUser();
        actions.setUser(user);
      } catch (err) {
        actions.setUser(null);
      }
    } else {
      actions.setUser(null);
    }
    actions.setAuthLoading(false);
    renderNavbar();
    renderFooter();
    handleRoute();
  });

  store.subscribe((state) => {
    renderNavbar(state.user);
    renderFooter();
  });

  window.onpopstate = handleRoute;
  renderNavbar();
  renderFooter();
  handleRoute();
};

const renderFooter = () => {
  const footer = document.getElementById('main-footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-cols">
        <div class="footer-brand">
          <img src="${logoUrl}" alt="GUGAN" style="height: 40px; width: auto; margin-bottom: 20px;">
          <p>Redefining modern fashion with minimalist luxury since 2024.</p>
          <div class="social-links">
            <a href="#" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
            </a>
            <a href="#" aria-label="Twitter">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
          </div>
        </div>
        <div class="footer-col">
          <h4>SHOP</h4>
          <ul>
            ${CATEGORY_NAMES.map((category) => `<li><a href="${CATEGORY_LINKS[category]}">${escapeHtml(category)}</a></li>`).join('')}
          </ul>
        </div>
        <div class="footer-col">
          <h4>SUPPORT</h4>
          <ul>
            <li><a href="#">Contact Us</a></li>
            <li><a href="#">Shipping</a></li>
            <li><a href="#">Returns</a></li>
            <li><a href="#">FAQs</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>LEGAL</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; 2026 GUGAN FASHIONS. ALL RIGHTS RESERVED.
      </div>
    </div>
  `;

  footer.querySelectorAll('a[href^="/"]').forEach((link) => {
    link.onclick = (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    };
  });
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NAVBAR
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const renderNavbar = (user = store.getState().user) => {
  const header = document.getElementById('main-header');
  const isAdmin = user?.profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  header.innerHTML = `
    <nav class="container nav-wrapper">
      <button class="mobile-menu-toggle" id="mobile-menu-btn">â˜°</button>
      <a href="/" class="logo" id="logo-link">
        <img src="${logoUrl}" alt="GUGAN" style="height: 45px; width: auto; display: block;">
      </a>
      <ul class="nav-links">
        <li><a href="/shop" id="shop-link">SHOP ALL</a></li>
        ${DESKTOP_NAV_CATEGORIES.map((category) => `<li><a href="${CATEGORY_LINKS[category]}" id="${category.toLowerCase()}-link">${escapeHtml(category.toUpperCase())}</a></li>`).join('')}
      </ul>
      <div class="nav-right">
        <div class="search-bar">
          <input type="text" id="nav-search-input" placeholder="Search for products, brands and more">
        </div>
        <div class="action-links">
          ${isAdmin ? '<a href="/admin" id="admin-link">CMS</a>' : ''}
          <a href="/wishlist" id="wishlist-link" class="header-action-link">
            <span class="header-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.25A5.25 5.25 0 0 1 7.25 3C9 3 10.68 3.81 11.75 5.09 12.82 3.81 14.5 3 16.25 3A5.25 5.25 0 0 1 21.5 8.25c0 3.84-3.4 6.99-8.55 11.76L12 21.35Z" fill="currentColor"/>
              </svg>
            </span>
            <span class="header-action-label-desktop">WISHLIST</span>
            <span class="header-action-label-mobile">Wishlist</span>
          </a>
          <a href="#" id="profile-action" class="header-action-link">
            <span class="header-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2.25c-4.2 0-7.5 2.87-7.5 6.25 0 .41.34.75.75.75h13.5a.75.75 0 0 0 .75-.75c0-3.38-3.3-6.25-7.5-6.25Z" fill="currentColor"/>
              </svg>
            </span>
            <span class="header-action-label-desktop">${user ? (user.profile?.full_name?.split(' ')[0] || 'ACCOUNT') : 'LOGIN'}</span>
            <span class="header-action-label-mobile">Profile</span>
          </a>
          <a href="/cart" id="cart-link" class="header-action-link">
            <span class="header-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M3.75 4.5h1.57c.42 0 .78.29.88.69l.34 1.56h13.71a.75.75 0 0 1 .72.96l-1.63 5.75a1.5 1.5 0 0 1-1.45 1.09H9.17a1.5 1.5 0 0 1-1.46-1.16L6.04 5.99H3.75a.75.75 0 0 1 0-1.5Zm5.8 11.75a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3Zm8.2 0a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3Z" fill="currentColor"/>
              </svg>
            </span>
            <span class="header-action-label-desktop">CART</span>
            <span class="header-action-label-mobile">Cart</span>
          </a>
        </div>
      </div>
    </nav>

    <div class="mobile-drawer-overlay" id="mobile-overlay"></div>
    <div class="mobile-drawer" id="mobile-drawer">
      <div class="mobile-drawer-top">
        <div class="mobile-action-links">
          <a href="/cart" class="mobile-nav-item">MY CART</a>
          <a href="#" id="mobile-profile-action">${user ? 'LOGOUT' : 'LOGIN / SIGNUP'}</a>
        </div>
      </div>
      <div class="mobile-nav-links">
        <a href="/" class="mobile-nav-item">HOME</a>
        <a href="/shop" class="mobile-nav-item">SHOP ALL</a>
        ${CATEGORY_NAMES.map((category) => `<a href="${CATEGORY_LINKS[category]}" class="mobile-nav-item">${escapeHtml(category.toUpperCase())}</a>`).join('')}
      </div>
    </div>
  `;

  // Helper to close drawer
  const closeDrawer = () => {
    document.getElementById('mobile-drawer').classList.remove('active');
    document.getElementById('mobile-overlay').classList.remove('active');
  };

  document.getElementById('mobile-menu-btn').onclick = () => {
    document.getElementById('mobile-drawer').classList.add('active');
    document.getElementById('mobile-overlay').classList.add('active');
  };
  document.getElementById('mobile-overlay').onclick = closeDrawer;

  // Navigation handlers
  const navItems = header.querySelectorAll('.logo, .nav-links a, .mobile-nav-item, #admin-link, #wishlist-link, #cart-link');
  navItems.forEach(item => {
    const originalOnClick = item.onclick;
    item.onclick = (e) => {
      if (item.id === 'mobile-profile-action') return; // Handled below
      e.preventDefault();
      const href = item.getAttribute('href');
      if (href && href !== '#') {
        closeDrawer();
        navigate(href);
      }
    };
  });

  document.getElementById('profile-action').onclick = (e) => {
    e.preventDefault();
    if (user) { if (confirm('Logout?')) authService.signOut(); } 
    else navigate('/login');
  };

  const mobileProfileBtn = document.getElementById('mobile-profile-action');
  if (mobileProfileBtn) {
    mobileProfileBtn.onclick = (e) => {
      e.preventDefault();
      closeDrawer();
      if (user) { if (confirm('Logout?')) authService.signOut(); }
      else navigate('/login');
    };
  }

  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    searchInput.onkeypress = (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        navigate(`/shop?search=${encodeURIComponent(searchInput.value.trim())}`);
      }
    };
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN PANEL â€” SHELL + ROUTER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const renderAdmin = async (path = '/admin') => {
  const user = store.getState().user;
  const main = document.getElementById('router-view');
  const isAdmin = user?.profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  if (!isAdmin) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <div style="font-size:4rem">&#128274;</div>
        <h1 style="margin-top:1rem">Access Denied</h1>
        <p class="mt-md" style="color:var(--c-gray-500)">You must be an admin to access this panel.</p>
        <button class="btn-primary mt-lg" onclick="app.navigate('/')">Go Home</button>
      </div>`;
    return;
  }

  if (!document.getElementById('admin-content')) {
    main.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar"></aside>
        <main class="admin-content" id="admin-content"></main>
      </div>
    `;
  }

  refreshAdminShell(user);

  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.toggle('active', path.startsWith(item.dataset.path) && (item.dataset.path === '/admin' ? path === '/admin' : true));
  });

  const content = document.getElementById('admin-content');
  content.innerHTML = `<div class="admin-loading"><div class="spinner"></div><p>Loading...</p></div>`;

  try {
    if (path === '/admin') await adminDashboard(content);
    else if (path === '/admin/products' || path === '/admin/products/add') await adminProducts(content, path);
    else if (path.startsWith('/admin/products/edit/')) await adminProductEdit(content, path.split('/').pop());
    else if (path === '/admin/categories') await adminCategories(content);
    else if (path === '/admin/orders') await adminOrders(content);
    else if (path === '/admin/cms/hero') await adminHeroCMS(content);
    else content.innerHTML = `<div class="admin-error">Page not found: ${escapeHtml(path)}</div>`;
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="admin-error">Unable to load this admin view. ${escapeHtml(err.message || 'Unknown error.')}</div>`;
  }
};

const adminDashboard = async (container) => {
  let productCount = 0;
  let orderCount = 0;
  let latestUpdate = '--';

  try {
    const [{ products }, orders] = await Promise.all([
      productService.getProducts({}),
      orderService.getOrders(),
    ]);
    productCount = products.length;
    orderCount = orders.length;

    if (products.length > 0) {
      const latest = [...products].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0];
      latestUpdate = latest?.updated_at || latest?.created_at ? new Date(latest.updated_at || latest.created_at).toLocaleString() : '--';
    }
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
  }

  const displayName = store.getState().user?.profile?.full_name || store.getState().user?.email || 'Admin';
  const lastUpdatedLabel = latestUpdate === '--' ? 'No product updates yet' : latestUpdate;

  container.innerHTML = `
    <div class="admin-page-header">
      <div>
        <span class="admin-kicker">Executive Overview</span>
        <h1>Dashboard</h1>
        <p>Welcome back, ${escapeHtml(displayName)}. Here is the live pulse of your storefront operations.</p>
      </div>
      <div class="admin-header-actions">
        <button class="btn-secondary" onclick="app.navigate('/admin/orders')">Review Orders</button>
        <button class="btn-primary" onclick="app.navigate('/admin/products/add')">Add Product</button>
      </div>
    </div>
    <div class="admin-stats-grid">
      <div class="stat-card stat-card-products">
        <div class="stat-icon" data-icon="products"></div>
        <div class="stat-info">
          <p class="stat-label">Total Products</p>
          <h2 class="stat-value">${productCount}</h2>
          <p class="stat-footnote">Catalog units currently available to sell.</p>
        </div>
      </div>
      <div class="stat-card stat-card-orders">
        <div class="stat-icon" data-icon="orders"></div>
        <div class="stat-info">
          <p class="stat-label">Total Orders</p>
          <h2 class="stat-value">${orderCount}</h2>
          <p class="stat-footnote">Submitted orders tracked in the system.</p>
        </div>
      </div>
      <div class="stat-card stat-card-updated">
        <div class="stat-icon" data-icon="activity"></div>
        <div class="stat-info">
          <p class="stat-label">Last Updated</p>
          <h2 class="stat-value stat-value-sm">${escapeHtml(lastUpdatedLabel)}</h2>
          <p class="stat-footnote">Most recent product change detected in the catalog.</p>
        </div>
      </div>
    </div>
    <div class="admin-dashboard-grid">
      <section class="admin-card admin-briefing-card">
        <div class="briefing-header">
          <div>
            <span class="admin-kicker">Command Center</span>
            <h2>Priority Actions</h2>
          </div>
          <p>Use the fastest paths for the jobs you do every day.</p>
        </div>
        <div class="quick-action-grid mt-md">
          <button class="quick-action-card" onclick="app.navigate('/admin/products/add')">
            <span data-icon="plus"></span>
            <strong>Add Product</strong>
            <p>Launch a new listing with pricing, media, and sizing.</p>
          </button>
          <button class="quick-action-card" onclick="app.navigate('/admin/products')">
            <span data-icon="catalog"></span>
            <strong>Manage Catalog</strong>
            <p>Edit inventory, pricing, merchandising, and visibility.</p>
          </button>
          <button class="quick-action-card" onclick="app.navigate('/admin/cms/hero')">
            <span data-icon="hero"></span>
            <strong>Refresh Hero</strong>
            <p>Update the top campaign moment on the storefront.</p>
          </button>
          <button class="quick-action-card" onclick="app.navigate('/admin/categories')">
            <span data-icon="collections"></span>
            <strong>Collections</strong>
            <p>Reorder category stories and keep navigation sharp.</p>
          </button>
        </div>
      </section>
      <section class="admin-card admin-summary-card">
        <span class="admin-kicker">Store Status</span>
        <h2>Operational Snapshot</h2>
        <div class="admin-summary-list">
          <div class="summary-row">
            <span>Catalog health</span>
            <strong>${productCount > 0 ? 'Live' : 'Needs products'}</strong>
          </div>
          <div class="summary-row">
            <span>Order flow</span>
            <strong>${orderCount > 0 ? 'Active' : 'Waiting for first order'}</strong>
          </div>
          <div class="summary-row">
            <span>Latest activity</span>
            <strong>${escapeHtml(lastUpdatedLabel)}</strong>
          </div>
        </div>
        <button class="btn-secondary admin-summary-button" onclick="app.navigate('/admin/orders')">Open Orders Queue</button>
      </section>
    </div>
    <div class="admin-quick-actions mt-xl">
      <h2 class="section-title-sm">Quick Actions</h2>
      <div class="quick-action-grid mt-md">
        <button class="quick-action-card quick-action-card-compact" onclick="app.navigate('/admin/products/add')"><span data-icon="plus"></span><p>Add Product</p></button>
        <button class="quick-action-card quick-action-card-compact" onclick="app.navigate('/admin/cms/hero')"><span data-icon="hero"></span><p>Edit Hero</p></button>
        <button class="quick-action-card quick-action-card-compact" onclick="app.navigate('/admin/categories')"><span data-icon="collections"></span><p>Edit Categories</p></button>
        <button class="quick-action-card quick-action-card-compact" onclick="app.navigate('/admin/orders')"><span data-icon="orders"></span><p>View Orders</p></button>
      </div>
    </div>
  `;
};

const adminProducts = async (container, path) => {
  if (path === '/admin/products/add') return adminProductForm(container, null);

  const { products } = await productService.getProducts({ sort: 'created_at:desc' });

  container.innerHTML = `
    <div class="admin-page-header">
      <div><h1>Products</h1><p>${products.length} products in inventory</p></div>
      <button class="btn-primary" onclick="app.navigate('/admin/products/add')">+ Add Product</button>
    </div>
    <div class="admin-table-wrapper">
      ${products.length === 0 ? '<div class="admin-empty">No products yet. Add your first product!</div>' : `
      <table class="admin-table">
        <thead><tr>
          <th>Product</th><th>Category</th><th>Price</th><th>Discount</th><th>Stock</th><th>Best Seller</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td>
                <div class="product-cell">
                  ${p.images?.[0] ? `<img src="${escapeAttr(safeImage(p.images))}" class="product-thumb" alt="${escapeAttr(p.name || 'Product')}" data-fallback-src="${escapeAttr(defaultImageFallback)}">` : '<div class="product-thumb-placeholder">&#128230;</div>'}
                  <div><p class="product-cell-name">${escapeHtml(p.name)}</p><p class="product-cell-brand">${escapeHtml(p.brand || '')}</p></div>
                </div>
              </td>
              <td><span class="badge">${escapeHtml(p.category || 'Uncategorized')}</span></td>
              <td><strong>Rs. ${Number(p.price).toLocaleString()}</strong></td>
              <td>${p.discount ? `<span class="badge badge-warning">${p.discount}%</span>` : '&mdash;'}</td>
              <td>${p.stock ?? '&mdash;'}</td>
              <td>${p.is_best_seller ? '<span class="badge badge-success">Yes</span>' : '&mdash;'}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" title="Edit" onclick="app.navigate('/admin/products/edit/${p.id}')">Edit</button>
                  <button class="btn-icon" title="Delete" onclick="app.adminDeleteProduct('${escapeAttr(p.id)}', ${JSON.stringify(p.name || 'this product')})">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>
  `;

  window.app.adminDeleteProduct = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await productService.deleteProduct(id);
      toast.success('Product deleted.');
      navigate('/admin/products');
    } catch (err) { toast.error('Delete failed: ' + err.message); }
  };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: PRODUCT FORM (Add / Edit)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminProductForm = async (container, product) => {
  const isEdit = !!product;
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const CATEGORIES = CATEGORY_NAMES;

  // Fetch live categories from config for dropdown
  let catItems = [];
  try {
    const config = await configService.getHomepageConfig();
    catItems = config.categories?.items?.map(c => c.name) || [];
  } catch (_) {}
  const allCats = [...new Set([...CATEGORIES, ...catItems])];
  const selectedSizes = product?.sizes || ['S', 'M', 'L', 'XL'];

  container.innerHTML = `
    <div class="admin-page-header">
      <div>
        <h1>${isEdit ? 'Edit Product' : 'Add Product'}</h1>
        <p><a href="#" onclick="app.navigate('/admin/products'); return false;" style="color:var(--c-gold)">&#8592; Back to Products</a></p>
      </div>
    </div>
    <div class="admin-card">
      <form id="product-form" class="admin-form" autocomplete="off">
        <div class="form-grid-2">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" name="name" value="${escapeAttr(product?.name || '')}" placeholder="e.g. Premium Linen Shirt" required>
          </div>
          <div class="form-group">
            <label>Brand</label>
            <input type="text" name="brand" value="${escapeAttr(product?.brand || '')}" placeholder="e.g. GUGAN">
          </div>
          <div class="form-group">
            <label>Category *</label>
            <select name="category" required>
              <option value="">Select Category</option>
              ${allCats.map(c => `<option value="${escapeAttr(c)}" ${product?.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Price (Rs.) *</label>
            <input type="number" name="price" value="${product?.price || ''}" placeholder="e.g. 1499" required min="0">
          </div>
          <div class="form-group">
            <label>Discount (%)</label>
            <input type="number" name="discount" value="${product?.discount || ''}" placeholder="e.g. 10" min="0" max="100">
          </div>
          <div class="form-group">
            <label>Stock Quantity</label>
            <input type="number" name="stock" value="${product?.stock ?? 0}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>Available Sizes</label>
          <div class="size-selector-admin">
            ${SIZES.map(s => `
              <label class="size-check">
                <input type="checkbox" name="sizes" value="${s}" ${selectedSizes.includes(s) ? 'checked' : ''}>
                <span>${s}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Product Image</label>
          ${createImageInput(product?.images?.[0] || '', 'products')}
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="4" placeholder="Describe the product...">${escapeHtml(product?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" name="is_best_seller" value="true" ${product?.is_best_seller ? 'checked' : ''}>
            <span>Mark as Best Seller</span>
          </label>
          <label class="checkbox-label" style="margin-top:0.5rem">
            <input type="checkbox" name="is_featured" value="true" ${product?.is_featured ? 'checked' : ''}>
            <span>Mark as Featured</span>
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="app.navigate('/admin/products')">Cancel</button>
          <button type="submit" class="btn-primary" id="save-product-btn">
            ${isEdit ? '&#128190; Update Product' : '&#10133; Add Product'}
          </button>
        </div>
      </form>
    </div>
  `;

  initImageInput(container);

  document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const fd = new FormData(e.target);
      const imageUrl = await resolveImageUrl(container, 'products');

      const checkedSizes = [...e.target.querySelectorAll('[name="sizes"]:checked')].map(cb => cb.value);

      const data = {
        name: fd.get('name'),
        brand: fd.get('brand'),
        category: fd.get('category'),
        price: parseFloat(fd.get('price')),
        discount: fd.get('discount') ? parseFloat(fd.get('discount')) : null,
        stock: parseInt(fd.get('stock')) || 0,
        sizes: checkedSizes,
        description: fd.get('description'),
        images: imageUrl ? [imageUrl] : (product?.images || []),
        is_best_seller: !!e.target.querySelector('[name="is_best_seller"]').checked,
        is_featured: !!e.target.querySelector('[name="is_featured"]').checked,
      };

      if (isEdit) {
        await productService.updateProduct(product.id, data);
        toast.success('Product updated successfully!');
      } else {
        await productService.createProduct(data);
        toast.success('Product added successfully!');
      }
      navigate('/admin/products');
    } catch (err) {
      toast.error('Failed: ' + err.message);
      btn.disabled = false;
      btn.textContent = isEdit ? '&#128190; Update Product' : '&#10133; Add Product';
    }
  };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: PRODUCT EDIT (fetch then form)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminProductEdit = async (container, id) => {
  try {
    const product = await productService.getProductById(id);
    await adminProductForm(container, product);
  } catch (err) {
    toast.error('Could not load product: ' + err.message);
    navigate('/admin/products');
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: CATEGORIES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminCategories = async (container) => {
  let config = {};
  try {
    config = await configService.getHomepageConfig();
  } catch (_) {
    config = { categories: { items: [] } };
  }
  let cats = normalizeCategoryItems(config.categories?.items || []);

  const renderCatsUI = () => {
    container.innerHTML = `
      <div class="admin-page-header">
        <div><h1>Categories</h1><p>Manage the category grid shown on the homepage</p></div>
        <button class="btn-primary" id="add-cat-btn">+ Add Category</button>
      </div>
      <div class="admin-card" id="categories-list">
        ${cats.length === 0 ? '<div class="admin-empty">No categories yet.</div>' : cats.map((cat, i) => `
          <div class="category-row" data-index="${i}">
            <div class="category-row-info">
              ${cat.image ? `<img src="${escapeAttr(safeImage(cat.image))}" class="cat-thumb" alt="${escapeAttr(cat.name || 'Category')}" data-fallback-src="${escapeAttr(defaultImageFallback)}">` : '<div class="cat-thumb-placeholder">&#128194;</div>'}
              <div>
                <strong>${escapeHtml(cat.name || 'Unnamed')}</strong>
                <p style="color:var(--c-gray-500);font-size:0.85rem">${escapeHtml(cat.tagline || '')}</p>
                <p style="color:var(--c-gray-500);font-size:0.8rem">${escapeHtml(cat.link || '')}</p>
              </div>
            <div class="action-buttons">
              <button class="btn-icon" title="Edit" onclick="app.editCat(${i})">Edit</button>
              <button class="btn-icon" title="Delete" onclick="app.deleteCat(${i})">Delete</button>
              ${i > 0 ? `<button class="btn-icon" title="Move Up" onclick="app.moveCat(${i}, -1)">Up</button>` : ""}
              ${i < cats.length - 1 ? `<button class="btn-icon" title="Move Down" onclick="app.moveCat(${i}, 1)">Down</button>` : ""}
            </div>
          </div>
          ${i < cats.length - 1 ? '<hr class="admin-divider">' : ''}
        `).join('')}
      </div>
    `;

    document.getElementById('add-cat-btn').onclick = () => openCatModal();
  };

  const saveCats = async () => {
    await configService.updateConfig('categories', { title: 'SHOP BY CATEGORY', items: cats });
    const config = await configService.getHomepageConfig();
    store.setState({ homepage: config });
  };

  const openCatModal = (cat = null, index = null) => {
    const isEdit = cat !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Category' : 'Add Category'}</h3>
          <button class="modal-close" id="close-cat-modal">Close</button>
        </div>
        <form id="cat-form" class="admin-form">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Category Name *</label>
              <input type="text" name="name" value="${escapeAttr(cat?.name || '')}" placeholder="e.g. MEN" required>
            </div>
            <div class="form-group">
              <label>Tagline</label>
              <input type="text" name="tagline" value="${escapeAttr(cat?.tagline || '')}" placeholder="e.g. Minimalist Luxury">
            </div>
            <div class="form-group" style="grid-column:span 2">
              <label>Link</label>
              <input type="text" name="link" value="${escapeAttr(cat?.link || '')}" placeholder="/shop?category=Men">
            </div>
          </div>
          <div class="form-group">
            <label>Category Image</label>
            ${createImageInput(cat?.image || '', 'banners')}
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancel-cat">Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? '&#128190; Update' : '&#10133; Add'}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    initImageInput(modal);

    const close = () => modal.remove();
    document.getElementById('close-cat-modal').onclick = close;
    document.getElementById('cancel-cat').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    document.getElementById('cat-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const fd = new FormData(e.target);
        const imageUrl = await resolveImageUrl(modal, 'banners');
        const categoryName = String(fd.get('name') || '').trim();
        const item = {
          name: categoryName,
          tagline: fd.get('tagline'),
          link: fd.get('link') || CATEGORY_LINKS[categoryName] || '/shop',
          image: imageUrl,
        };
        if (isEdit) cats[index] = item;
        else cats.push(item);
        cats = normalizeCategoryItems(cats);
        await saveCats();
        close();
        toast.success(isEdit ? 'Category updated!' : 'Category added!');
        renderCatsUI();
      } catch (err) {
        toast.error('Failed: ' + err.message);
        btn.disabled = false;
      }
    };
  };

  window.app.editCat = (i) => openCatModal(cats[i], i);
  window.app.deleteCat = async (i) => {
    if (!confirm(`Delete category "${cats[i]?.name}"?`)) return;
    cats.splice(i, 1);
    try { await saveCats(); toast.success('Category deleted.'); renderCatsUI(); }
    catch (err) { toast.error('Failed: ' + err.message); }
  };
  window.app.moveCat = async (i, dir) => {
    const j = i + dir;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    try { await saveCats(); renderCatsUI(); }
    catch (err) { toast.error('Failed: ' + err.message); }
  };

  renderCatsUI();
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: ORDERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminOrders = async (container) => {
  const orders = await orderService.getOrders();

  container.innerHTML = `
    <div class="admin-page-header">
      <div><h1>Orders</h1><p>${orders.length} total orders</p></div>
    </div>
    ${orders.length === 0 ? `
      <div class="admin-empty" style="text-align:center;padding:4rem">
        <div style="font-size:3rem">&#128230;</div>
        <h3 style="margin-top:1rem">No orders yet</h3>
        <p style="color:var(--c-gray-500);margin-top:0.5rem">Orders appear here once customers purchase.</p>
      </div>` : `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead><tr>
          <th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th><th>Action</th>
        </tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><code style="font-size:0.75rem">${o.id.substr(0, 8)}â€¦</code></td>
              <td>${o.customer_details?.name || o.user_id?.substr(0, 8) || 'â€”'}</td>
              <td>${Array.isArray(o.items) ? o.items.length + ' item(s)' : 'â€”'}</td>
              <td><strong>Rs. ${Number(o.total_amount).toLocaleString()}</strong></td>
              <td style="font-size:0.8rem">${new Date(o.created_at).toLocaleDateString()}</td>
              <td>
                <span class="badge ${orderService.statusColor(o.status)}">${orderService.statusLabel(o.status)}</span>
              </td>
              <td>
                <select class="status-select" data-id="${o.id}" onchange="app.updateOrderStatus(this)">
                  ${orderService.ORDER_STATUSES.map(s => `
                    <option value="${s}" ${o.status === s ? 'selected' : ''}>${orderService.statusLabel(s)}</option>
                  `).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`}
  `;

  window.app.updateOrderStatus = async (selectEl) => {
    const id = selectEl.dataset.id;
    const status = selectEl.value;
    selectEl.disabled = true;
    try {
      await orderService.updateOrderStatus(id, status);
      toast.success(`Order updated to "${orderService.statusLabel(status)}"`);
    } catch (err) {
      toast.error('Update failed: ' + err.message);
    } finally {
      selectEl.disabled = false;
    }
  };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: HERO BANNER CMS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminHeroCMS = async (container) => {
  let config = {};
  try {
    config = await configService.getHomepageConfig();
  } catch (_) {
    config = {};
  }
  const hero = config.hero || {};

  container.innerHTML = `
    <div class="admin-page-header">
      <div><h1>Hero Banner</h1><p>Customize your homepage hero section</p></div>
    </div>
    <div class="admin-card">
      ${hero.image ? `<div class="hero-preview mb-lg"><img src="${escapeAttr(safeImage(hero.image, heroDefaultUrl))}" class="hero-preview-img" alt="Hero preview" data-fallback-src="${escapeAttr(heroDefaultUrl)}"><div class="hero-preview-overlay"><h2>${escapeHtml(hero.headline || '')}</h2><p>${escapeHtml(hero.subtext || '')}</p></div></div>` : ''}
      <form id="hero-form" class="admin-form">
        <div class="admin-card-header"><span>ðŸ–¼ï¸</span><h2>Banner Image</h2></div>
        ${createImageInput(hero.image || '', 'banners')}

        <div class="admin-card-header mt-lg"><span>ðŸ“</span><h2>Content</h2></div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Headline</label>
            <input type="text" name="headline" value="${escapeAttr(hero.headline || '')}" placeholder="SUMMER COLLECTION 2026">
          </div>
          <div class="form-group">
            <label>Subtext</label>
            <input type="text" name="subtext" value="${escapeAttr(hero.subtext || '')}" placeholder="Experience minimalist luxury">
          </div>
          <div class="form-group">
            <label>Button Text</label>
            <input type="text" name="buttonText" value="${escapeAttr(hero.buttonText || 'SHOP NOW')}" placeholder="SHOP NOW">
          </div>
          <div class="form-group">
            <label>Button Link</label>
            <input type="text" name="link" value="${escapeAttr(hero.link || '/shop')}" placeholder="/shop">
          </div>
          <div class="form-group" style="grid-column:span 2">
            <label>Homepage Video URL</label>
            <input type="text" name="videoUrl" value="${escapeAttr(hero.videoUrl || '')}" placeholder="https://example.com/video.mp4">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="visible" value="true" ${hero.visible !== false ? 'checked' : ''}>
              <span>Show Hero Banner on Homepage</span>
            </label>
          </div>
        </div>
        <div class="form-actions mt-lg">
          <button type="submit" class="btn-primary" id="hero-save-btn">&#128190; Save & Apply to Homepage</button>
        </div>
      </form>
    </div>
  `;

  initImageInput(container);

  document.getElementById('hero-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('hero-save-btn');
    btn.disabled = true; btn.textContent = 'â³ Saving...';
    try {
      const fd = new FormData(e.target);
      const imageUrl = await resolveImageUrl(container, 'banners');
      const data = {
        image: imageUrl || hero.image,
        headline: fd.get('headline'),
        subtext: fd.get('subtext'),
        buttonText: fd.get('buttonText'),
        link: fd.get('link'),
        videoUrl: fd.get('videoUrl'),
        visible: !!e.target.querySelector('[name="visible"]').checked,
      };
      await configService.updateConfig('hero', data);
      const updated = await configService.getHomepageConfig();
      store.setState({ homepage: updated });
      toast.success('Hero banner updated! Changes are live on the homepage.');
      btn.textContent = 'âœ… Saved!';
      setTimeout(() => { btn.disabled = false; btn.textContent = '&#128190; Save & Apply to Homepage'; }, 2500);
      // Re-render to show new preview
      setTimeout(() => adminHeroCMS(container), 2600);
    } catch (err) {
      toast.error('Failed: ' + err.message);
      btn.disabled = false; btn.textContent = '&#128190; Save & Apply to Homepage';
    }
  };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHOP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHOP STATE & LOGIC
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentFilters = {
  category: null,
  brand: null,
  fabric: null,
  search: '',
  priceRange: { min: 0, max: 10000 },
  sizes: [],
  sort: 'created_at:desc',
  offset: 0,
  limit: 12
};

const renderShop = async () => {
  const main = document.getElementById('router-view');
  const urlParams = new URLSearchParams(window.location.search);
  
  // Sync URL params to filter state for initial load
  currentFilters.category = urlParams.get('category') || null;
  currentFilters.search = urlParams.get('search') || '';
  currentFilters.brand = urlParams.get('brand') || null;

  main.innerHTML = `
    <div class="shop-page-wrapper">
      <div class="container py-xl shop-layout">
        <aside class="shop-sidebar">
          <div class="filter-header">
            <h3>FILTERS</h3>
            <button class="clear-all-btn" onclick="app.clearFilters()">CLEAR ALL</button>
          </div>

          <div class="filter-section">
            <h4>CATEGORIES</h4>
            <div class="filter-options">
              <label class="filter-checkbox">
                <input type="radio" name="category" value="" ${!currentFilters.category ? 'checked' : ''} onchange="app.updateShopFilter('category', '', this.checked)">
                <span>All</span>
              </label>
              ${CATEGORY_NAMES.map(cat => `
                <label class="filter-checkbox">
                  <input type="radio" name="category" value="${cat}" ${currentFilters.category === cat ? 'checked' : ''} onchange="app.updateShopFilter('category', '${cat}', this.checked)">
                  <span>${cat}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="filter-section">
            <h4>BRAND</h4>
            <div class="filter-options">
              ${['GUGAN', 'MAX', 'LUMA', 'WALK'].map(brand => `
                <label class="filter-checkbox">
                  <input type="checkbox" name="brand" value="${brand}" ${currentFilters.brand === brand ? 'checked' : ''} onchange="app.updateShopFilter('brand', '${brand}', this.checked)">
                  <span>${brand}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="filter-section">
            <h4>PRICE</h4>
            <div class="price-range-inputs">
              <input type="range" min="0" max="10000" step="500" value="${currentFilters.priceRange.max}" oninput="this.nextElementSibling.textContent = 'Under Rs. ' + Number(this.value).toLocaleString(); app.updateShopFilter('priceMax', this.value)">
              <p class="price-display">Under Rs. ${currentFilters.priceRange.max.toLocaleString()}</p>
            </div>
          </div>
        </aside>

        <div class="shop-content">
          <div class="shop-toolbar">
            <div class="results-count" id="shop-results-count">Showing 0 products</div>
            <div class="sort-wrapper">
              <span>Sort by:</span>
              <select onchange="app.updateShopFilter('sort', this.value)">
                <option value="created_at:desc">Newest First</option>
                <option value="price:asc">Price: Low to High</option>
                <option value="price:desc">Price: High to Low</option>
              </select>
            </div>
          </div>
          <div class="product-grid mt-md" id="shop-product-grid">
            <div class="skeleton-grid"></div>
          </div>
          <div class="load-more-container mt-xl text-center hidden" id="load-more-wrap">
            <button class="btn-gold" onclick="app.loadMoreProducts()">LOAD MORE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Define helper handlers for Shop UI
  window.app.updateShopFilter = (type, value, checked) => {
    if (type === 'category') currentFilters.category = checked ? (value || null) : null;
    if (type === 'brand') currentFilters.brand = checked ? value : null;
    if (type === 'fabric') currentFilters.fabric = checked ? value : null;
    if (type === 'priceMax') currentFilters.priceRange.max = Number(value);
    if (type === 'sort') currentFilters.sort = value;
    if (type === 'size') {
      const idx = currentFilters.sizes.indexOf(value);
      if (idx > -1) currentFilters.sizes.splice(idx, 1);
      else currentFilters.sizes.push(value);
      renderShop(); // Full re-render to update UI state of buttons
      return;
    }
    
    currentFilters.offset = 0; // Reset pagination
    fetchShopProducts();
  };

  window.app.clearFilters = () => {
    currentFilters = { ...currentFilters, category: null, brand: null, fabric: null, sizes: [], priceRange: { min: 0, max: 10000 }, search: '', offset: 0 };
    renderShop();
  };

  window.app.loadMoreProducts = () => {
    currentFilters.offset += currentFilters.limit;
    fetchShopProducts(true);
  };

  fetchShopProducts();
};

const fetchShopProducts = async (append = false) => {
  const grid = document.getElementById('shop-product-grid');
  const countEl = document.getElementById('shop-results-count');
  const loadMoreWrap = document.getElementById('load-more-wrap');
  
  if (!append) grid.innerHTML = '<div class="skeleton-grid"></div>';

  try {
    const { products, total } = await productService.getProducts({
      category: currentFilters.category,
      brand: currentFilters.brand,
      fabric: currentFilters.fabric,
      priceRange: currentFilters.priceRange,
      sort: currentFilters.sort,
      search: currentFilters.search,
      sizes: currentFilters.sizes,
      limit: currentFilters.limit,
      offset: currentFilters.offset
    });

    countEl.textContent = `Showing ${products.length} of ${total} products`;
    
    const html = products.length 
      ? products.map(p => ProductCard(p)).join('')
      : '<div class="empty-state"><h3>No products found</h3><p>Try adjusting your search or filters.</p></div>';

    if (append) grid.innerHTML += html;
    else grid.innerHTML = html;

    // Show/hide load more
    if (total > currentFilters.offset + products.length) {
      loadMoreWrap.classList.remove('hidden');
    } else {
      loadMoreWrap.classList.add('hidden');
    }

    // Attach click handlers
    grid.querySelectorAll('.product-card').forEach(card => {
       card.onclick = () => navigate(`/product/${card.dataset.id}`);
    });

  } catch (err) {
    grid.innerHTML = '<p class="error-msg">Failed to load products. Please try again.</p>';
  }
};


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRODUCT DETAIL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const renderProductDetail = async (id) => {
  const main = document.getElementById('router-view');
  main.innerHTML = `<div class="container py-xl"><div class="loading">Loading...</div></div>`;
  try {
    let product;
    try { product = await productService.getProductById(id); } catch (_) {}
    if (!product) return navigate('/shop');

    const wishlist = store.getState().wishlist || [];
    const isInWishlist = wishlist.includes(product.id);
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['S', 'M', 'L'];
    const price = Number(product.price) || 0;
    const discount = Number(product.discount) || 0;
    const discountedPrice = discount > 0 ? getDiscountedPrice(product) : null;
    const displayImage = safeImage(product.images);
    const safeProductName = escapeHtml(product.name || 'Untitled Product');
    const safeProductBrand = escapeHtml(product.brand || 'GUGAN');
    const safeProductDescription = escapeHtml(product.description || 'Experience the ultimate in comfort and style with this premium piece from Gugan Fashions.');

    main.innerHTML = `
      <div class="pdp-container">
        <div class="pdp-image">
          <img src="${escapeAttr(displayImage)}" alt="${safeProductName}" data-fallback-src="${escapeAttr(defaultImageFallback)}">
        </div>
        <div class="pdp-info">
          <h1 class="pdp-title">${safeProductName}</h1>
          <h2 class="pdp-subtitle">${safeProductBrand}</h2>
          
          <div class="pdp-price-wrap">
            ${discountedPrice
              ? `<span class="pdp-price">Rs. ${discountedPrice.toLocaleString()}</span>
                 <span class="pdp-original-price">Rs. ${price.toLocaleString()}</span>
                 <span class="badge badge-warning" style="margin-left:10px">${discount}% OFF</span>`
              : `<span class="pdp-price">Rs. ${price.toLocaleString()}</span>`
            }
          </div>
          <p class="pdp-taxes">inclusive of all taxes</p>

          <div class="pdp-size-selector">
            <p class="pdp-size-label">SELECT SIZE</p>
            <div class="size-circles">
              ${sizes.map(s => `<button class="size-circle" data-size="${s}">${s}</button>`).join('')}
            </div>
          </div>

          <div class="pdp-actions">
            <button class="btn-add-bag" id="add-to-bag">ADD TO BAG</button>
            <button class="btn-wishlist ${isInWishlist ? 'active' : ''}" id="pdp-wishlist-btn">
              ${isInWishlist ? '&#10084;&#65039; WISHLISTED' : '&#9825; WISHLIST'}
            </button>
          </div>

          <div class="pdp-details mt-xl" style="margin-top: 50px; border-top: 1px solid var(--c-gray-100); padding-top: 30px;">
            <h3 style="font-size: 0.9rem; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 15px;">PRODUCT DESCRIPTION</h3>
            <p style="color: var(--c-gray-500); line-height: 1.8;">${safeProductDescription}</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('pdp-wishlist-btn').onclick = () => {
      app.toggleWishlist(product.id);
    };

    let selectedSize = sizes[2] || sizes[0];
    document.querySelectorAll('.size-circle').forEach(btn => {
      if (btn.dataset.size === selectedSize) btn.classList.add('active');
      btn.onclick = () => {
        document.querySelectorAll('.size-circle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.dataset.size;
      };
    });
    document.getElementById('add-to-bag').onclick = () => {
      actions.addToCart(product, selectedSize);
      renderNavbar();
      toast.success(`"${product.name}" (${selectedSize}) added to bag!`);
    };
  } catch (err) {
    main.innerHTML = `<div class="container py-xl text-center"><p>Error loading product.</p></div>`;
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CART
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const renderCart = () => {
  const main = document.getElementById('router-view');
  const cart = store.getState().cart;

  if (cart.length === 0) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <div style="font-size:4rem">ðŸ›ï¸</div>
        <h2 style="margin-top:1rem">Your Bag is Empty</h2>
        <p style="margin-top:0.5rem;color:hsl(var(--text-muted))">Add some products to get started.</p>
        <button class="btn-primary mt-lg" onclick="app.navigate('/shop')">SHOP NOW</button>
      </div>`;
    return;
  }

  const total = cart.reduce((sum, item) => sum + (getDiscountedPrice(item) * item.quantity), 0);
  main.innerHTML = `
    <div class="cart-page">
      <div class="cart-items-container">
        <div class="cart-header-row">
          <h2 class="cart-title">SHOPPING BAG</h2>
          <span class="item-count">${cart.length} Items</span>
        </div>
        
        <div class="cart-list">
          ${cart.map(item => `
            <div class="cart-item">
              <div class="cart-item-img">
                <img src="${escapeAttr(safeImage(item.images))}" alt="${escapeAttr(item.name || 'Product')}" data-fallback-src="${escapeAttr(defaultImageFallback)}">
              </div>
              <div class="cart-item-details">
                <div class="cart-item-main">
                  <h3 class="cart-item-brand">${item.brand || 'GUGAN'}</h3>
                  <h4 class="cart-item-name">${item.name}</h4>
                  <p class="cart-item-variant">Size: <span>${item.variant}</span></p>
                </div>
                <div class="cart-item-actions">
                  <div class="cart-qty">
                    <button class="qty-btn" onclick="app.updateQty('${item.id}','${item.variant}',${item.quantity - 1})">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="app.updateQty('${item.id}','${item.variant}',${item.quantity + 1})">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                  </div>
                  <button class="remove-link" onclick="app.removeItem('${item.id}','${item.variant}')">Remove</button>
                </div>
              </div>
              <div class="cart-item-price-wrap">
                <p class="cart-item-price">Rs. ${(getDiscountedPrice(item) * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <aside class="cart-summary">
        <h3 class="summary-title">ORDER SUMMARY</h3>
        <div class="summary-details">
          <div class="summary-row">
            <span>Price (${cart.length} items)</span>
            <span>Rs. ${total.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Delivery Charges</span>
            <span class="text-success">FREE</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-row total">
            <span>Total Amount</span>
            <span>Rs. ${total.toLocaleString()}</span>
          </div>
        </div>
        <button class="btn-checkout" id="place-order-btn">PLACE ORDER</button>
        <div class="secure-info">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>100% SECURE PAYMENTS</span>
        </div>
      </aside>
    </div>
  `;

  window.app.updateQty = (id, variant, qty) => {
    if (qty < 1) return;
    actions.updateCartQuantity(id, variant, qty);
    renderCart(); renderNavbar();
  };
  window.app.removeItem = (id, variant) => {
    if (confirm('Remove item?')) { actions.removeFromCart(id, variant); renderCart(); renderNavbar(); }
  };
  document.getElementById('place-order-btn').onclick = async () => {
    const user = store.getState().user;
    if (!user) { navigate('/login'); return; }

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const orderData = {
        user_id: user.id,
        customer_details: { 
          name: user.profile?.full_name || user.user_metadata?.full_name || user.email,
          email: user.email 
        },
        items: cart,
        total_amount: total,
        status: 'ORDER_PLACED'
      };
      
      await orderService.createOrder(orderData);
      actions.clearCart();
      toast.success('Order placed successfully!');
      renderCart();
      renderNavbar();
    } catch (err) {
      toast.error('Failed to place order: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'PLACE ORDER';
    }
  };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HOME + BEST SELLERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HOME SECTIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const renderHome = async () => {
  const main = document.getElementById('router-view');
  const existingHero = document.getElementById('hero-cta');
  existingHero?.__cleanupHero?.();
  const existingMarquee = document.querySelector('.marquee-container');
  existingMarquee?.__cleanupMarquee?.();
  const existingTestimonials = document.querySelector('.testimonials-marquee');
  existingTestimonials?.__cleanupTestimonials?.();
  const config = store.getState().homepage || {};
  const hero = config.hero || {
    image: heroDefaultUrl,
    headline: 'PERFECT CASUAL WEAR',
    subtext: 'Under 449 #CasualStyle',
    buttonText: 'SHOP NOW', link: '/shop', visible: true
  };
  const categories = config.categories || { title: 'SHOP BY CATEGORY', items: [] };
  const heroSlides = getHeroSlides(hero);
  const heroImageFallback = heroSlides[0] || heroDefaultUrl;
  const circleItems = normalizeCategoryItems(Array.isArray(categories.items) && categories.items.length ? categories.items : getDefaultCategoryItems());
  const safeHeroLink = safeAppLink(hero.link, '/shop');
  const homeVideoUrl = safeMediaLink(hero.videoUrl, DEFAULT_HOME_VIDEO_URL);

  main.innerHTML = `
    <div class="home-page">
      <section class="m-hero-card" id="hero-cta" style="cursor:pointer">
        <img src="${escapeAttr(safeImage(heroSlides[0], heroImageFallback))}" class="m-hero-image" alt="Hero" data-fallback-src="${escapeAttr(heroImageFallback)}">
        <div class="m-hero-overlay">
          <span class="m-hero-badge">NEW COLLECTION 2026</span>
          <h1>${escapeHtml(hero.headline || 'PERFECT CASUAL WEAR')}</h1>
          <p>${escapeHtml(hero.subtext || 'Under 449 #CasualStyle')}</p>
          <button class="btn-gold">${escapeHtml(hero.buttonText || 'SHOP NOW')}</button>
        </div>
        <div class="m-hero-dots">${heroSlides.map((_, index) => `<span class="${index === 0 ? 'active' : ''}"></span>`).join('')}</div>
      </section>

      <section class="categories-section">
        <div class="cat-header container" style="margin-bottom: 8px;">
          <h2>Gugan Collection</h2>
          <button class="cat-header-side" onclick="app.navigate('/shop')">View All</button>
        </div>
        <div class="marquee-container">
          <div class="circle-track">
            ${[0, 1].map((copyIndex) => `
              <div class="circle-grid" ${copyIndex === 1 ? 'aria-hidden="true"' : ''}>
                ${circleItems.map((cat) => `
                  <div class="circle-item" onclick="app.navigate('${safeAppLink(cat.link, '/shop')}')">
                    <div class="circle-img-wrap">
                      <img src="${escapeAttr(safeImage(cat.image, CATEGORY_IMAGE_FALLBACKS[String(cat.name || '').toUpperCase()] || heroImageFallback))}" alt="${escapeAttr(cat.name || 'Category')}" data-fallback-src="${escapeAttr(CATEGORY_IMAGE_FALLBACKS[String(cat.name || '').toUpperCase()] || heroImageFallback)}">
                    </div>
                    <span>${escapeHtml(cat.name || 'Category')}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="m-banner-strip">
        <button class="m-banner-card" onclick="app.navigate('/shop?search=Summer Co-ords')">
          <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=700&auto=format&fit=crop" alt="Summer Co-ords">
          <span>SUMMER CO-ORDS</span>
        </button>
        <button class="m-banner-card" onclick="app.navigate('/shop?search=Saree')">
          <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=700&auto=format&fit=crop" alt="Ready To Wear Sarees">
          <span>READY-TO-WEAR SAREES</span>
        </button>
        <button class="m-banner-card" onclick="app.navigate('/shop?search=Tops')">
          <img src="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=700&auto=format&fit=crop" alt="Cute Tops">
          <span>CUTE TOPS</span>
        </button>
      </section>

      <section class="category-showcase-section container">
        <div class="section-header category-showcase-header">
          <h2 style="font-family:var(--font-serif); font-size:2rem;">SHOP BY STYLE STORIES</h2>
          <p>Men, Women, Boys and Girls picks in swipeable rows</p>
        </div>
        ${DEFAULT_SHOWCASE_CATEGORIES.map((category) => `
          <div class="category-showcase-block">
            <div class="category-showcase-title-row">
              <div>
                <span class="category-showcase-kicker">${escapeHtml(category.toUpperCase())}</span>
                <h3>${escapeHtml(category)} Collection</h3>
              </div>
              <button class="category-showcase-link" onclick="app.navigate('${CATEGORY_LINKS[category]}')">VIEW ALL</button>
            </div>
            <div class="category-showcase-rail" id="showcase-${category.toLowerCase()}">
              <div class="showcase-loading">Loading ${escapeHtml(category)} styles...</div>
            </div>
          </div>
          ${category === 'Girls' ? `
            <section class="home-video-section">
              <div class="home-video-copy">
                <span class="category-showcase-kicker">Featured Video</span>
                <h3>Watch The Latest Store Story</h3>
                <p>Update this clip anytime from the admin hero settings to highlight a campaign, product drop, or walkthrough.</p>
                <div class="home-video-meta">
                  <span>Campaign Reel</span>
                  <span>Store Edit</span>
                  <span>Autoplay Off</span>
                </div>
              </div>
              <div class="home-video-frame">
                <div class="home-video-frame-top">
                  <span class="home-video-dot"></span>
                  <span class="home-video-dot"></span>
                  <span class="home-video-dot"></span>
                  <strong>Gugan Video Story</strong>
                </div>
                <video controls playsinline preload="metadata" poster="${escapeAttr(heroImageFallback)}">
                  <source src="${escapeAttr(homeVideoUrl)}" type="video/mp4">
                </video>
              </div>
            </section>
          ` : ''}
        `).join('')}
      </section>

      <section class="m-pocket-section container">
        <div class="cat-header">
          <h2>Pocket Friendly Bargain!</h2>
          <p>WHERE STYLE MATCHES SAVINGS</p>
        </div>
        <div class="m-price-rail">
          <button class="m-price-card" onclick="app.navigate('/shop?search=Tshirt')">
            <img src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=700&auto=format&fit=crop" alt="Tshirts">
            <div><small>Under</small><strong>Rs 349</strong><span>Tshirts</span></div>
          </button>
          <button class="m-price-card" onclick="app.navigate('/shop?search=Shirt')">
            <img src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=700&auto=format&fit=crop" alt="Shirts">
            <div><small>Under</small><strong>Rs 549</strong><span>Shirts</span></div>
          </button>
          <button class="m-price-card" onclick="app.navigate('/shop?search=Dress')">
            <img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=700&auto=format&fit=crop" alt="Dresses">
            <div><small>Under</small><strong>Rs 699</strong><span>Dresses</span></div>
          </button>
          <button class="m-price-card" onclick="app.navigate('/shop?search=Jeans')">
            <img src="https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=700&auto=format&fit=crop" alt="Jeans">
            <div><small>Under</small><strong>Rs 649</strong><span>Jeans</span></div>
          </button>
        </div>
      </section>

      <section class="m-bestseller-categories container">
        <div class="cat-header">
          <h2>Bestseller Categories</h2>
          <p>TOP PICKS, JUST FOR YOU!</p>
        </div>
        <div class="m-cat-large-row">
          <button class="m-cat-large-card" onclick="app.navigate('/shop?search=Saree')">
            <h3>Sarees</h3>
            <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=700&auto=format&fit=crop" alt="Sarees">
            <div class="m-cat-large-meta">
              <strong>UNDER RS 1099</strong>
              <div>KALINI | MIFERA | & MORE</div>
            </div>
          </button>
          <button class="m-cat-large-card" onclick="app.navigate('/shop?search=Kurti')">
            <h3>Kurtis</h3>
            <img src="https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=700&auto=format&fit=crop" alt="Kurtis">
            <div class="m-cat-large-meta">
              <strong>UNDER RS 899</strong>
              <div>KALINI | ANAYNA | & MORE</div>
            </div>
          </button>
        </div>
      </section>

      <section class="home-products-section py-lg container">
        <div class="section-header">
          <h2 style="font-family:var(--font-serif); font-size:2rem;">BESTSELLERS FOR YOU</h2>
          <a href="/shop" class="view-all" style="font-size:0.8rem; font-weight:700; color:var(--c-gold);">VIEW ALL</a>
        </div>
        <div class="product-grid mt-md" id="best-sellers-list"><div class="skeleton-grid"></div></div>
      </section>

      <section class="testimonials-section">
        <div class="container">
          <div class="section-header category-showcase-header">
            <h2 style="font-family:var(--font-serif); font-size:2rem;">What Customers Say</h2>
            <p>Real shopper feedback moving across the storefront</p>
          </div>
        </div>
        <div class="testimonials-marquee">
          <div class="testimonials-track">
            ${[0, 1].map(() => `
              <div class="testimonials-group">
                ${TESTIMONIALS.map((item) => `
                  <article class="testimonial-card">
                    <p>${escapeHtml(item.text)}</p>
                    <strong>${escapeHtml(item.name)}</strong>
                  </article>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    </div>
  `;

  document.getElementById('hero-cta')?.addEventListener('click', (e) => { e.preventDefault(); navigate(safeHeroLink); });
  initHeroRotator(heroSlides, heroImageFallback);
  renderHomeSections();
};
const renderHomeSections = async () => {
  const containers = {
    best: document.getElementById('best-sellers-list'),
    new: document.getElementById('new-arrivals-list'),
    trending: document.getElementById('trending-list'),
    men: document.getElementById('showcase-men'),
    women: document.getElementById('showcase-women'),
    boys: document.getElementById('showcase-boys'),
    girls: document.getElementById('showcase-girls'),
    electronics: document.getElementById('showcase-electronics'),
    footwear: document.getElementById('showcase-footwear'),
    accessories: document.getElementById('showcase-accessories'),
    stationeries: document.getElementById('showcase-stationeries'),
  };

  try {
    const [bestData, newData, trendingData, menData, womenData, boysData, girlsData, electronicsData, footwearData, accessoriesData, stationeriesData] = await Promise.all([
      productService.getProducts({ isBestSeller: true, limit: 4 }),
      productService.getProducts({ limit: 4, sort: 'created_at:desc' }), // logic for new
      productService.getProducts({ isTrending: true, limit: 4 }),
      productService.getProducts({ category: 'Men', limit: 4 }),
      productService.getProducts({ category: 'Women', limit: 4 }),
      productService.getProducts({ category: 'Boys', limit: 4 }),
      productService.getProducts({ category: 'Girls', limit: 4 }),
      productService.getProducts({ category: 'Electronics', limit: 4 }),
      productService.getProducts({ category: 'Footwear', limit: 4 }),
      productService.getProducts({ category: 'Accessories', limit: 4 }),
      productService.getProducts({ category: 'Stationeries', limit: 4 }),
    ]);

    if (containers.best) {
      containers.best.innerHTML = bestData.products.length ? bestData.products.map(p => ProductCard(p)).join('') : '<p>More styles coming soon.</p>';
    }
    if (containers.new) {
       containers.new.innerHTML = newData.products.length ? newData.products.map(p => ProductCard(p)).join('') : '<p>Latest arrivals are on their way.</p>';
    }
    if (containers.trending) {
       containers.trending.innerHTML = trendingData.products.length ? trendingData.products.map(p => ProductCard(p)).join('') : '<p>Checking what\'s popular...</p>';
    }
    if (containers.men) {
      const mensSubcats = [
        { name: 'Shirts', price: '549', image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?q=80&w=600&auto=format&fit=crop' },
        { name: 'T-Shirts', price: '349', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop' },
        { name: 'Jeans', price: '649', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=600&auto=format&fit=crop' },
        { name: 'Hoodies', price: '799', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop' }
      ];
      containers.men.innerHTML = mensSubcats.map(cat => `
        <article class="m-subcat-card" onclick="app.navigate('/shop?search=${encodeURIComponent(cat.name)}')">
          <img src="${cat.image}" alt="${cat.name}" loading="lazy">
          <div class="m-subcat-card-info">
            <span style="font-size:1.1rem; font-weight:700;">${cat.name}</span>
          </div>
        </article>
      `).join('');
    }
    if (containers.women) {
      containers.women.innerHTML = womenData.products.length ? womenData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More women styles coming soon.</p>';
    }
    if (containers.boys) {
      containers.boys.innerHTML = boysData.products.length ? boysData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More boys styles coming soon.</p>';
    }
    if (containers.girls) {
      containers.girls.innerHTML = girlsData.products.length ? girlsData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More girls styles coming soon.</p>';
    }
    if (containers.electronics) {
      containers.electronics.innerHTML = electronicsData.products.length ? electronicsData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More electronics coming soon.</p>';
    }
    if (containers.footwear) {
      containers.footwear.innerHTML = footwearData.products.length ? footwearData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More footwear coming soon.</p>';
    }
    if (containers.accessories) {
      containers.accessories.innerHTML = accessoriesData.products.length ? accessoriesData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More accessories coming soon.</p>';
    }
    if (containers.stationeries) {
      containers.stationeries.innerHTML = stationeriesData.products.length ? stationeriesData.products.map(renderShowcaseProductCard).join('') : '<p class="showcase-empty">More stationery coming soon.</p>';
    }

    // Attach click handlers to all new cards
    document.querySelectorAll('.home-page .product-card').forEach(card => {
       card.onclick = () => navigate(`/product/${card.dataset.id}`);
    });

    initCategoryMarquee();
    initTestimonialsMarquee();

  } catch (err) {
    console.error('Failed to load home sections:', err);
  }
};

const refreshAdminShell = (user) => {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar || sidebar.dataset.version === 'executive') return;

  const navItems = [
    { path: '/admin', icon: '&#128202;', label: 'Overview' },
    { path: '/admin/products', icon: '&#128087;', label: 'Products' },
    { path: '/admin/categories', icon: '&#128450;', label: 'Collections' },
    { path: '/admin/orders', icon: '&#128230;', label: 'Orders' },
    { path: '/admin/cms/hero', icon: '&#128444;', label: 'Experience' },
  ];
  const displayName = user?.profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Admin';

  sidebar.dataset.version = 'executive';
  sidebar.innerHTML = `
    <div class="admin-brand">
      <div class="admin-brand-mark">GF</div>
      <div>
        <h3>Gugan Console</h3>
        <p>Commerce Command Center</p>
      </div>
    </div>
    <div class="admin-operator">
      <span>Signed in as</span>
      <strong>${escapeHtml(displayName)}</strong>
    </div>
    <ul class="admin-nav">
      ${navItems.map(item => `
        <li class="admin-nav-item" data-path="${item.path}">
          <span class="admin-nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </li>
      `).join('')}
    </ul>
    <div class="admin-sidebar-footer">
      <button onclick="app.navigate('/')" class="btn-secondary-sm">Back to Store</button>
    </div>
  `;

  sidebar.querySelectorAll('.admin-nav-item').forEach(item => {
    item.onclick = () => navigate(item.dataset.path);
  });
};


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

