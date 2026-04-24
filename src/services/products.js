import { supabase } from './supabase';

const DEMO_PRODUCTS = [
  { id: 'demo-1', name: 'Soft Linen Everyday Shirt', brand: 'GUGAN', price: 899, discount: 22, category: 'Men', fabric: 'Linen', images: ['https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L', 'XL'], is_best_seller: true, is_trending: true, created_at: '2026-04-01T10:00:00.000Z' },
  { id: 'demo-2', name: 'Tailored Blue Denim Jeans', brand: 'MAX', price: 1199, discount: 15, category: 'Men', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=900&auto=format&fit=crop'], sizes: ['30', '32', '34', '36'], is_new_arrival: true, created_at: '2026-04-09T10:00:00.000Z' },
  { id: 'demo-3', name: 'Relaxed Fit Classic Tee', brand: 'Urban Loom', price: 599, discount: 10, category: 'Men', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L', 'XL'], is_best_seller: true, created_at: '2026-03-29T10:00:00.000Z' },
  { id: 'demo-4', name: 'Festive Silk Saree', brand: 'Kalini', price: 2099, discount: 28, category: 'Women', fabric: 'Silk', images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=900&auto=format&fit=crop'], sizes: ['Free'], is_best_seller: true, is_trending: true, created_at: '2026-04-04T10:00:00.000Z' },
  { id: 'demo-5', name: 'Floral Cotton Kurta Set', brand: 'Anayna', price: 1499, discount: 18, category: 'Women', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L', 'XL'], is_new_arrival: true, created_at: '2026-04-13T10:00:00.000Z' },
  { id: 'demo-6', name: 'Ribbed Everyday Crop Top', brand: 'Tokyo Talkies', price: 699, discount: 20, category: 'Women', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?q=80&w=900&auto=format&fit=crop'], sizes: ['XS', 'S', 'M', 'L'], is_trending: true, created_at: '2026-04-11T10:00:00.000Z' },
  { id: 'demo-7', name: 'Pleated Summer Midi Dress', brand: 'LUMA', price: 1699, discount: 24, category: 'Women', fabric: 'Linen', images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L'], created_at: '2026-03-20T10:00:00.000Z' },
  { id: 'demo-8', name: 'Boys Cotton Party Shirt', brand: 'Hopscotch', price: 799, discount: 14, category: 'Kids', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=900&auto=format&fit=crop'], sizes: ['5-6Y', '7-8Y', '9-10Y'], is_best_seller: true, created_at: '2026-04-05T10:00:00.000Z' },
  { id: 'demo-9', name: 'Kids Stretch Denim', brand: 'Mini Klub', price: 899, discount: 16, category: 'Kids', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=900&auto=format&fit=crop'], sizes: ['5-6Y', '7-8Y', '9-10Y'], created_at: '2026-03-24T10:00:00.000Z' },
  { id: 'demo-10', name: 'Breathable Kids Sneakers', brand: 'Kiddo Walk', price: 1299, discount: 12, category: 'Kids', fabric: 'Mesh', images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=900&auto=format&fit=crop'], sizes: ['30', '31', '32', '33'], is_trending: true, created_at: '2026-04-03T10:00:00.000Z' },
  { id: 'demo-11', name: 'Co-ord Lounge Set', brand: 'GUGAN', price: 1399, discount: 21, category: 'Women', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L'], is_new_arrival: true, created_at: '2026-04-20T10:00:00.000Z' },
  { id: 'demo-12', name: 'Classic White Office Shirt', brand: 'Roadster', price: 1099, discount: 17, category: 'Women', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L', 'XL'], created_at: '2026-03-27T10:00:00.000Z' },
  { id: 'demo-13', name: 'High-Rise Black Jeans', brand: 'DressBerry', price: 1299, discount: 18, category: 'Women', fabric: 'Denim', images: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=900&auto=format&fit=crop'], sizes: ['26', '28', '30', '32'], is_best_seller: true, created_at: '2026-04-06T10:00:00.000Z' },
  { id: 'demo-14', name: 'Men Casual Overshirt', brand: 'HIGHLANDER', price: 999, discount: 19, category: 'Men', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L', 'XL'], is_trending: true, created_at: '2026-04-14T10:00:00.000Z' },
  { id: 'demo-15', name: 'Daily Comfort Polo Tee', brand: 'Mast & Harbour', price: 749, discount: 13, category: 'Men', fabric: 'Cotton', images: ['https://images.unsplash.com/photo-1622445275463-afa2ab738c34?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L'], is_new_arrival: true, created_at: '2026-04-17T10:00:00.000Z' },
  { id: 'demo-16', name: 'Printed Party Dress', brand: 'LUMA', price: 1799, discount: 25, category: 'Women', fabric: 'Polyester', images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=900&auto=format&fit=crop'], sizes: ['S', 'M', 'L'], is_best_seller: true, created_at: '2026-04-08T10:00:00.000Z' },
  { id: 'demo-17', name: 'Minimal Leather Handbag', brand: 'Accessorize', price: 1299, discount: 20, category: 'Accessories', fabric: 'Leather', images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=900&auto=format&fit=crop'], sizes: ['Free'], is_best_seller: true, created_at: '2026-04-02T10:00:00.000Z' },
  { id: 'demo-18', name: 'Classic Metal Watch', brand: 'Titan Edge', price: 2199, discount: 15, category: 'Accessories', fabric: 'Metal', images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=900&auto=format&fit=crop'], sizes: ['Free'], is_trending: true, created_at: '2026-04-12T10:00:00.000Z' },
  { id: 'demo-19', name: 'Polarized Sunglasses', brand: 'Roadster', price: 999, discount: 18, category: 'Accessories', fabric: 'Polycarbonate', images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=900&auto=format&fit=crop'], sizes: ['Free'], is_new_arrival: true, created_at: '2026-04-18T10:00:00.000Z' },
  { id: 'demo-20', name: 'Canvas Street Backpack', brand: 'Wildcraft', price: 1499, discount: 14, category: 'Accessories', fabric: 'Canvas', images: ['https://images.unsplash.com/photo-1581605405669-fcdf81165afa?q=80&w=900&auto=format&fit=crop'], sizes: ['Free'], created_at: '2026-04-10T10:00:00.000Z' },
];

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const normalizeProduct = (item) => {
  const images = toArray(item?.images);
  return {
    ...item,
    id: item?.id ?? `demo-${Math.random().toString(36).slice(2, 8)}`,
    name: item?.name || 'Untitled Product',
    brand: item?.brand || 'GUGAN',
    price: Number(item?.price) || 0,
    discount: Number(item?.discount) || 0,
    images: images.length ? images : ['https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=900&auto=format&fit=crop'],
    sizes: Array.isArray(item?.sizes) && item.sizes.length ? item.sizes : ['S', 'M', 'L'],
    created_at: item?.created_at || '2026-01-01T00:00:00.000Z'
  };
};

const applyDemoFilters = (products, filters = {}) => {
  let result = [...products];
  const {
    category,
    priceRange,
    sort,
    search,
    sizes,
    brand,
    fabric,
    isBestSeller,
    isNewArrival,
    isTrending,
    limit = 50,
    offset = 0
  } = filters;

  if (category) result = result.filter((p) => String(p.category).toLowerCase() === String(category).toLowerCase());
  if (brand) result = result.filter((p) => String(p.brand).toLowerCase() === String(brand).toLowerCase());
  if (fabric) result = result.filter((p) => String(p.fabric).toLowerCase() === String(fabric).toLowerCase());
  if (isBestSeller) result = result.filter((p) => p.is_best_seller);
  if (isNewArrival) result = result.filter((p) => p.is_new_arrival);
  if (isTrending) result = result.filter((p) => p.is_trending);

  if (search) {
    const needle = String(search).toLowerCase();
    result = result.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(needle));
  }

  if (priceRange) {
    result = result.filter((p) => p.price >= Number(priceRange.min ?? 0) && p.price <= Number(priceRange.max ?? 999999));
  }

  if (sizes?.length) {
    result = result.filter((p) => p.sizes?.some((size) => sizes.includes(size)));
  }

  if (sort) {
    const [column, order] = sort.split(':');
    const asc = order === 'asc';
    result.sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (column === 'created_at') {
        return asc ? new Date(av) - new Date(bv) : new Date(bv) - new Date(av);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return asc ? av - bv : bv - av;
      }
      return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  } else {
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const total = result.length;
  const paged = result.slice(offset, offset + limit);
  return { products: paged, total };
};

export const productService = {
  async getProducts({ 
    category, 
    priceRange, 
    sort, 
    search, 
    sizes, 
    brand,
    fabric,
    isBestSeller,
    isNewArrival,
    isTrending,
    limit = 50,
    offset = 0
  }) {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (category) query = query.eq('category', category);
    if (brand) query = query.eq('brand', brand);
    if (fabric) query = query.eq('fabric', fabric);
    if (isBestSeller) query = query.eq('is_best_seller', true);
    if (isNewArrival) query = query.eq('is_new_arrival', true);
    if (isTrending) query = query.eq('is_trending', true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    if (priceRange) {
      query = query.gte('price', priceRange.min).lte('price', priceRange.max);
    }

    if (sizes && sizes.length > 0) {
      // Assuming sizes is stored in a way that we can filter (e.g., jsonb array)
      // For simplicity in vanilla supabase-js, we filter by 'contains' or or
      query = query.filter('sizes', 'cs', JSON.stringify(sizes));
    }

    if (sort) {
      const [column, order] = sort.split(':');
      query = query.order(column, { ascending: order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (limit) query = query.range(offset, offset + limit - 1);

    try {
      const { data, error, count } = await query;
      if (error) throw error;

      const normalized = (data || []).map(normalizeProduct);
      if (normalized.length > 0) {
        return { products: normalized, total: count ?? normalized.length };
      }
    } catch (_) {
      // Fallback to demo catalog when backend is empty or unavailable.
    }

    return applyDemoFilters(DEMO_PRODUCTS.map(normalizeProduct), {
      category,
      priceRange,
      sort,
      search,
      sizes,
      brand,
      fabric,
      isBestSeller,
      isNewArrival,
      isTrending,
      limit,
      offset
    });
  },

  async getProductById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return normalizeProduct(data);
    } catch (_) {
      const demo = DEMO_PRODUCTS.map(normalizeProduct).find((p) => String(p.id) === String(id));
      if (!demo) throw new Error('Product not found');
      return demo;
    }
  },

  async createProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProduct(id, productData) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Demo data for UI fallback and local development
  getMockProducts() {
    return DEMO_PRODUCTS.map(normalizeProduct);
  }
};
