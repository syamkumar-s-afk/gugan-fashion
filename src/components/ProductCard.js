import { store } from '../store';
import { FALLBACK_IMAGE_URL, getImageUrl } from '../utils/media';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const escapeAttr = escapeHtml;

const escapeJsString = (value = '') => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\r?\n/g, ' ');

export const ProductCard = (product) => {
  const { id, name, brand, price, images, is_best_seller, is_new_arrival, is_trending, discount } = product;
  const wishlist = store.getState().wishlist || [];
  const isInWishlist = wishlist.includes(id);

  const safeId = escapeAttr(id);
  const safeName = escapeHtml(name || 'Untitled Product');
  const safeBrand = escapeHtml(brand || 'GUGAN');
  const safePrice = Number(price) || 0;
  const safeDiscount = Number(discount) || 0;
  const displayImage = escapeAttr(getImageUrl(images, FALLBACK_IMAGE_URL));
  const discountedPrice = safeDiscount ? Math.round(safePrice * (1 - safeDiscount / 100)) : null;
  const wishlistOnclick = escapeAttr(`event.stopPropagation(); app.toggleWishlist('${escapeJsString(id)}')`);

  return `
    <div class="product-card" data-id="${safeId}">
      <div class="product-image">
        <div class="product-badges">
          ${is_best_seller ? '<span class="badge badge-best">BEST SELLER</span>' : ''}
          ${is_new_arrival ? '<span class="badge badge-new">NEW</span>' : ''}
          ${is_trending ? '<span class="badge badge-trending">&#128293; TRENDING</span>' : ''}
        </div>
        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="${wishlistOnclick}" aria-label="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
          ${isInWishlist ? '&#10084;&#65039;' : '&#9825;'}
        </button>
        <img src="${displayImage}" alt="${safeName}" loading="lazy" decoding="async" data-fallback-src="${escapeAttr(FALLBACK_IMAGE_URL)}">
        <div class="quick-view">QUICK VIEW</div>
      </div>
      <div class="product-info">
        <h3 class="brand-name">${safeBrand}</h3>
        <p class="product-name">${safeName}</p>
        <div class="product-price">
          ${discountedPrice
            ? `<span class="current-price">Rs. ${discountedPrice.toLocaleString()}</span>
               <span class="original-price" style="text-decoration:line-through; font-size:0.8rem; color:var(--c-gray-400); margin-left:8px;">Rs. ${safePrice.toLocaleString()}</span>`
            : `<span class="current-price">Rs. ${safePrice.toLocaleString()}</span>`
          }
        </div>
      </div>
    </div>
  `;
};
