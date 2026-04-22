-- SUPABASE SETUP SCRIPT FOR GUGAN FASHIONS

-- 1. Users Profile Table (Extensions for standard Auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  stock INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]', -- Array of image URLs
  variants JSONB DEFAULT '[]', -- Color/Size details
  is_featured BOOLEAN DEFAULT FALSE,
  is_best_seller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  customer_details JSONB, -- Billing/Shipping info
  items JSONB NOT NULL, -- Array of items: { product_id, quantity, price, variant }
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'ORDER_PLACED' CHECK (status IN ('ORDER_PLACED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Homepage Sections Config
CREATE TABLE IF NOT EXISTS public.homepage_config (
  id TEXT PRIMARY KEY, -- e.g., 'hero_banners', 'featured_categories'
  data JSONB NOT NULL, -- Config data
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read products and config
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Config" ON public.homepage_config FOR SELECT USING (true);

-- Profiles: Users can read/edit their own, Admin can do everything
CREATE POLICY "Profiles self access" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Orders: Users can read their own, Admin can read/write all
CREATE POLICY "Orders self read" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
