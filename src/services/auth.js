import { supabase } from './supabase';

export const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("Minimum 8 characters required.");
  if (!/\d/.test(password)) errors.push("At least 1 number required.");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("At least 1 special character required.");
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const authService = {
  async signUp(email, password, fullName) {
    const { isValid, errors } = validatePassword(password);
    if (!isValid) throw new Error(errors.join(" "));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { ...user, profile };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
