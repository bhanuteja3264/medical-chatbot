import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('auth-user')) || null,
  token: localStorage.getItem('auth-token') || null,
  
  setAuth: (user, token) => {
    localStorage.setItem('auth-user', JSON.stringify(user));
    localStorage.setItem('auth-token', token);
    set({ user, token });
  },
  
  logout: () => {
    localStorage.removeItem('auth-user');
    localStorage.removeItem('auth-token');
    set({ user: null, token: null });
  },
  
  updateUser: (userData) => set((state) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('auth-user', JSON.stringify(updatedUser));
    return { user: updatedUser };
  }),
}));
