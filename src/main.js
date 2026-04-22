import './styles/global.css';
import { store, actions } from './store';
import { authService } from './services/auth';
import { renderAuthModal } from './components/AuthModal';
import { ProductCard } from './components/ProductCard';
import { configService } from './services/config';
import { productService } from './services/products';

// Global App Helper
window.app = window.app || {};
window.app.navigate = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
const navigate = window.app.navigate;

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
    console.error("Init failed:", err);
  }

  authService.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await authService.getCurrentUser();
      actions.setUser(user);
      renderNavbar(user);
    } else {
      actions.setUser(null);
      renderNavbar(null);
    }
  });

  store.subscribe((state) => {
    renderNavbar(state.user);
  });

  const handleRoute = () => {
    const path = window.location.pathname;
    if (!document.getElementById('router-view')) return;
    if (path === '/shop') renderShop();
    else if (path === '/admin') renderAdmin();
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
    const user = store.getState().user;
    if (user) {
      if (confirm(`Logout ${user.email}?`)) authService.signOut();
    } else {
      renderAuthModal('login');
    }
  };
};

// ─────────────────────────────────────────────
// ADMIN PANEL (Full Featured)
// ─────────────────────────────────────────────
const renderAdmin = async () => {
  const user = store.getState().user;
  const main = document.getElementById('router-view');
  const isAdmin = user?.profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  if (!isAdmin) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <div style="font-size:4rem;">🔒</div>
        <h1 style="margin-top:1rem;">Access Denied</h1>
        <p class="mt-md" style="color:hsl(var(--text-muted));">You must be an admin to access this panel.</p>
        <button class="btn-primary mt-lg" onclick="app.navigate('/')">Go Home</button>
      </div>`;
    return;
  }

  // ── Shell Layout ──
  main.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-brand">
          <span>⚙️</span>
          <h3>Admin CMS</h3>
        </div>
        <ul class="admin-nav">
          <li class="admin-nav-item active" data-view="dashboard">
            <span>📊</span> Dashboard
          </li>
          <li class="admin-nav-item" data-view="products">
            <span>👗</span> Products
          </li>
          <li class="admin-nav-item" data-view="homepage">
            <span>🏠</span> Homepage CMS
          </li>
          <li class="admin-nav-item" data-view="orders">
            <span>📦</span> Orders
          </li>
        </ul>
        <div class="admin-sidebar-footer">
          <button onclick="app.navigate('/')" class="btn-secondary-sm">← Back to Store</button>
        </div>
      </aside>
      <main class="admin-content" id="admin-content">
        <div class="admin-loading">Loading...</div>
      </main>
    </div>
  `;

  const renderView = async (view = 'dashboard') => {
    const content = document.getElementById('admin-content');
    if (!content) return;

    // Update active nav
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');

    content.innerHTML = `<div class="admin-loading"><div class="spinner"></div><p>Loading...</p></div>`;

    try {
      if (view === 'dashboard') await renderDashboard(content);
      else if (view === 'products') await renderProducts(content);
      else if (view === 'homepage') await renderHomepageCMS(content);
      else if (view === 'orders') await renderOrders(content);
    } catch (err) {
      content.innerHTML = `<div class="admin-error">❌ Failed to load: ${err.message}</div>`;
    }
  };

  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.onclick = () => renderView(item.dataset.view);
  });

  renderView('dashboard');

  // ─── Dashboard ───────────────────────────────
  const renderDashboard = async (container) => {
    let productCount = 0, orderCount = 0;
    try {
      const products = await productService.getProducts({});
      productCount = products.length;
    } catch (_) {}

    container.innerHTML = `
      <div class="admin-page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, ${user.profile?.full_name || user.email}</p>
      </div>
      <div class="admin-stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👗</div>
          <div class="stat-info">
            <p class="stat-label">Total Products</p>
            <h2 class="stat-value">${productCount}</h2>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <p class="stat-label">Total Orders</p>
            <h2 class="stat-value">${orderCount}</h2>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🕐</div>
          <div class="stat-info">
            <p class="stat-label">Last Updated</p>
            <h2 class="stat-value" style="font-size:1rem;">${new Date().toLocaleString()}</h2>
          </div>
        </div>
      </div>
      <div class="admin-quick-actions mt-xl">
        <h2 class="section-title-sm">Quick Actions</h2>
        <div class="quick-action-grid mt-md">
          <button class="quick-action-card" id="qa-add-product"><span>➕</span><p>Add Product</p></button>
          <button class="quick-action-card" id="qa-edit-hero"><span>🖼️</span><p>Edit Hero Banner</p></button>
          <button class="quick-action-card" id="qa-edit-cats"><span>📂</span><p>Edit Categories</p></button>
          <button class="quick-action-card" id="qa-view-orders"><span>📋</span><p>View Orders</p></button>
        </div>
      </div>
    `;

    document.getElementById('qa-add-product').onclick = () => renderView('products');
    document.getElementById('qa-edit-hero').onclick = () => renderView('homepage');
    document.getElementById('qa-edit-cats').onclick = () => renderView('homepage');
    document.getElementById('qa-view-orders').onclick = () => renderView('orders');
  };

  // ─── Products ───────────────────────────────
  const renderProducts = async (container) => {
    const products = await productService.getProducts({ sort: 'created_at:desc' });

    const showProductModal = (product = null) => {
      const isEdit = !!product;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.id = 'product-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>${isEdit ? 'Edit Product' : 'Add New Product'}</h3>
            <button class="modal-close" id="close-product-modal">✕</button>
          </div>
          <form id="product-form" class="admin-form">
            <div class="form-grid-2">
              <div class="form-group">
                <label>Product Name *</label>
                <input type="text" name="name" placeholder="e.g. Premium Linen Shirt" value="${product?.name || ''}" required>
              </div>
              <div class="form-group">
                <label>Brand *</label>
                <input type="text" name="brand" placeholder="e.g. GUGAN" value="${product?.brand || ''}" required>
              </div>
              <div class="form-group">
                <label>Price (Rs.) *</label>
                <input type="number" name="price" placeholder="e.g. 1499" value="${product?.price || ''}" required>
              </div>
              <div class="form-group">
                <label>Stock Quantity</label>
                <input type="number" name="stock" placeholder="e.g. 50" value="${product?.stock || 0}">
              </div>
              <div class="form-group">
                <label>Category *</label>
                <select name="category" required>
                  <option value="">Select Category</option>
                  ${['Men','Women','Kids','Accessories'].map(c => `<option value="${c}" ${product?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Is Best Seller?</label>
                <select name="is_best_seller">
                  <option value="false" ${!product?.is_best_seller ? 'selected' : ''}>No</option>
                  <option value="true" ${product?.is_best_seller ? 'selected' : ''}>Yes</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Image URL</label>
              <input type="text" name="image" placeholder="https://example.com/image.jpg" value="${product?.images?.[0] || ''}">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea name="description" rows="3" placeholder="Product description...">${product?.description || ''}</textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" id="cancel-product">Cancel</button>
              <button type="submit" class="btn-primary">${isEdit ? 'Update Product' : 'Add Product'}</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      document.getElementById('close-product-modal').onclick = closeModal;
      document.getElementById('cancel-product').onclick = closeModal;
      modal.onclick = (e) => { if (e.target === modal) closeModal(); };

      document.getElementById('product-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.images = data.image ? [data.image] : [];
        data.is_best_seller = data.is_best_seller === 'true';
        data.price = parseFloat(data.price);
        data.stock = parseInt(data.stock);
        delete data.image;

        try {
          if (isEdit) await productService.updateProduct(product.id, data);
          else await productService.createProduct(data);
          closeModal();
          renderView('products');
        } catch (err) {
          alert('Error: ' + err.message);
          btn.disabled = false;
          btn.textContent = isEdit ? 'Update Product' : 'Add Product';
        }
      };
    };

    const deleteProduct = async (id, name) => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
      try {
        await productService.deleteProduct(id);
        renderView('products');
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    };

    container.innerHTML = `
      <div class="admin-page-header">
        <div>
          <h1>Products</h1>
          <p>${products.length} products in inventory</p>
        </div>
        <button class="btn-primary" id="add-product-btn">+ Add Product</button>
      </div>
      <div class="admin-table-wrapper">
        ${products.length === 0 ? '<div class="admin-empty">No products yet. Add your first product!</div>' : `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Best Seller</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>
                  <div class="product-cell">
                    ${p.images?.[0] ? `<img src="${p.images[0]}" class="product-thumb">` : '<div class="product-thumb-placeholder">📦</div>'}
                    <div>
                      <p class="product-cell-name">${p.name}</p>
                      <p class="product-cell-brand">${p.brand || ''}</p>
                    </div>
                  </div>
                </td>
                <td><span class="badge">${p.category}</span></td>
                <td><strong>Rs. ${p.price?.toLocaleString()}</strong></td>
                <td>${p.stock ?? '—'}</td>
                <td>${p.is_best_seller ? '<span class="badge badge-success">Yes</span>' : '—'}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon edit-btn" data-id="${p.id}">✏️</button>
                    <button class="btn-icon delete-btn" data-id="${p.id}" data-name="${p.name}">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    `;

    document.getElementById('add-product-btn').onclick = () => showProductModal();

    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => {
        const p = products.find(x => x.id === btn.dataset.id);
        if (p) showProductModal(p);
      };
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = () => deleteProduct(btn.dataset.id, btn.dataset.name);
    });
  };

  // ─── Homepage CMS ────────────────────────────
  const renderHomepageCMS = async (container) => {
    const config = await configService.getHomepageConfig();
    const hero = config.hero || {};
    const cats = config.categories?.items || [];

    container.innerHTML = `
      <div class="admin-page-header">
        <h1>Homepage CMS</h1>
        <p>Edit all homepage content in real-time</p>
      </div>

      <!-- Hero Banner -->
      <div class="admin-card">
        <div class="admin-card-header">
          <span>🖼️</span>
          <h2>Hero Banner</h2>
        </div>
        <form id="hero-form" class="admin-form">
          <div class="form-group">
            <label>Banner Image URL</label>
            <input type="text" name="image" value="${hero.image || ''}" placeholder="https://example.com/hero.jpg">
            ${hero.image ? `<div class="image-preview mt-sm"><img src="${hero.image}" alt="Hero"></div>` : ''}
          </div>
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
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" id="hero-save-btn">💾 Save Hero Banner</button>
          </div>
        </form>
      </div>

      <!-- Category Grid -->
      <div class="admin-card mt-lg">
        <div class="admin-card-header">
          <span>📂</span>
          <h2>Category Grid</h2>
        </div>
        <div id="categories-editor">
          ${[0,1,2,3].map(i => `
            <div class="category-edit-block" data-index="${i}">
              <h4>Category ${i+1} — ${cats[i]?.name || 'Empty'}</h4>
              <div class="form-grid-3">
                <div class="form-group">
                  <label>Name</label>
                  <input type="text" class="cat-name" placeholder="e.g. MEN" value="${cats[i]?.name || ''}">
                </div>
                <div class="form-group">
                  <label>Tagline</label>
                  <input type="text" class="cat-tagline" placeholder="e.g. Minimalist Luxury" value="${cats[i]?.tagline || ''}">
                </div>
                <div class="form-group">
                  <label>Link</label>
                  <input type="text" class="cat-link" placeholder="/shop?category=Men" value="${cats[i]?.link || ''}">
                </div>
                <div class="form-group" style="grid-column: span 3;">
                  <label>Image URL</label>
                  <input type="text" class="cat-image" placeholder="https://example.com/category.jpg" value="${cats[i]?.image || ''}">
                </div>
              </div>
            </div>
          `).join('<hr class="admin-divider">')}
        </div>
        <div class="form-actions mt-md">
          <button class="btn-primary" id="save-cats-btn">💾 Save Categories</button>
        </div>
      </div>
    `;

    // Hero form submit
    document.getElementById('hero-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('hero-save-btn');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const data = Object.fromEntries(new FormData(e.target).entries());
        await configService.updateConfig('hero', data);
        const config = await configService.getHomepageConfig();
        store.setState({ homepage: config });
        btn.textContent = '✅ Saved!';
        setTimeout(() => { btn.disabled = false; btn.textContent = '💾 Save Hero Banner'; }, 2000);
      } catch (err) {
        alert('Failed: ' + err.message);
        btn.disabled = false; btn.textContent = '💾 Save Hero Banner';
      }
    };

    // Categories save
    document.getElementById('save-cats-btn').onclick = async () => {
      const btn = document.getElementById('save-cats-btn');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const items = [];
        document.querySelectorAll('.category-edit-block').forEach(block => {
          items.push({
            name: block.querySelector('.cat-name').value,
            tagline: block.querySelector('.cat-tagline').value,
            image: block.querySelector('.cat-image').value,
            link: block.querySelector('.cat-link').value,
          });
        });
        await configService.updateConfig('categories', { title: 'SHOP BY CATEGORY', items });
        const config = await configService.getHomepageConfig();
        store.setState({ homepage: config });
        btn.textContent = '✅ Saved!';
        setTimeout(() => { btn.disabled = false; btn.textContent = '💾 Save Categories'; }, 2000);
      } catch (err) {
        alert('Failed: ' + err.message);
        btn.disabled = false; btn.textContent = '💾 Save Categories';
      }
    };
  };

  // ─── Orders ─────────────────────────────────
  const renderOrders = async (container) => {
    container.innerHTML = `
      <div class="admin-page-header">
        <h1>Orders</h1>
        <p>Track and manage customer orders</p>
      </div>
      <div class="admin-empty" style="text-align:center; padding:4rem 2rem;">
        <div style="font-size:3rem;">📦</div>
        <h3 style="margin-top:1rem;">No orders yet</h3>
        <p style="color:hsl(var(--text-muted)); margin-top:0.5rem;">Orders will appear here once customers start purchasing.</p>
      </div>
    `;
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
    if (!products || products.length === 0) {
      grid.innerHTML = '<p style="padding:2rem">No products available yet.</p>';
      return;
    }
    grid.innerHTML = products.map(p => ProductCard(p)).join('');
    document.querySelectorAll('.product-card').forEach(card => {
      card.onclick = () => navigate(`/product/${card.dataset.id}`);
    });
  } catch (err) {
    console.error(err);
    document.getElementById('shop-product-grid').innerHTML = '<p>Error loading products.</p>';
  }
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

    main.innerHTML = `
      <div class="container py-xl pdp-layout">
        <div class="pdp-images"><img src="${product.images?.[0] || ''}" alt="${product.name}" style="width:100%; border-radius:12px;"></div>
        <div class="pdp-info">
          <h1 class="brand-name-lg">${product.brand || ''}</h1>
          <h2 class="product-name-lg">${product.name}</h2>
          <div class="price-box-lg"><span class="current-price-lg">Rs. ${product.price?.toLocaleString()}</span><span class="tax-info"> incl. all taxes</span></div>
          <div class="size-selector mt-lg">
            <p>SELECT SIZE</p>
            <div class="size-options">${['XS','S','M','L','XL','XXL'].map(s => `<button class="size-btn" data-size="${s}">${s}</button>`).join('')}</div>
          </div>
          <div class="pdp-actions mt-lg">
            <button class="btn-primary-lg" id="add-to-bag">ADD TO BAG</button>
            <button class="btn-secondary-lg">WISHLIST</button>
          </div>
          <div class="pdp-details mt-lg">
            <h3>PRODUCT DETAILS</h3>
            <p>${product.description || 'Premium quality fashion wear from Gugan Fashions.'}</p>
          </div>
        </div>
      </div>
    `;

    let selectedSize = 'M';
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.dataset.size;
      };
    });

    document.getElementById('add-to-bag').onclick = () => {
      actions.addToCart(product, selectedSize);
      renderNavbar();
      alert(`Added "${product.name}" (${selectedSize}) to bag!`);
    };
  } catch (err) {
    console.error(err);
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
        <div style="font-size:4rem;">🛍️</div>
        <h2 style="margin-top:1rem;">Your Bag is Empty</h2>
        <p style="margin-top:0.5rem; color:hsl(var(--text-muted));">Add some products to get started.</p>
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
              <p style="color:hsl(var(--text-muted)); font-size:0.85rem;">Size: ${item.variant}</p>
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
        <hr><div class="summary-total"><span>Total Amount</span><span>Rs. ${total.toLocaleString()}</span></div>
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
    if(confirm('Remove item?')) { actions.removeFromCart(id, variant); renderCart(); renderNavbar(); }
  };
  document.getElementById('place-order-btn').onclick = () => {
    if (!store.getState().user) { renderAuthModal('login'); return; }
    alert('Order Placed! (Payment gateway integration coming soon)');
  };
};

// ─────────────────────────────────────────────
// HOME & BEST SELLERS
// ─────────────────────────────────────────────
const renderHome = () => {
  const main = document.getElementById('router-view');
  const config = store.getState().homepage || {};
  const hero = config.hero || { image: '/homepage_hero_banner_1776790133387.png', headline: 'SUMMER COLLECTION', subtext: 'Experience minimalist luxury of GUGAN', buttonText: 'SHOP NOW', link: '/shop' };
  const categories = config.categories || { title: 'SHOP BY CATEGORY', items: [] };

  main.innerHTML = `
    <div>
      <section class="hero-banner">
        ${hero.image ? `<img src="${hero.image}" alt="${hero.headline}">` : ''}
        <div class="hero-content-overlay">
          <h1>${hero.headline}</h1>
          <p>${hero.subtext}</p>
          <a href="${hero.link || '/shop'}" class="hero-btn" id="hero-cta">${hero.buttonText || 'SHOP NOW'}</a>
        </div>
      </section>
      <div class="container">
        <section class="category-grid py-lg">
          <h2 class="section-title">${categories.title || 'SHOP BY CATEGORY'}</h2>
          <div class="category-grid-layout mt-md">
            ${categories.items.map(cat => `
              <div class="category-card" onclick="app.navigate('${cat.link}')">
                ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" class="category-card-img">` : `<div class="category-card-placeholder">${cat.name}</div>`}
                <div class="category-card-body">
                  <h3>${cat.name}</h3>
                  <p>${cat.tagline || ''}</p>
                </div>
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
    if (!products || products.length === 0) { list.innerHTML = '<p>No products yet.</p>'; return; }
    const display = products.filter(p => p.is_best_seller).slice(0, 4);
    list.innerHTML = (display.length > 0 ? display : products.slice(0, 4)).map(p => ProductCard(p)).join('');
    list.querySelectorAll('.product-card').forEach(card => { card.onclick = () => navigate(`/product/${card.dataset.id}`); });
  } catch (err) {
    list.innerHTML = '<p>Could not load products.</p>';
  }
};

document.addEventListener('DOMContentLoaded', initApp);
