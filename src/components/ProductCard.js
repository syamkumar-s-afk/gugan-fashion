import { store } from '../store';

export const ProductCard = (product) => {
  const { id, name, brand, price, images, is_best_seller, is_new_arrival, is_trending, discount } = product;
  const wishlist = store.getState().wishlist || [];
  const isInWishlist = wishlist.includes(id);

  const safeName = name || 'Untitled Product';
  const safeBrand = brand || 'GUGAN';
  const safePrice = Number(price) || 0;
  const safeDiscount = Number(discount) || 0;
  const imageList = Array.isArray(images) ? images : (typeof images === 'string' ? [images] : []);
  const displayImage = imageList.length
    ? imageList[0]
    : 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=900&auto=format&fit=crop';
  const discountedPrice = safeDiscount ? Math.round(safePrice * (1 - safeDiscount / 100)) : null;

  return `
    <div class="product-card" data-id="${id}">
      <div class="product-image">
        <div class="product-badges">
          ${is_best_seller ? '<span class="badge badge-best">BEST SELLER</span>' : ''}
          ${is_new_arrival ? '<span class="badge badge-new">NEW</span>' : ''}
          ${is_trending ? '<span class="badge badge-trending">&#128293; TRENDING</span>' : ''}
        </div>
        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleWishlist('${id}')">
          ${isInWishlist ? '&#10084;&#65039;' : '&#9825;'}
        </button>
        <img src="${displayImage}" alt="${safeName}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=900&auto=format&fit=crop'">
        <div class="quick-view">QUICK VIEW</div>
      </div>
      <div class="product-details">
        <div class="brand-row">
          <h3 class="brand-name">${safeBrand}</h3>
        </div>
        <p class="product-name">${safeName}</p>
        <div class="price-box">
          ${discountedPrice
            ? `<span class="current-price">Rs. ${discountedPrice.toLocaleString()}</span>
               <span class="original-price">Rs. ${safePrice.toLocaleString()}</span>
               <span class="discount-percent">(${safeDiscount}% OFF)</span>`
            : `<span class="current-price">Rs. ${safePrice.toLocaleString()}</span>`
          }
        </div>
        <button class="add-to-bag-btn" onclick="event.stopPropagation(); app.quickAddToCart('${id}')">ADD TO BAG</button>
      </div>
    </div>
  `;
};
