import './styles/global.css';
import { store, actions } from './store';
import { authService } from './services/auth';
import { renderAuthModal } from './components/AuthModal';
import { ProductCard } from './components/ProductCard';
import { configService } from './services/config';
import { productService } from './services/products';
import { storageService } from './services/storage';
import { orderService } from './services/orders';

// ─────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────
const toastQueue = [];
let toastContainer = null;

const showToast = (message, type = 'success', duration = 3500) => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-root';
    document.body.appendChild(toastContainer);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><span>${message}</span><button class="toast-close">✕</button>`;
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

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
window.app = window.app || {};
window.app.navigate = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
const navigate = window.app.navigate;

// ─────────────────────────────────────────────
// IMAGE UPLOAD HELPER (with URL fallback)
// ─────────────────────────────────────────────
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
          <span>📂 Choose image file</span>
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

// ─────────────────────────────────────────────
// APP INIT
// ─────────────────────────────────────────────
const initApp = async () => {
  try {
    const user = await authService.getCurrentUser();
    actions.setUser(user);
    const config = await configService.getHomepageConfig();
    store.setState({ homepage: config });
  } catch (err) {
    console.error('Init failed:', err);
  }

  authService.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await authService.getCurrentUser();
      actions.setUser(user);
    } else {
      actions.setUser(null);
    }
    renderNavbar();
  });

  store.subscribe((state) => renderNavbar(state.user));

  const handleRoute = () => {
    const path = window.location.pathname;
    if (!document.getElementById('router-view')) return;
    if (path === '/shop') renderShop();
    else if (path.startsWith('/admin')) renderAdmin(path);
    else if (path.startsWith('/product/')) renderProductDetail(path.split('/').pop());
    else if (path === '/cart') renderCart();
    else { renderHome(); renderBestSellers(); }
  };

  window.onpopstate = handleRoute;
  renderNavbar();
  handleRoute();
};

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
const renderNavbar = (user = store.getState().user) => {
  const header = document.getElementById('main-header');
  const isAdmin = user?.profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  header.innerHTML = `
    <nav class="container nav-wrapper">
      <div class="nav-left">
        <a href="/" class="logo" id="logo-link">GUGAN</a>
        <ul class="nav-links">
          <li><a href="/shop" id="shop-link">SHOP ALL</a></li>
          <li><a href="#">MEN</a></li>
          <li><a href="#">WOMEN</a></li>
          <li><a href="#">KIDS</a></li>
          ${isAdmin ? '<li><a href="/admin" id="admin-link" class="admin-nav-link">CMS</a></li>' : ''}
        </ul>
      </div>
      <div class="nav-center">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search for products, brands and more">
        </div>
      </div>
      <div class="nav-right">
        <div class="nav-actions">
          <div class="action-item profile" id="profile-action">
            <span>👤</span>
            <p>${user ? (user.profile?.full_name || user.user_metadata?.full_name || 'Account') : 'Profile'}</p>
          </div>
          <div class="action-item"><span>🤍</span><p>Wishlist</p></div>
          <a href="/cart" class="action-item cart" id="cart-link">
            <span class="cart-count">${store.getState().cart.length}</span>
            <span>🛍️</span><p>Bag</p>
          </a>
        </div>
      </div>
    </nav>
  `;

  document.getElementById('logo-link').onclick = (e) => { e.preventDefault(); navigate('/'); };
  document.getElementById('shop-link').onclick = (e) => { e.preventDefault(); navigate('/shop'); };
  document.getElementById('cart-link').onclick = (e) => { e.preventDefault(); navigate('/cart'); };
  if (isAdmin) document.getElementById('admin-link').onclick = (e) => { e.preventDefault(); navigate('/admin'); };
  document.getElementById('profile-action').onclick = () => {
    const u = store.getState().user;
    if (u) { if (confirm(`Logout ${u.email}?`)) authService.signOut(); }
    else renderAuthModal('login');
  };
};

// ─────────────────────────────────────────────
// ADMIN PANEL — SHELL + ROUTER
// ─────────────────────────────────────────────
const renderAdmin = async (path = '/admin') => {
  const user = store.getState().user;
  const main = document.getElementById('router-view');
  const isAdmin = user?.profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  if (!isAdmin) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <div style="font-size:4rem">🔒</div>
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
          <div class="admin-brand"><span>⚙️</span><h3>Admin CMS</h3></div>
          <ul class="admin-nav">
            <li class="admin-nav-item" data-path="/admin"><span>📊</span> Dashboard</li>
            <li class="admin-nav-item" data-path="/admin/products"><span>👗</span> Products</li>
            <li class="admin-nav-item" data-path="/admin/categories"><span>📂</span> Categories</li>
            <li class="admin-nav-item" data-path="/admin/orders"><span>📦</span> Orders</li>
            <li class="admin-nav-item" data-path="/admin/cms/hero"><span>🖼️</span> Hero Banner</li>
          </ul>
          <div class="admin-sidebar-footer">
            <button onclick="app.navigate('/')" class="btn-secondary-sm">← Back to Store</button>
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
    content.innerHTML = `<div class="admin-error">❌ ${err.message}</div>`;
  }
};

// ─────────────────────────────────────────────
// ADMIN: DASHBOARD
// ─────────────────────────────────────────────
const adminDashboard = async (container) => {
  let productCount = 0, orderCount = 0, latestUpdate = '--';
  try {
    const [products, orders] = await Promise.all([
      productService.getProducts({}),
      orderService.getOrders(),
    ]);
    productCount = products.length;
    orderCount = orders.length;
    if (products.length > 0) {
      const latest = products.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
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
        <div class="stat-icon">👗</div>
        <div class="stat-info"><p class="stat-label">Total Products</p><h2 class="stat-value">${productCount}</h2></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-info"><p class="stat-label">Total Orders</p><h2 class="stat-value">${orderCount}</h2></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🕐</div>
        <div class="stat-info"><p class="stat-label">Last Updated</p><h2 class="stat-value" style="font-size:0.95rem;">${latestUpdate}</h2></div>
      </div>
    </div>
    <div class="admin-quick-actions mt-xl">
      <h2 class="section-title-sm">Quick Actions</h2>
      <div class="quick-action-grid mt-md">
        <button class="quick-action-card" onclick="app.navigate('/admin/products/add')"><span>➕</span><p>Add Product</p></button>
        <button class="quick-action-card" onclick="app.navigate('/admin/cms/hero')"><span>🖼️</span><p>Edit Hero Banner</p></button>
        <button class="quick-action-card" onclick="app.navigate('/admin/categories')"><span>📂</span><p>Edit Categories</p></button>
        <button class="quick-action-card" onclick="app.navigate('/admin/orders')"><span>📋</span><p>View Orders</p></button>
      </div>
    </div>
  `;
};

// ─────────────────────────────────────────────
// ADMIN: PRODUCTS LIST + ADD
// ─────────────────────────────────────────────
const adminProducts = async (container, path) => {
  if (path === '/admin/products/add') return adminProductForm(container, null);

  const products = await productService.getProducts({ sort: 'created_at:desc' });

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
                  ${p.images?.[0] ? `<img src="${p.images[0]}" class="product-thumb">` : '<div class="product-thumb-placeholder">📦</div>'}
                  <div><p class="product-cell-name">${p.name}</p><p class="product-cell-brand">${p.brand || ''}</p></div>
                </div>
              </td>
              <td><span class="badge">${p.category}</span></td>
              <td><strong>Rs. ${Number(p.price).toLocaleString()}</strong></td>
              <td>${p.discount ? `<span class="badge badge-warning">${p.discount}%</span>` : '—'}</td>
              <td>${p.stock ?? '—'}</td>
              <td>${p.is_best_seller ? '<span class="badge badge-success">Yes</span>' : '—'}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" title="Edit" onclick="app.navigate('/admin/products/edit/${p.id}')">✏️</button>
                  <button class="btn-icon" title="Delete" onclick="app.adminDeleteProduct('${p.id}','${p.name}')">🗑️</button>
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

// ─────────────────────────────────────────────
// ADMIN: PRODUCT FORM (Add / Edit)
// ─────────────────────────────────────────────
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
        <p><a href="#" onclick="app.navigate('/admin/products'); return false;" style="color:hsl(var(--primary))">← Back to Products</a></p>
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
            ${isEdit ? '💾 Update Product' : '➕ Add Product'}
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
      btn.textContent = isEdit ? '💾 Update Product' : '➕ Add Product';
    }
  };
};

// ─────────────────────────────────────────────
// ADMIN: PRODUCT EDIT (fetch then form)
// ─────────────────────────────────────────────
const adminProductEdit = async (container, id) => {
  try {
    const product = await productService.getProductById(id);
    await adminProductForm(container, product);
  } catch (err) {
    toast.error('Could not load product: ' + err.message);
    navigate('/admin/products');
  }
};

// ─────────────────────────────────────────────
// ADMIN: CATEGORIES
// ─────────────────────────────────────────────
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
              ${cat.image ? `<img src="${cat.image}" class="cat-thumb">` : '<div class="cat-thumb-placeholder">📂</div>'}
              <div>
                <strong>${cat.name || 'Unnamed'}</strong>
                <p style="color:hsl(var(--text-muted));font-size:0.85rem">${cat.tagline || ''}</p>
                <p style="color:hsl(var(--text-muted));font-size:0.8rem">${cat.link || ''}</p>
              </div>
            </div>
            <div class="action-buttons">
              <button class="btn-icon" title="Edit" onclick="app.editCat(${i})">✏️</button>
              <button class="btn-icon" title="Delete" onclick="app.deleteCat(${i})">🗑️</button>
              ${i > 0 ? `<button class="btn-icon" title="Move Up" onclick="app.moveCat(${i}, -1)">↑</button>` : ''}
              ${i < cats.length - 1 ? `<button class="btn-icon" title="Move Down" onclick="app.moveCat(${i}, 1)">↓</button>` : ''}
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
          <button class="modal-close" id="close-cat-modal">✕</button>
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
            <button type="submit" class="btn-primary">${isEdit ? '💾 Update' : '➕ Add'}</button>
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

// ─────────────────────────────────────────────
// ADMIN: ORDERS
// ─────────────────────────────────────────────
const adminOrders = async (container) => {
  const orders = await orderService.getOrders();

  container.innerHTML = `
    <div class="admin-page-header">
      <div><h1>Orders</h1><p>${orders.length} total orders</p></div>
    </div>
    ${orders.length === 0 ? `
      <div class="admin-empty" style="text-align:center;padding:4rem">
        <div style="font-size:3rem">📦</div>
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
              <td><code style="font-size:0.75rem">${o.id.substr(0, 8)}…</code></td>
              <td>${o.customer_details?.name || o.user_id?.substr(0, 8) || '—'}</td>
              <td>${Array.isArray(o.items) ? o.items.length + ' item(s)' : '—'}</td>
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

// ─────────────────────────────────────────────
// ADMIN: HERO BANNER CMS
// ─────────────────────────────────────────────
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
        <div class="admin-card-header"><span>🖼️</span><h2>Banner Image</h2></div>
        ${createImageInput(hero.image || '', 'banners')}

        <div class="admin-card-header mt-lg"><span>📝</span><h2>Content</h2></div>
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
          <button type="submit" class="btn-primary" id="hero-save-btn">💾 Save & Apply to Homepage</button>
        </div>
      </form>
    </div>
  `;

  initImageInput(container);

  document.getElementById('hero-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('hero-save-btn');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
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
      btn.textContent = '✅ Saved!';
      setTimeout(() => { btn.disabled = false; btn.textContent = '💾 Save & Apply to Homepage'; }, 2500);
      // Re-render to show new preview
      setTimeout(() => adminHeroCMS(container), 2600);
    } catch (err) {
      toast.error('Failed: ' + err.message);
      btn.disabled = false; btn.textContent = '💾 Save & Apply to Homepage';
    }
  };
};

// ─────────────────────────────────────────────
// SHOP
// ─────────────────────────────────────────────
const renderShop = async () => {
  const main = document.getElementById('router-view');
  main.innerHTML = `
    <div class="container py-xl shop-layout">
      <aside class="shop-sidebar">
        <div class="filter-section"><h3 class="filter-title">FILTERS</h3></div>
      </aside>
      <div class="shop-content">
        <div class="product-grid" id="shop-product-grid"><div class="loading">Loading products...</div></div>
      </div>
    </div>
  `;
  try {
    const products = await productService.getProducts({});
    const grid = document.getElementById('shop-product-grid');
    if (!products?.length) { grid.innerHTML = '<p style="padding:2rem">No products available yet.</p>'; return; }
    grid.innerHTML = products.map(p => ProductCard(p)).join('');
    document.querySelectorAll('.product-card').forEach(card => { card.onclick = () => navigate(`/product/${card.dataset.id}`); });
  } catch (err) { document.getElementById('shop-product-grid').innerHTML = '<p>Error loading products.</p>'; }
};

// ─────────────────────────────────────────────
// PRODUCT DETAIL
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────
const renderCart = () => {
  const main = document.getElementById('router-view');
  const cart = store.getState().cart;

  if (cart.length === 0) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <div style="font-size:4rem">🛍️</div>
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
                <button class="qty-btn" onclick="app.updateQty('${item.id}','${item.variant}',${item.quantity - 1})">−</button>
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
    if (!user) { renderAuthModal('login'); return; }

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

// ─────────────────────────────────────────────
// HOME + BEST SELLERS
// ─────────────────────────────────────────────
const renderHome = () => {
  const main = document.getElementById('router-view');
  const config = store.getState().homepage || {};
  const hero = config.hero || {
    image: '/homepage_hero_banner_1776790133387.png',
    headline: 'SUMMER COLLECTION',
    subtext: 'Experience the minimalist luxury of GUGAN',
    buttonText: 'SHOP NOW', link: '/shop', visible: true
  };
  const categories = config.categories || { title: 'SHOP BY CATEGORY', items: [] };

  main.innerHTML = `
    <div>
      ${hero.visible !== false ? `
      <section class="hero-banner">
        ${hero.image ? `<img src="${hero.image}" alt="${hero.headline}">` : ''}
        <div class="hero-content-overlay">
          <h1>${hero.headline}</h1>
          <p>${hero.subtext}</p>
          <a href="${hero.link || '/shop'}" class="hero-btn" id="hero-cta">${hero.buttonText || 'SHOP NOW'}</a>
        </div>
      </section>` : ''}
      <div class="container">
        <section class="category-grid py-lg">
          <h2 class="section-title">${categories.title || 'SHOP BY CATEGORY'}</h2>
          <div class="category-grid-layout mt-md">
            ${categories.items.map(cat => `
              <div class="category-card" onclick="app.navigate('${cat.link}')">
                ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" class="category-card-img">` : `<div class="category-card-placeholder">${cat.name}</div>`}
                <div class="category-card-body"><h3>${cat.name}</h3><p>${cat.tagline || ''}</p></div>
              </div>
            `).join('')}
          </div>
        </section>
        <section class="best-sellers py-lg">
          <h2 class="section-title">BEST SELLERS</h2>
          <div class="product-grid mt-md" id="best-sellers-list"><div class="loading">Loading...</div></div>
        </section>
      </div>
    </div>
  `;

  document.getElementById('hero-cta')?.addEventListener('click', (e) => { e.preventDefault(); navigate(hero.link || '/shop'); });
};

const renderBestSellers = async () => {
  const list = document.getElementById('best-sellers-list');
  if (!list) return;
  try {
    const products = await productService.getProducts({});
    if (!products?.length) { list.innerHTML = '<p>No products yet.</p>'; return; }
    const display = products.filter(p => p.is_best_seller).slice(0, 4);
    list.innerHTML = (display.length > 0 ? display : products.slice(0, 4)).map(p => ProductCard(p)).join('');
    list.querySelectorAll('.product-card').forEach(card => { card.onclick = () => navigate(`/product/${card.dataset.id}`); });
  } catch (err) { list.innerHTML = '<p>Could not load products.</p>'; }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
