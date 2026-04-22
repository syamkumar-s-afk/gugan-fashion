export const ProductCard = (product) => {
  const { id, name, brand, price, images, is_best_seller } = product;
  const displayImage = images && images.length > 0 ? images[0] : 'https://via.placeholder.com/300x400?text=No+Image';

  return `
    <div class="product-card" data-id="${id}">
      <div class="product-image">
        ${is_best_seller ? '<span class="badge">BEST SELLER</span>' : ''}
        <img src="${displayImage}" alt="${name}">
        <div class="quick-view">QUICK VIEW</div>
      </div>
      <div class="product-details">
        <h3 class="brand-name">${brand || 'GUGAN'}</h3>
        <p class="product-name">${name}</p>
        <div class="price-box">
          <span class="current-price">Rs. ${price}</span>
        </div>
      </div>
    </div>
  `;
};
