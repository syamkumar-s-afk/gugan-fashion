import './styles/global.css';
import { store, actions } from './store';
import { authService, validateSignupEmail } from './services/auth';
import { ProductCard } from './components/ProductCard';
import { configService } from './services/config';
import { productService } from './services/products';
import { storageService } from './services/storage';
import { orderService } from './services/orders';

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
          <span>ðŸ“‚ Choose image file</span>
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
          <h2>${isSignup ? 'Create Account' : 'Login'}</h2>
          <p>${isSignup ? 'Join Gugan Fashions to start shopping.' : 'Welcome back to Gugan Fashions.'}</p>
        </div>
        <form id="auth-route-form" class="auth-form">
          ${isSignup ? `
            <div class="form-group">
              <label for="auth-full-name">Full Name</label>
              <input type="text" id="auth-full-name" placeholder="Enter your name" required>
            </div>
          ` : ''}
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" placeholder="Enter your email" required>
            <div id="auth-email-errors" class="validation-info"></div>
          </div>
          <div class="form-group">
            <label for="auth-password">Password</label>
            <input type="password" id="auth-password" placeholder="Enter password" required>
            <div id="auth-form-error" class="validation-info"></div>
          </div>
          <button type="submit" class="submit-btn" id="auth-route-submit">${isSignup ? 'SIGN UP' : 'LOGIN'}</button>
        </form>
        <p class="auth-page-switch">
          ${isSignup
            ? 'Already have an account? <a href="/login" id="switch-auth-route">Login</a>'
            : 'New to Gugan Fashions? <a href="/signup" id="switch-auth-route">Create Account</a>'}
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
  else if (path.startsWith('/admin')) renderAdmin(path);
  else if (path.startsWith('/product/')) renderProductDetail(path.split('/').pop());
  else if (path === '/cart') renderCart();
  else renderHome();
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APP INIT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const initApp = async () => {
  actions.setAuthLoading(true);
  try {
    const [userResult, configResult] = await Promise.allSettled([
      authService.getCurrentUser(),
      configService.getHomepageConfig()
    ]);

    if (userResult.status === 'fulfilled') {
      actions.setUser(userResult.value);
    } else {
      console.error('Failed to restore user session:', userResult.reason);
      actions.setUser(null);
    }

    if (configResult.status === 'fulfilled') {
      store.setState({ homepage: configResult.value });
    } else {
      console.error('Failed to load homepage config:', configResult.reason);
    }
  } catch (err) {
    console.error('Init failed:', err);
  } finally {
    actions.setAuthLoading(false);
  }

  authService.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      try {
        const user = await authService.getCurrentUser();
        actions.setUser(user);
      } catch (err) {
        console.error('Auth refresh failed:', err);
        actions.setUser(null);
      }
    } else {
      actions.setUser(null);
    }
    actions.setAuthLoading(false);
    renderNavbar();
    handleRoute();
  });

  store.subscribe((state) => renderNavbar(state.user));

  window.onpopstate = handleRoute;
  renderNavbar();
  handleRoute();
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NAVBAR
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const renderNavbar = (user = store.getState().user) => {
  const header = document.getElementById('main-header');
  const isAdmin = user?.profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  header.innerHTML = `
    <nav class="container nav-wrapper">
      <button class="nav-mobile-toggle" id="nav-mobile-toggle" aria-label="Toggle navigation"><span></span><span></span><span></span></button>
      <div class="nav-left">
        <a href="/" class="logo" id="logo-link">GUGAN</a>
        <ul class="nav-links">
          <li><a href="/shop" id="shop-link">SHOP ALL</a></li>
          <li><a href="/shop?category=Men" id="men-link">MEN</a></li>
          <li><a href="/shop?category=Women" id="women-link">WOMEN</a></li>
          <li><a href="/shop?category=Kids" id="kids-link">KIDS</a></li>
          <li><a href="/shop?category=Accessories" id="accessories-link">ACCESSORIES</a></li>
          ${isAdmin ? '<li><a href="/admin" id="admin-link" class="admin-nav-link">CMS</a></li>' : ''}
          ${!user ? '<li><a href="/login" id="login-link">LOGIN</a></li>' : ''}
        </ul>
      </div>
        <div class="nav-center">
          <div class="search-bar">
            <span class="search-icon"><img class="nav-search-icon-img" src="/nav/search-icon.svg" alt="Search"></span>
            <input type="text" id="nav-search-input" placeholder="Search for products, brands and more">
          </div>
        </div>
      <div class="nav-right">
        <div class="nav-actions">
          <div class="action-item profile" id="profile-action">
            <span><img class="nav-icon-img" src="/nav/profile-icon.svg" alt="Profile"></span>
            <p>${user ? (user.profile?.full_name || user.user_metadata?.full_name || 'Account') : 'Profile'}</p>
          </div>
          <div class="action-item"><span><img class="nav-icon-img" src="/nav/wishlist-icon.svg" alt="Wishlist"></span><p>Wishlist</p></div>
          <a href="/cart" class="action-item cart" id="cart-link">
            <span><img class="nav-icon-img" src="/nav/cart-icon.svg" alt="Cart"></span><p>Cart</p>
          </a>
        </div>
      </div>
    </nav>
  `;

  document.getElementById('logo-link').onclick = (e) => { e.preventDefault(); navigate('/'); };
  document.getElementById('shop-link').onclick = (e) => { e.preventDefault(); navigate('/shop'); };
  document.getElementById('men-link').onclick = (e) => { e.preventDefault(); navigate('/shop?category=Men'); };
  document.getElementById('women-link').onclick = (e) => { e.preventDefault(); navigate('/shop?category=Women'); };
  document.getElementById('kids-link').onclick = (e) => { e.preventDefault(); navigate('/shop?category=Kids'); };
  document.getElementById('accessories-link').onclick = (e) => { e.preventDefault(); navigate('/shop?category=Accessories'); };
  document.getElementById('cart-link').onclick = (e) => { e.preventDefault(); navigate('/cart'); };
  document.getElementById('login-link')?.addEventListener('click', (e) => { e.preventDefault(); navigate('/login'); });
  if (isAdmin) document.getElementById('admin-link').onclick = (e) => { e.preventDefault(); navigate('/admin'); };

  document.getElementById('profile-action').onclick = () => {
    const currentUser = store.getState().user;
    if (currentUser) {
      if (confirm(`Logout ${currentUser.email}?`)) {
        authService.signOut();
      }
    } else {
      navigate('/login');
    }
  };

  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    searchInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) navigate(`/shop?search=${encodeURIComponent(q)}`);
      }
    };
  }

  document.getElementById('nav-mobile-toggle')?.addEventListener('click', () => {
    header.classList.toggle('nav-open');
  });
  header.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => header.classList.remove('nav-open'));
  });
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
        <div style="font-size:4rem">ðŸ”’</div>
        <h1 style="margin-top:1rem">Access Denied</h1>
        <p class="mt-md" style="color:hsl(var(--text-muted))">You must be an admin to access this panel.</p>
        <button class="btn-primary mt-lg" onclick="app.navigate('/')">Go Home</button>
      </div>`;
    return;
  }

  // Only re-render shell if not already present
  if (!document.getElementById('admin-content')) {
    main.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div class="admin-brand"><span>âš™ï¸</span><h3>Admin CMS</h3></div>
          <ul class="admin-nav">
            <li class="admin-nav-item" data-path="/admin"><span>ðŸ“Š</span> Dashboard</li>
            <li class="admin-nav-item" data-path="/admin/products"><span>ðŸ‘—</span> Products</li>
            <li class="admin-nav-item" data-path="/admin/categories"><span>ðŸ“‚</span> Categories</li>
            <li class="admin-nav-item" data-path="/admin/orders"><span>ðŸ“¦</span> Orders</li>
            <li class="admin-nav-item" data-path="/admin/cms/hero"><span>ðŸ–¼ï¸</span> Hero Banner</li>
          </ul>
          <div class="admin-sidebar-footer">
            <button onclick="app.navigate('/')" class="btn-secondary-sm">â† Back to Store</button>
          </div>
        </aside>
        <main class="admin-content" id="admin-content"></main>
      </div>
    `;

    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.onclick = () => navigate(item.dataset.path);
    });
  }

  // Update active nav
  document.querySelectorAll('.admin-nav-item').forEach(i => {
    i.classList.toggle('active', path.startsWith(i.dataset.path) && (i.dataset.path === '/admin' ? path === '/admin' : true));
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
    else content.innerHTML = `<div class="admin-error">Page not found: ${path}</div>`;
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="admin-error">âŒ ${err.message}</div>`;
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: DASHBOARD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminDashboard = async (container) => {
  let productCount = 0, orderCount = 0, latestUpdate = '--';
  try {
    const [{ products }, orders] = await Promise.all([
      productService.getProducts({}),
      orderService.getOrders(),
    ]);
    productCount = products.length;
    orderCount = orders.length;
    if (products.length > 0) {
      const latest = [...products].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
      latestUpdate = new Date(latest.updated_at).toLocaleString();
    }
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
  }

  container.innerHTML = `
    <div class="admin-page-header">
      <div><h1>Dashboard</h1><p>Welcome back, ${store.getState().user?.profile?.full_name || store.getState().user?.email}</p></div>
    </div>
    <div class="admin-stats-grid">
      <div class="stat-card">
        <div class="stat-icon">ðŸ‘—</div>
        <div class="stat-info"><p class="stat-label">Total Products</p><h2 class="stat-value">${productCount}</h2></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">ðŸ“¦</div>
        <div class="stat-info"><p class="stat-label">Total Orders</p><h2 class="stat-value">${orderCount}</h2></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">ðŸ•</div>
        <div class="stat-info"><p class="stat-label">Last Updated</p><h2 class="stat-value" style="font-size:0.95rem;">${latestUpdate}</h2></div>
      </div>
    </div>
    <div class="admin-quick-actions mt-xl">
      <h2 class="section-title-sm">Quick Actions</h2>
      <div class="quick-action-grid mt-md">
        <button class="quick-action-card" onclick="app.navigate('/admin/products/add')"><span>âž•</span><p>Add Product</p></button>
        <button class="quick-action-card" onclick="app.navigate('/admin/cms/hero')"><span>ðŸ–¼ï¸</span><p>Edit Hero Banner</p></button>
        <button class="quick-action-card" onclick="app.navigate('/admin/categories')"><span>ðŸ“‚</span><p>Edit Categories</p></button>
        <button class="quick-action-card" onclick="app.navigate('/admin/orders')"><span>ðŸ“‹</span><p>View Orders</p></button>
      </div>
    </div>
  `;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ADMIN: PRODUCTS LIST + ADD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                  ${p.images?.[0] ? `<img src="${p.images[0]}" class="product-thumb">` : '<div class="product-thumb-placeholder">ðŸ“¦</div>'}
                  <div><p class="product-cell-name">${p.name}</p><p class="product-cell-brand">${p.brand || ''}</p></div>
                </div>
              </td>
              <td><span class="badge">${p.category}</span></td>
              <td><strong>Rs. ${Number(p.price).toLocaleString()}</strong></td>
              <td>${p.discount ? `<span class="badge badge-warning">${p.discount}%</span>` : 'â€”'}</td>
              <td>${p.stock ?? 'â€”'}</td>
              <td>${p.is_best_seller ? '<span class="badge badge-success">Yes</span>' : 'â€”'}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" title="Edit" onclick="app.navigate('/admin/products/edit/${p.id}')">âœï¸</button>
                  <button class="btn-icon" title="Delete" onclick="app.adminDeleteProduct('${p.id}','${p.name}')">ðŸ—‘ï¸</button>
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
  const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories'];

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
        <p><a href="#" onclick="app.navigate('/admin/products'); return false;" style="color:hsl(var(--primary))">â† Back to Products</a></p>
      </div>
    </div>
    <div class="admin-card">
      <form id="product-form" class="admin-form" autocomplete="off">
        <div class="form-grid-2">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" name="name" value="${product?.name || ''}" placeholder="e.g. Premium Linen Shirt" required>
          </div>
          <div class="form-group">
            <label>Brand</label>
            <input type="text" name="brand" value="${product?.brand || ''}" placeholder="e.g. GUGAN">
          </div>
          <div class="form-group">
            <label>Category *</label>
            <select name="category" required>
              <option value="">Select Category</option>
              ${allCats.map(c => `<option value="${c}" ${product?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
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
          <textarea name="description" rows="4" placeholder="Describe the product...">${product?.description || ''}</textarea>
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
            ${isEdit ? 'ðŸ’¾ Update Product' : 'âž• Add Product'}
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

      const sizes = [...fd.getAll('name')]; // just in case; directly grab checkboxes
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
      btn.textContent = isEdit ? 'ðŸ’¾ Update Product' : 'âž• Add Product';
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
  const config = await configService.getHomepageConfig();
  let cats = config.categories?.items || [];

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
              ${cat.image ? `<img src="${cat.image}" class="cat-thumb">` : '<div class="cat-thumb-placeholder">ðŸ“‚</div>'}
              <div>
                <strong>${cat.name || 'Unnamed'}</strong>
                <p style="color:hsl(var(--text-muted));font-size:0.85rem">${cat.tagline || ''}</p>
                <p style="color:hsl(var(--text-muted));font-size:0.8rem">${cat.link || ''}</p>
              </div>
            </div>
            <div class="action-buttons">
              <button class="btn-icon" title="Edit" onclick="app.editCat(${i})">âœï¸</button>
              <button class="btn-icon" title="Delete" onclick="app.deleteCat(${i})">ðŸ—‘ï¸</button>
              ${i > 0 ? `<button class="btn-icon" title="Move Up" onclick="app.moveCat(${i}, -1)">â†‘</button>` : ''}
              ${i < cats.length - 1 ? `<button class="btn-icon" title="Move Down" onclick="app.moveCat(${i}, 1)">â†“</button>` : ''}
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
          <button class="modal-close" id="close-cat-modal">âœ•</button>
        </div>
        <form id="cat-form" class="admin-form">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Category Name *</label>
              <input type="text" name="name" value="${cat?.name || ''}" placeholder="e.g. MEN" required>
            </div>
            <div class="form-group">
              <label>Tagline</label>
              <input type="text" name="tagline" value="${cat?.tagline || ''}" placeholder="e.g. Minimalist Luxury">
            </div>
            <div class="form-group" style="grid-column:span 2">
              <label>Link</label>
              <input type="text" name="link" value="${cat?.link || ''}" placeholder="/shop?category=Men">
            </div>
          </div>
          <div class="form-group">
            <label>Category Image</label>
            ${createImageInput(cat?.image || '', 'banners')}
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="cancel-cat">Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? 'ðŸ’¾ Update' : 'âž• Add'}</button>
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
        const item = {
          name: fd.get('name'),
          tagline: fd.get('tagline'),
          link: fd.get('link'),
          image: imageUrl,
        };
        if (isEdit) cats[index] = item;
        else cats.push(item);
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
        <div style="font-size:3rem">ðŸ“¦</div>
        <h3 style="margin-top:1rem">No orders yet</h3>
        <p style="color:hsl(var(--text-muted));margin-top:0.5rem">Orders appear here once customers purchase.</p>
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
  const config = await configService.getHomepageConfig();
  const hero = config.hero || {};

  container.innerHTML = `
    <div class="admin-page-header">
      <div><h1>Hero Banner</h1><p>Customize your homepage hero section</p></div>
    </div>
    <div class="admin-card">
      ${hero.image ? `<div class="hero-preview mb-lg"><img src="${hero.image}" class="hero-preview-img"><div class="hero-preview-overlay"><h2>${hero.headline || ''}</h2><p>${hero.subtext || ''}</p></div></div>` : ''}
      <form id="hero-form" class="admin-form">
        <div class="admin-card-header"><span>ðŸ–¼ï¸</span><h2>Banner Image</h2></div>
        ${createImageInput(hero.image || '', 'banners')}

        <div class="admin-card-header mt-lg"><span>ðŸ“</span><h2>Content</h2></div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Headline</label>
            <input type="text" name="headline" value="${hero.headline || ''}" placeholder="SUMMER COLLECTION 2026">
          </div>
          <div class="form-group">
            <label>Subtext</label>
            <input type="text" name="subtext" value="${hero.subtext || ''}" placeholder="Experience minimalist luxury">
          </div>
          <div class="form-group">
            <label>Button Text</label>
            <input type="text" name="buttonText" value="${hero.buttonText || 'SHOP NOW'}" placeholder="SHOP NOW">
          </div>
          <div class="form-group">
            <label>Button Link</label>
            <input type="text" name="link" value="${hero.link || '/shop'}" placeholder="/shop">
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="visible" value="true" ${hero.visible !== false ? 'checked' : ''}>
              <span>Show Hero Banner on Homepage</span>
            </label>
          </div>
        </div>
        <div class="form-actions mt-lg">
          <button type="submit" class="btn-primary" id="hero-save-btn">ðŸ’¾ Save & Apply to Homepage</button>
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
        visible: !!e.target.querySelector('[name="visible"]').checked,
      };
      await configService.updateConfig('hero', data);
      const updated = await configService.getHomepageConfig();
      store.setState({ homepage: updated });
      toast.success('Hero banner updated! Changes are live on the homepage.');
      btn.textContent = 'âœ… Saved!';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'ðŸ’¾ Save & Apply to Homepage'; }, 2500);
      // Re-render to show new preview
      setTimeout(() => adminHeroCMS(container), 2600);
    } catch (err) {
      toast.error('Failed: ' + err.message);
      btn.disabled = false; btn.textContent = 'ðŸ’¾ Save & Apply to Homepage';
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
        <!-- SIDEBAR FILTERS -->
        <aside class="shop-sidebar">
          <div class="filter-header">
            <h3 class="filter-title">FILTERS</h3>
            <button class="clear-all-btn" onclick="app.clearFilters()">CLEAR ALL</button>
          </div>

          <div class="filter-section">
            <h4 class="filter-subtitle">CATEGORIES</h4>
            <div class="filter-options">
              <label class="filter-checkbox">
                <input type="radio" name="category" value="" ${!currentFilters.category ? 'checked' : ''} onchange="app.updateShopFilter('category', '', this.checked)">
                <span>All</span>
              </label>
              ${['Men', 'Women', 'Kids', 'Accessories'].map(cat => `
                <label class="filter-checkbox">
                  <input type="radio" name="category" value="${cat}" ${currentFilters.category === cat ? 'checked' : ''} onchange="app.updateShopFilter('category', '${cat}', this.checked)">
                  <span>${cat}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="filter-section">
            <h4 class="filter-subtitle">BRAND</h4>
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
            <h4 class="filter-subtitle">PRICE</h4>
            <div class="price-range-inputs">
              <input type="range" min="0" max="10000" step="500" value="${currentFilters.priceRange.max}" oninput="this.nextElementSibling.textContent = 'Under Rs. ' + Number(this.value).toLocaleString(); app.updateShopFilter('priceMax', this.value)">
              <p class="price-display">Under Rs. ${currentFilters.priceRange.max.toLocaleString()}</p>
            </div>
          </div>

          <div class="filter-section">
            <h4 class="filter-subtitle">SIZE</h4>
            <div class="size-grid-filter">
              ${['S', 'M', 'L', 'XL', 'XXL'].map(size => `
                <button class="filter-size-btn ${currentFilters.sizes.includes(size) ? 'active' : ''}" onclick="app.updateShopFilter('size', '${size}')">${size}</button>
              `).join('')}
            </div>
          </div>

          <div class="filter-section">
            <h4 class="filter-subtitle">FABRIC</h4>
            <div class="filter-options">
              ${['Cotton', 'Silk', 'Linen', 'Polyester'].map(f => `
                <label class="filter-checkbox">
                  <input type="checkbox" name="fabric" value="${f}" onchange="app.updateShopFilter('fabric', '${f}', this.checked)">
                  <span>${f}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </aside>

        <!-- MAIN SHOP CONTENT -->
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
            <button class="btn-secondary" onclick="app.loadMoreProducts()">Load More</button>
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

    const sizes = product.sizes?.length ? product.sizes : ['XS','S','M','L','XL','XXL'];
    const discountedPrice = product.discount ? Math.round(product.price * (1 - product.discount / 100)) : null;

    main.innerHTML = `
      <div class="container py-xl pdp-layout">
        <div class="pdp-images"><img src="${product.images?.[0] || ''}" alt="${product.name}" style="width:100%;border-radius:12px;object-fit:cover;max-height:600px;"></div>
        <div class="pdp-info">
          <h1 class="brand-name-lg">${product.brand || ''}</h1>
          <h2 class="product-name-lg">${product.name}</h2>
          <div class="price-box-lg">
            ${discountedPrice
              ? `<span class="current-price-lg">Rs. ${discountedPrice.toLocaleString()}</span>
                 <span style="text-decoration:line-through;color:hsl(var(--text-muted));margin-left:0.75rem">Rs. ${Number(product.price).toLocaleString()}</span>
                 <span class="badge badge-warning" style="margin-left:0.5rem">${product.discount}% OFF</span>`
              : `<span class="current-price-lg">Rs. ${Number(product.price).toLocaleString()}</span>`
            }
            <span class="tax-info"> incl. all taxes</span>
          </div>
          <div class="size-selector mt-lg">
            <p>SELECT SIZE</p>
            <div class="size-options">${sizes.map(s => `<button class="size-btn" data-size="${s}">${s}</button>`).join('')}</div>
          </div>
          <div class="pdp-actions mt-lg">
            <button class="btn-primary-lg" id="add-to-bag">ADD TO BAG</button>
            <button class="btn-secondary-lg">WISHLIST</button>
          </div>
          ${product.description ? `<div class="pdp-details mt-lg"><h3>PRODUCT DETAILS</h3><p>${product.description}</p></div>` : ''}
        </div>
      </div>
    `;

    let selectedSize = sizes[2] || sizes[0];
    document.querySelectorAll('.size-btn').forEach(btn => {
      if (btn.dataset.size === selectedSize) btn.classList.add('active');
      btn.onclick = () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  main.innerHTML = `
    <div class="container py-xl cart-layout">
      <div class="cart-items">
        <h2 class="section-title-sm">SHOPPING BAG (${cart.length} Items)</h2>
        ${cart.map(item => `
          <div class="cart-item">
            <img src="${item.images?.[0] || ''}">
            <div class="item-info">
              <p class="brand">${item.brand || ''}</p>
              <p class="name">${item.name}</p>
              <p style="color:hsl(var(--text-muted));font-size:0.85rem">Size: ${item.variant}</p>
              <div class="qty-control mt-sm">
                <button class="qty-btn" onclick="app.updateQty('${item.id}','${item.variant}',${item.quantity - 1})">âˆ’</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="app.updateQty('${item.id}','${item.variant}',${item.quantity + 1})">+</button>
              </div>
            </div>
            <div class="item-price">
              <p>Rs. ${(item.price * item.quantity).toLocaleString()}</p>
              <button class="remove-btn" onclick="app.removeItem('${item.id}','${item.variant}')">REMOVE</button>
            </div>
          </div>
        `).join('')}
      </div>
      <aside class="order-summary">
        <h2 class="section-title-sm">PRICE DETAILS</h2>
        <div class="summary-row"><span>Total MRP</span><span>Rs. ${total.toLocaleString()}</span></div>
        <div class="summary-row"><span>Convenience Fee</span><span class="free">FREE</span></div>
        <hr>
        <div class="summary-total"><span>Total Amount</span><span>Rs. ${total.toLocaleString()}</span></div>
        <button class="btn-primary-lg mt-lg" id="place-order-btn">PLACE ORDER</button>
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
  const config = store.getState().homepage || {};
  const hero = config.hero || {
    image: '/homepage_hero_banner_1776790133387.png',
    headline: 'PERFECT CASUAL WEAR',
    subtext: 'Under 449 #CasualStyle',
    buttonText: 'SHOP NOW', link: '/shop', visible: true
  };
  const categories = config.categories || { title: 'SHOP BY CATEGORY', items: [] };
  const heroImageFallback = 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1600&auto=format&fit=crop';
  const categoryImageFallbacks = {
    MEN: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=600&auto=format&fit=crop',
    WOMEN: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
    KIDS: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=600&auto=format&fit=crop',
    ACCESSORIES: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=600&auto=format&fit=crop',
    SHIRTS: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=600&auto=format&fit=crop',
    JEANS: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=600&auto=format&fit=crop',
    'T-SHIRTS': 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop',
    TROUSERS: 'https://images.unsplash.com/photo-1614251055880-ee96e4803393?q=80&w=600&auto=format&fit=crop'
  };

  const fallbackCircleItems = [
    { name: 'Shirts', link: '/shop?category=Men', image: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=600&auto=format&fit=crop' },
    { name: 'Jeans', link: '/shop?search=Jeans', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=600&auto=format&fit=crop' },
    { name: 'T-Shirts', link: '/shop?search=Tshirt', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop' },
    { name: 'Trousers', link: '/shop?search=Trousers', image: 'https://images.unsplash.com/photo-1614251055880-ee96e4803393?q=80&w=600&auto=format&fit=crop' },
  ];
  const circleItems = categories.items?.length
    ? categories.items.map((cat) => {
        const key = String(cat?.name || '').toUpperCase();
        return {
          ...cat,
          image: cat?.image || categoryImageFallbacks[key] || heroImageFallback
        };
      })
    : fallbackCircleItems;

  const rowWomen = [
    { name: 'Sarees', link: '/shop?search=Saree', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600&auto=format&fit=crop' },
    { name: 'Kurta Sets', link: '/shop?search=Kurta', image: 'https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?q=80&w=600&auto=format&fit=crop' },
    { name: 'Dresses', link: '/shop?search=Dress', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop' },
    { name: 'Tops', link: '/shop?search=Top', image: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?q=80&w=600&auto=format&fit=crop' },
  ];
  const rowKids = [
    { name: 'Boys Shirts', link: '/shop?search=Boys Shirt', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=600&auto=format&fit=crop' },
    { name: 'Kids Tees', link: '/shop?search=Kids Tee', image: 'https://images.unsplash.com/photo-1517677129300-07b130802f46?q=80&w=600&auto=format&fit=crop' },
    { name: 'Kids Jeans', link: '/shop?search=Kids Jeans', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format&fit=crop' },
    { name: 'Kids Shoes', link: '/shop?search=Kids Shoes', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop' },
  ];

  main.innerHTML = `
    <div class="home-page">
      <div class="container home-shell">
        ${hero.visible !== false ? `
        <section class="m-hero-card">
          <img src="${hero.image || heroImageFallback}" alt="${hero.headline}" class="m-hero-image" onerror="this.src='${heroImageFallback}'">
          <div class="m-hero-overlay">
            <span class="m-hero-badge">GUGAN HOME FASHIONS EXCLUSIVE</span>
            <h1>${hero.headline}</h1>
            <p>${hero.subtext}</p>
            <a href="${hero.link || '/shop'}" class="m-hero-cta" id="hero-cta">${hero.buttonText || 'SHOP NOW'}</a>
          </div>
          <button class="m-hero-next" onclick="app.navigate('/shop')">&gt;</button>
          <div class="m-hero-dots"><span class="active"></span><span></span><span></span><span></span><span></span></div>
        </section>` : ''}

        <section class="m-cashback-strip">
          <span>Get 7.5% Cashback* <small>| No joining fee</small></span>
          <button onclick="app.navigate('/shop')">Apply Now</button>
        </section>

        <section class="m-category-row-wrap">
          <div class="m-sec-head"><h2>Men</h2><p>Top Picks</p></div>
          <div class="m-circle-row">
            ${circleItems.map(cat => `
              <button class="m-circle-item" onclick="app.navigate('${cat.link || '/shop'}')">
                <span class="m-circle-image"><img src="${cat.image || heroImageFallback}" alt="${cat.name}" data-fallback="${categoryImageFallbacks[String(cat.name || '').toUpperCase()] || heroImageFallback}" onerror="this.src=this.dataset.fallback"></span>
                <span>${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="m-category-row-wrap">
          <div class="m-sec-head"><h2>Women</h2><p>Trending</p></div>
          <div class="m-circle-row">
            ${rowWomen.map(cat => `
              <button class="m-circle-item" onclick="app.navigate('${cat.link}')">
                <span class="m-circle-image"><img src="${cat.image}" alt="${cat.name}"></span>
                <span>${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="m-category-row-wrap">
          <div class="m-sec-head"><h2>Kids</h2><p>Everyday Essentials</p></div>
          <div class="m-circle-row">
            ${rowKids.map(cat => `
              <button class="m-circle-item" onclick="app.navigate('${cat.link}')">
                <span class="m-circle-image"><img src="${cat.image}" alt="${cat.name}"></span>
                <span>${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="m-banner-strip">
          <button class="m-banner-card" onclick="app.navigate('/shop?search=Summer Co-ords')"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=700&auto=format&fit=crop" alt="Summer Co-ords"><span>SUMMER CO-ORDS</span></button>
          <button class="m-banner-card" onclick="app.navigate('/shop?search=Saree')"><img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=700&auto=format&fit=crop" alt="Ready To Wear Sarees"><span>READY-TO-WEAR SAREES</span></button>
          <button class="m-banner-card" onclick="app.navigate('/shop?search=Tops')"><img src="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=700&auto=format&fit=crop" alt="Cute Tops"><span>CUTE TOPS</span></button>
        </section>

        <section class="m-pocket-section">
          <h2>Pocket Friendly Bargain!</h2>
          <p>Where style matches savings</p>
          <div class="m-price-rail">
            <button class="m-price-card" onclick="app.navigate('/shop?search=Tshirt')"><img src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=700&auto=format&fit=crop" alt="Tshirts"><div><small>Under</small><strong>Rs 349</strong><span>Tshirts</span></div></button>
            <button class="m-price-card" onclick="app.navigate('/shop?search=Shirt')"><img src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=700&auto=format&fit=crop" alt="Shirts"><div><small>Under</small><strong>Rs 549</strong><span>Shirts</span></div></button>
            <button class="m-price-card" onclick="app.navigate('/shop?search=Dress')"><img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=700&auto=format&fit=crop" alt="Dresses"><div><small>Under</small><strong>Rs 699</strong><span>Dresses</span></div></button>
            <button class="m-price-card" onclick="app.navigate('/shop?search=Jeans')"><img src="https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=700&auto=format&fit=crop" alt="Jeans"><div><small>Under</small><strong>Rs 649</strong><span>Jeans</span></div></button>
          </div>
          <div class="m-hero-dots compact"><span class="active"></span><span></span><span></span></div>
        </section>

        <section class="m-bestseller-categories">
          <div class="m-sec-head stack">
            <h2>Bestseller Categories</h2>
            <p>Top Picks, Just For You!</p>
          </div>
          <div class="m-cat-large-row">
            <button class="m-cat-large-card" onclick="app.navigate('/shop?search=Saree')">
              <h3>Sarees</h3>
              <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=700&auto=format&fit=crop" alt="Sarees">
              <div class="m-cat-large-meta"><strong>Under Rs 1099</strong><span>Kalini</span><span>Mifera</span><span>& More</span></div>
            </button>
            <button class="m-cat-large-card" onclick="app.navigate('/shop?search=Kurti')">
              <h3>Kurtis</h3>
              <img src="https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=700&auto=format&fit=crop" alt="Kurtis">
              <div class="m-cat-large-meta"><strong>Under Rs 899</strong><span>Kalini</span><span>Anayna</span><span>& More</span></div>
            </button>
          </div>
        </section>

        <section class="home-products-section py-lg">
          <div class="section-header"><h2>BESTSELLERS FOR YOU</h2><a href="/shop" class="view-all">VIEW ALL</a></div>
          <div class="product-grid mt-md" id="best-sellers-list"><div class="skeleton-grid"></div></div>
        </section>

        <section class="home-products-section py-lg">
          <div class="section-header"><h2>FRESH DROPS</h2><a href="/shop?sort=created_at:desc" class="view-all">VIEW ALL</a></div>
          <div class="product-grid mt-md" id="new-arrivals-list"><div class="skeleton-grid"></div></div>
        </section>

        <section class="home-products-section py-lg">
          <div class="section-header"><h2>TRENDING PICKS</h2><a href="/shop" class="view-all">VIEW ALL</a></div>
          <div class="product-grid mt-md" id="trending-list"><div class="skeleton-grid"></div></div>
        </section>

        <section class="fabric-highlights py-lg">
          <h2 class="section-title">THE FABRIC STORY</h2>
          <div class="fabric-grid mt-md">
            <div class="fabric-card" onclick="app.navigate('/shop?search=Linen')">
              <img src="https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=2070&auto=format&fit=crop" alt="Pure Linen">
              <div class="fabric-overlay"><h3>PURE LINEN</h3><p>Breathable & Sustainable</p></div>
            </div>
            <div class="fabric-card" onclick="app.navigate('/shop?search=Silk')">
              <img src="https://images.unsplash.com/photo-1610631882987-313172e29729?q=80&w=1974&auto=format&fit=crop" alt="Heritage Silk">
              <div class="fabric-overlay"><h3>HERITAGE SILK</h3><p>Timeless Elegance</p></div>
            </div>
          </div>
        </section>
      </div>

      <section class="newsletter-section">
        <div class="container newsletter-content">
          <h2>JOIN THE GUGAN CLUB</h2>
          <p>Subscribe for exclusive early access and fashion updates.</p>
          <form class="newsletter-form mt-lg" onsubmit="event.preventDefault(); toast.success('Subscription successful!')">
            <input type="email" placeholder="Enter your email address" required>
            <button type="submit">SUBSCRIBE</button>
          </form>
        </div>
      </section>

      <footer class="main-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <h3>GUGAN</h3>
            <p>Redefining modern fashion with minimalist luxury since 2024.</p>
            <div class="social-links mt-md"><span>FB</span> <span>IG</span> <span>TW</span></div>
          </div>
          <div class="footer-links">
            <h4>SHOP</h4>
            <a href="/shop">Men</a><a href="/shop">Women</a><a href="/shop">Kids</a><a href="/shop">Accessories</a>
          </div>
          <div class="footer-links">
            <h4>SUPPORT</h4>
            <a href="#">Contact Us</a><a href="#">Shipping</a><a href="#">Returns</a><a href="#">FAQs</a>
          </div>
          <div class="footer-links">
            <h4>LEGAL</h4>
            <a href="#">Privacy Policy</a><a href="#">Terms of Service</a>
          </div>
        </div>
        <div class="footer-bottom mt-xl"><p>© 2026 Gugan Fashions. All Rights Reserved.</p></div>
      </footer>
    </div>
  `;

  document.getElementById('hero-cta')?.addEventListener('click', (e) => { e.preventDefault(); navigate(hero.link || '/shop'); });
  renderHomeSections();
};
const renderHomeSections = async () => {
  const containers = {
    best: document.getElementById('best-sellers-list'),
    new: document.getElementById('new-arrivals-list'),
    trending: document.getElementById('trending-list')
  };

  try {
    const [bestData, newData, trendingData] = await Promise.all([
      productService.getProducts({ isBestSeller: true, limit: 4 }),
      productService.getProducts({ limit: 4, sort: 'created_at:desc' }), // logic for new
      productService.getProducts({ isTrending: true, limit: 4 })
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

    // Attach click handlers to all new cards
    document.querySelectorAll('.home-page .product-card').forEach(card => {
       card.onclick = () => navigate(`/product/${card.dataset.id}`);
    });

  } catch (err) {
    console.error('Failed to load home sections:', err);
  }
};


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}



