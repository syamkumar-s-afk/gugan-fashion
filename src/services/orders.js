import { supabase } from './supabase';

const ORDER_STATUSES = ['ORDER_PLACED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const orderService = {
  ORDER_STATUSES,

  async getOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getOrderById(id) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createOrder(orderData) {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateOrderStatus(id, status) {
    if (!ORDER_STATUSES.includes(status)) throw new Error('Invalid status');
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  statusLabel(status) {
    const labels = {
      ORDER_PLACED: 'Order Placed',
      SHIPPED: 'Shipped',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered',
    };
    return labels[status] || status;
  },

  statusColor(status) {
    const colors = {
      ORDER_PLACED: 'badge-info',
      SHIPPED: 'badge-warning',
      OUT_FOR_DELIVERY: 'badge-warning',
      DELIVERED: 'badge-success',
    };
    return colors[status] || '';
  }
};
