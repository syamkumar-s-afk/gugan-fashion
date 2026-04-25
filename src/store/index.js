// Simple State Management for Vanilla JS
class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

const readStoredArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) {
    localStorage.removeItem(key);
    return [];
  }
};

// Initial App State
export const store = new Store({
  user: null,
  isAuthLoading: true,
  cart: readStoredArray('cart'),
  wishlist: readStoredArray('wishlist'),
  products: [],
  isModalOpen: false,
  modalType: null, // 'login' | 'signup'
  homepageConfig: null
});

// Helper Actions
export const actions = {
  setUser: (user) => store.setState({ user }),
  setAuthLoading: (isAuthLoading) => store.setState({ isAuthLoading }),

  addToCart: (product, variant) => {
    const cart = store.getState().cart;
    const existing = cart.find(item => item.id === product.id && item.variant === variant);

    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        (item.id === product.id && item.variant === variant)
        ? { ...item, quantity: item.quantity + 1 }
        : item
      );
    } else {
      newCart = [...cart, { ...product, variant, quantity: 1 }];
    }

    store.setState({ cart: newCart });
    localStorage.setItem('cart', JSON.stringify(newCart));
  },

  removeFromCart: (productId, variant) => {
    const newCart = store.getState().cart.filter(item => !(item.id === productId && item.variant === variant));
    store.setState({ cart: newCart });
    localStorage.setItem('cart', JSON.stringify(newCart));
  },

  updateCartQuantity: (productId, variant, quantity) => {
    const newCart = store.getState().cart.map(item =>
      (item.id === productId && item.variant === variant)
      ? { ...item, quantity: Math.max(1, quantity) }
      : item
    );
    store.setState({ cart: newCart });
    localStorage.setItem('cart', JSON.stringify(newCart));
  },

  clearCart: () => {
    store.setState({ cart: [] });
    localStorage.removeItem('cart');
  },

  toggleWishlist: (productId) => {
    const wishlist = store.getState().wishlist;
    const exists = wishlist.includes(productId);
    const newWishlist = exists
      ? wishlist.filter(id => id !== productId)
      : [...wishlist, productId];

    store.setState({ wishlist: newWishlist });
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));

    if (exists) window.toast?.info?.('Removed from wishlist');
    else window.toast?.success?.('Added to wishlist');
  },

  openAuthModal: (type) => store.setState({ isModalOpen: true, modalType: type }),
  closeModal: () => store.setState({ isModalOpen: false, modalType: null })
};
