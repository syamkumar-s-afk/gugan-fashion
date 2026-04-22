import { supabase } from './supabase';

export const configService = {
  async getHomepageConfig() {
    const { data, error } = await supabase
      .from('homepage_config')
      .select('*');
    
    if (error) throw error;
    
    // Transform array into object for easier access: { hero: {...}, categories: {...} }
    return data.reduce((acc, item) => {
      acc[item.id] = item.data;
      return acc;
    }, {});
  },

  async updateConfig(id, configData) {
    const { data, error } = await supabase
      .from('homepage_config')
      .upsert({ id, data: configData, updated_at: new Date() })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
