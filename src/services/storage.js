import { supabase } from './supabase';

export const storageService = {
  /**
   * Upload a file to a Supabase Storage bucket.
   * Bucket must be created in Supabase Dashboard → Storage → New Bucket (public: true)
   * Recommended bucket names: 'products', 'banners'
   */
  async uploadImage(file, bucket = 'products') {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(ext)) throw new Error('Only image files are allowed (jpg, png, webp, gif)');

    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);
    return publicUrl;
  },

  async deleteImage(url, bucket = 'products') {
    const filename = url.split('/').pop();
    const { error } = await supabase.storage.from(bucket).remove([filename]);
    if (error) throw error;
    return true;
  }
};
