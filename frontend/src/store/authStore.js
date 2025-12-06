/**
 * Authentication Store (Zustand)
 *
 * Global state management for user authentication.
 * Persists token to localStorage automatically.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      // State
      token: null,
      user: null,
      isAuthenticated: false,

      /**
       * Set authentication data (token and user)
       * @param {string} token - Auth token
       * @param {object} user - User object
       */
      setAuth: (token, user) => {
        // Store token in localStorage
        localStorage.setItem('auth_token', token);

        set({
          token,
          user,
          isAuthenticated: true
        });
      },

      /**
       * Set token only
       * @param {string} token - Auth token
       */
      setToken: (token) => {
        localStorage.setItem('auth_token', token);
        set({ token, isAuthenticated: true });
      },

      /**
       * Update user data
       * @param {object} user - Updated user object
       */
      setUser: (user) => set({ user }),

      /**
       * Clear authentication data (logout)
       */
      clearAuth: () => {
        // Remove token from localStorage
        localStorage.removeItem('auth_token');

        set({
          token: null,
          user: null,
          isAuthenticated: false
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
