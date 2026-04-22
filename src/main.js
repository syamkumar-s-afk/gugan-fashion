import './styles/global.css';
import { store, actions } from './store';
import { authService } from './services/auth';
import { renderAuthModal } from './components/AuthModal';
import { ProductCard } from './components/ProductCard';
import { configService } from './services/config';
import { productService } from './services/products';

// Initialize App
const initApp = async () => {
  // Check for current user
  try {
    const user = await authService.getCurrentUser();
    actions.setUser(user);
    
    // Initial fetch of homepage config
    const config = await configService.getHomepageConfig();
    store.setState({ homepage: config });
  } catch (err) {
    console.error("Initialization failed:", err);
  }

  // Monitor auth changes
  authService.onAuthStateChange((event, session) => {
    if (session?.user) {
      actions.setUser(session.user);
    } else {
      actions.setUser(null);
    }
  });

  // Routing logic
  const handleRoute = () => {
    const path = window.location.pathname;
    if (path === '/shop') {
      renderShop();
    } else if (path === '/admin') {
      renderAdmin();
    } else if (path.startsWith('/product/')) {
      const id = path.split('/').pop();
      renderProductDetail(id);
    } else if (path === '/cart') {
      renderCart();
    } else {
      renderHome();
      renderBestSellers();
    }
  };

  window.onpopstate = handleRoute;

  // Initial Render
  renderNavbar();
  handleRoute();
};

// Navigation Helper
const navigate = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const renderNavbar = (user = store.getState().user) => {
  const header = document.getElementById('main-header');
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  header.innerHTML = `
    <nav class="container nav-wrapper">
      <div class="nav-left">
        <a href="/" class="logo" id="logo-link">GUGAN</a>
        <ul class="nav-links">
          <li><a href="/shop" id="shop-link">SHOP ALL</a></li>
          <li><a href="#">MEN</a></li>
          <li><a href="#">WOMEN</a></li>
          <li><a href="#">KIDS</a></li>
          ${isAdmin ? '<li><a href="/admin" id="admin-link" style="color:hsl(var(--primary)); font-weight:700;">CMS</a></li>' : ''}
        </ul>
      </div>
      
      <div class="nav-center">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search for products, brands and more">
        </div>
      </div>
      <!-- ... nav-right same ... -->

      <div class="nav-right">
        <div class="nav-actions">
          <div class="action-item profile" id="profile-action">
            <span>👤</span>
            <p>${user ? (user.user_metadata?.full_name || 'Account') : 'Profile'}</p>
          </div>
          <div class="action-item">
            <span>🤍</span>
            <p>Wishlist</p>
          </div>
          <a href="/cart" class="action-item cart">
            <span class="cart-count">${store.getState().cart.length}</span>
            <span>🛍️</span>
            <p>Bag</p>
          </a>
        </div>
      </div>
    </nav>
  `;

  // Attach navbar events
  document.getElementById('logo-link').onclick = (e) => { e.preventDefault(); navigate('/'); };
  document.getElementById('shop-link').onclick = (e) => { e.preventDefault(); navigate('/shop'); };
  
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.onclick = (e) => { e.preventDefault(); navigate('/admin'); };
  }
  
  document.getElementById('profile-action').onclick = () => {
    if (store.getState().user) {
      if (confirm('Logout?')) authService.signOut();
    } else {
      renderAuthModal('login');
    }
  };
};

// Shop Page (PLP)
const renderShop = async () => {
  const main = document.getElementById('router-view');
  main.innerHTML = `
    <div class="container py-xl shop-layout">
      <aside class="shop-sidebar">
        <div class="filter-section">
          <h3 class="filter-title">FILTERS</h3>
          <div class="filter-group">
            <p>CATEGORIES</p>
            <label><input type="checkbox"> Men</label>
            <label><input type="checkbox"> Women</label>
            <label><input type="checkbox"> Kids</label>
          </div>
          <div class="filter-group">
            <p>PRICE</p>
            <label><input type="radio" name="price"> Rs. 0 to Rs. 500</label>
            <label><input type="radio" name="price" checked> All</label>
          </div>
        </div>
      </aside>

      <div class="shop-content">
        <div class="shop-header">
          <p>Showing All Products</p>
          <select class="sort-select">
            <option>Featured</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>
        <div class="product-grid" id="shop-product-grid">
           <!-- Products loaded here -->
        </div>
      </div>
    </div>
  `;

  const { productService } = await import('./services/products');
  const products = productService.getMockProducts();
  const grid = document.getElementById('shop-product-grid');
  grid.innerHTML = products.map(p => ProductCard(p)).join('');

  // Attach click events to cards
  document.querySelectorAll('.product-card').forEach(card => {
    card.onclick = () => navigate(`/product/${card.dataset.id}`);
  });
};

// Product Detail Page (PDP)
const renderProductDetail = async (id) => {
  const main = document.getElementById('router-view');
  
  const { productService } = await import('./services/products');
  const products = productService.getMockProducts();
  const product = products.find(p => p.id == id) || products[0];

  main.innerHTML = `
    <div class="container py-xl pdp-layout">
      <div class="pdp-images">
        <div class="pdp-main-image">
          <img src="${product.images[0]}" alt="${product.name}">
        </div>
      </div>

      <div class="pdp-info">
        <h1 class="brand-name-lg">${product.brand}</h1>
        <h2 class="product-name-lg">${product.name}</h2>
        
        <div class="price-box-lg">
          <span class="current-price-lg">Rs. ${product.price}</span>
          <span class="tax-info">inclusive of all taxes</span>
        </div>

        <div class="size-selector mt-lg">
          <p>SELECT SIZE</p>
          <div class="size-options">
            ${['S', 'M', 'L', 'XL', 'XXL'].map(s => `<button class="size-btn">${s}</button>`).join('')}
          </div>
        </div>

        <div class="pdp-actions mt-lg">
          <button class="btn-primary-lg" id="add-to-bag">ADD TO BAG</button>
          <button class="btn-secondary-lg">WISHLIST</button>
        </div>

        <div class="pdp-details mt-lg">
          <h3>PRODUCT DETAILS</h3>
          <p>Premium quality ${product.category} wear. Designed for comfort and style.</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('add-to-bag').onclick = () => {
    actions.addToCart(product, 'M'); // Default size for now
    alert('Added to bag!');
  };
};

// Cart Page (Shopping Bag)
const renderCart = () => {
  const main = document.getElementById('router-view');
  const cart = store.getState().cart;
  
  if (cart.length === 0) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <h2>Your Bag is Empty</h2>
        <p class="mt-md">Add items to it now to start shopping.</p>
        <button class="btn-primary mt-lg" id="go-to-shop">SHOP NOW</button>
      </div>
    `;
    document.getElementById('go-to-shop').onclick = () => navigate('/shop');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  main.innerHTML = `
    <div class="container py-xl cart-layout">
      <div class="cart-items">
        <h2 class="section-title-sm">SHOPPING BAG (${cart.length} Items)</h2>
        ${cart.map(item => `
          <div class="cart-item">
            <img src="${item.images[0]}" alt="${item.name}">
            <div class="item-info">
              <p class="brand">${item.brand}</p>
              <p class="name">${item.name}</p>
              <p class="variant">Size: ${item.variant}</p>
              <div class="qty-control mt-sm">
                <button class="qty-btn" onclick="app.updateQty(${item.id}, '${item.variant}', ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="app.updateQty(${item.id}, '${item.variant}', ${item.quantity + 1})">+</button>
              </div>
            </div>
            <div class="item-price">
              <p>Rs. ${item.price * item.quantity}</p>
              <button class="remove-btn" onclick="app.removeItem(${item.id}, '${item.variant}')">REMOVE</button>
            </div>
          </div>
        `).join('')}
      </div>

      <aside class="order-summary">
        <h2 class="section-title-sm">PRICE DETAILS</h2>
        <div class="summary-row">
          <span>Total MRP</span>
          <span>Rs. ${total}</span>
        </div>
        <div class="summary-row">
          <span>Convenience Fee</span>
          <span class="free">FREE</span>
        </div>
        <hr>
        <div class="summary-total">
          <span>Total Amount</span>
          <span>Rs. ${total}</span>
        </div>
        <button class="btn-primary-lg mt-lg" id="place-order-btn">PLACE ORDER</button>
      </aside>
    </div>
  `;

  // Global helpers for cart actions (bound to window for simple onclick access)
  window.app = window.app || {};
  window.app.updateQty = (id, variant, qty) => actions.updateCartQuantity(id, variant, qty);
  window.app.removeItem = (id, variant) => {
    if(confirm('Remove this item?')) actions.removeFromCart(id, variant);
  };
// Admin Panel
const renderAdmin = async () => {
  const user = store.getState().user;
  const main = document.getElementById('router-view');

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

  if (!isAdmin) {
    main.innerHTML = `
      <div class="container py-xl text-center">
        <h1>403 - Access Denied</h1>
        <p class="mt-md">You do not have permission to access the admin panel.</p>
        <button class="btn-primary mt-lg" onclick="app.navigate('/')">Go Home</button>
      </div>
    `;
    return;
  }

  const handleAdminAction = async (action, data) => {
    try {
      if (action === 'save-hero') {
        await configService.updateConfig('hero', data);
        alert('Hero banner updated!');
      } else if (action === 'save-categories') {
        await configService.updateConfig('categories', data);
        alert('Categories updated!');
      } else if (action === 'add-product') {
        await productService.createProduct(data);
        alert('Product added!');
        renderAdminContent('products');
      } else if (action === 'delete-product') {
        if (confirm('Delete this product?')) {
          await productService.deleteProduct(data);
          renderAdminContent('products');
        }
      }
      
      // Refresh local state config if homepage was updated
      if (action.includes('save-')) {
        const config = await configService.getHomepageConfig();
        store.setState({ homepage: config });
      }
    } catch (err) {
      console.error("Admin action failed:", err);
      alert('Action failed. Check console.');
    }
  };

  const renderAdminContent = async (view = 'dashboard') => {
    const container = document.querySelector('.admin-content');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading...</div>';

    if (view === 'products') {
      const products = await productService.getProducts({});
      container.innerHTML = `
        <div class="admin-header-row">
          <h2 class="section-title-sm">PRODUCT MANAGEMENT</h2>
          <button class="btn-primary-sm" id="add-product-btn">+ ADD PRODUCT</button>
        </div>
        <table class="admin-table mt-md">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>Rs. ${p.price}</td>
                <td>${p.stock}</td>
                <td>
                  <button class="btn-text" onclick="app.adminDeleteProduct('${p.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Simple Add Modal (Hidden by default) -->
        <div id="product-modal" class="modal-overlay" style="display:none;">
          <div class="modal-content">
            <h3>Add New Product</h3>
            <form id="product-form" class="admin-form mt-md">
              <input type="text" name="name" placeholder="Product Name" required>
              <input type="text" name="brand" placeholder="Brand">
              <input type="number" name="price" placeholder="Price" required>
              <input type="text" name="category" placeholder="Category (Men/Women/Kids)" required>
              <input type="number" name="stock" placeholder="Stock Quantity" value="0">
              <input type="text" name="image" placeholder="Image URL">
              <div class="form-actions mt-lg">
                <button type="button" class="btn-secondary" id="close-modal">Cancel</button>
                <button type="submit" class="btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.getElementById('add-product-btn').onclick = () => {
        document.getElementById('product-modal').style.display = 'flex';
      };
      document.getElementById('close-modal').onclick = () => {
        document.getElementById('product-modal').style.display = 'none';
      };
      document.getElementById('product-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.images = [data.image]; // Wrap in array
        delete data.image;
        handleAdminAction('add-product', data);
      };
      window.app.adminDeleteProduct = (id) => handleAdminAction('delete-product', id);

    } else if (view === 'homepage') {
      const config = store.getState().homepage || await configService.getHomepageConfig();
      const hero = config.hero || {};
      const cats = config.categories?.items || [];

      container.innerHTML = `
        <h2 class="section-title-sm">HOMEPAGE CONTENT MANAGEMENT</h2>
        
        <div class="admin-card mt-md">
          <h3>Hero Banner</h3>
          <form id="hero-form" class="admin-form mt-sm">
            <label>Image URL</label>
            <input type="text" name="image" value="${hero.image || ''}">
            <label>Headline</label>
            <input type="text" name="headline" value="${hero.headline || ''}">
            <label>Subtext</label>
            <input type="text" name="subtext" value="${hero.subtext || ''}">
            <button type="submit" class="btn-primary-sm mt-md">Update Hero</button>
          </form>
        </div>

        <div class="admin-card mt-lg">
          <h3>Category Grid (Top 4)</h3>
          <div id="categories-editor" class="mt-sm">
            ${[0,1,2,3].map(i => `
              <div class="category-edit-row" data-index="${i}">
                <p>Category ${i+1}</p>
                <input type="text" placeholder="Name" class="cat-name" value="${cats[i]?.name || ''}">
                <input type="text" placeholder="Image URL" class="cat-image" value="${cats[i]?.image || ''}">
                <input type="text" placeholder="Link" class="cat-link" value="${cats[i]?.link || ''}">
              </div>
            `).join('')}
            <button id="save-cats-btn" class="btn-primary-sm mt-md">Update Categories</button>
          </div>
        </div>
      `;

      document.getElementById('hero-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        handleAdminAction('save-hero', Object.fromEntries(formData.entries()));
      };

      document.getElementById('save-cats-btn').onclick = () => {
        const items = [];
        document.querySelectorAll('.category-edit-row').forEach(row => {
          items.push({
            name: row.querySelector('.cat-name').value,
            image: row.querySelector('.cat-image').value,
            link: row.querySelector('.cat-link').value,
            tagline: '' 
          });
        });
        handleAdminAction('save-categories', { title: "SHOP BY CATEGORY", items });
      };

    } else {
      container.innerHTML = `
        <h2 class="section-title-sm">DASHBOARD OVERVIEW</h2>
        <div class="admin-stats mt-md">
          <div class="stat-card"><h3>Total Orders</h3><p>--</p></div>
          <div class="stat-card"><h3>Active Products</h3><p>Live</p></div>
          <div class="stat-card"><h3>Last Sync</h3><p>${new Date().toLocaleTimeString()}</p></div>
        </div>
      `;
    }
  };

  main.innerHTML = `
    <div class="container py-xl admin-layout">
      <aside class="admin-sidebar">
        <h3>ADMIN PANEL</h3>
        <ul class="admin-nav">
          <li class="nav-item active" data-view="dashboard"><button>Dashboard</button></li>
          <li class="nav-item" data-view="products"><button>Products</button></li>
          <li class="nav-item" data-view="homepage"><button>Homepage CMS</button></li>
        </ul>
      </aside>

      <div class="admin-content"></div>
    </div>
  `;

  renderAdminContent();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderAdminContent(item.dataset.view);
    };
  });
};

// Global App Helper extension
window.app = window.app || {};
window.app.navigate = navigate;

  document.getElementById('place-order-btn').onclick = () => {
    const user = store.getState().user;
    if (!user) {
      alert('Please login to place your order.');
      renderAuthModal('login');
    } else {
      alert('Order Placed Successfully! This would normally go to payment gateway.');
    }
  };
};

// Placeholder for Home Page render
const renderHome = () => {
  const main = document.getElementById('router-view');
  const config = store.getState().homepage || {};
  const hero = config.hero || {
    image: "/homepage_hero_banner_1776790133387.png",
    headline: "SUMMER COLLECTION",
    subtext: "Experience the minimalist luxury"
  };
  const categories = config.categories || { items: [] };

  main.innerHTML = `
    <div class="container py-xl">
      <section class="hero-banner">
        <img src="${hero.image}" alt="${hero.headline}">
        <div class="hero-content-overlay">
          <h2>${hero.headline}</h2>
          <p>${hero.subtext}</p>
        </div>
      </section>
      
      <section class="category-grid py-lg">
        <h2 class="section-title">${categories.title || 'SHOP BY CATEGORY'}</h2>
        <div class="product-grid mt-md" id="featured-categories">
          ${categories.items.map(cat => `
            <div class="category-card" onclick="app.navigate('${cat.link}')">
              <div class="category-image">
                ${cat.image ? `<img src="${cat.image}" alt="${cat.name}">` : `<div class="placeholder-img">${cat.name}</div>`}
              </div>
              <div class="category-info">
                <h3>${cat.name}</h3>
                <p>${cat.tagline || ''}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="best-sellers py-lg">
        <h2 class="section-title">BEST SELLERS</h2>
        <div class="product-grid mt-md" id="best-sellers-list">
          <div class="loading">Fetching best sellers...</div>
        </div>
      </section>
    </div>
  `;
};

// Best Sellers Section
const renderBestSellers = async () => {
  const list = document.getElementById('best-sellers-list');
  if(!list) return;

  try {
    const products = await productService.getProducts({ sort: 'created_at:desc' });
    const bestSellers = products.filter(p => p.is_best_seller).slice(0, 4);
    
    // Fallback if no best sellers marked
    const displayProducts = bestSellers.length > 0 ? bestSellers : products.slice(0, 4);

    if (displayProducts.length === 0) {
      list.innerHTML = '<p>No products found.</p>';
      return;
    }

    list.innerHTML = displayProducts.map(p => ProductCard(p)).join('');
    
    // Re-attach card clicks
    list.querySelectorAll('.product-card').forEach(card => {
      card.onclick = () => app.navigate(`/product/${card.dataset.id}`);
    });
  } catch (err) {
    console.error("Failed to load best sellers:", err);
    list.innerHTML = '<p>Error loading products.</p>';
  }
};

// Start
document.addEventListener('DOMContentLoaded', initApp);
