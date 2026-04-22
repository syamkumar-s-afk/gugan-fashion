import { supabase } from './supabase';

export const productService = {
  async getProducts({ category, priceRange, sort }) {
    let query = supabase
      .from('products')
      .select('*');

    if (category) {
      query = query.eq('category', category);
    }

    if (priceRange) {
      query = query.gte('price', priceRange.min).lte('price', priceRange.max);
    }

    if (sort) {
      const [column, order] = sort.split(':');
      query = query.order(column, { ascending: order === 'asc' });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getProductById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
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

  // Mock data for initial development (can be removed later)
  getMockProducts() {
    return [
      { id: '1', name: 'Premium Linen Shirt', brand: 'GUGAN', price: 1499, category: 'Men', images: ['/category_men_1776790174624.png'] },
      { id: '2', name: 'Slim Fit Denim', brand: 'MAX', price: 2999, category: 'Men', images: ['/category_men_1776790174624.png'] },
      { id: '3', name: 'Cotton Summer Dress', brand: 'LUMA', price: 3499, category: 'Women', images: ['/category_women_1776790195640.png'] },
      { id: '4', name: 'Urban Sneakers', brand: 'WALK', price: 4999, category: 'Kids', images: ['/category_kids_1776790212704.png'] },
      { id: '5', name: 'Formal Trousers', brand: 'GUGAN', price: 1999, category: 'Men', images: ['/category_men_1776790174624.png'] },
      { id: '6', name: 'Floral Maxi Dress', brand: 'LUMA', price: 4299, category: 'Women', images: ['/category_women_1776790195640.png'] },
    ];
  }
};
