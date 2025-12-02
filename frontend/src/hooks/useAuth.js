/**
 * Authentication React Query Hooks
 *
 * Custom hooks for authentication operations.
 */

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';

/**
 * Login mutation
 * @returns {object} Mutation object with mutate function
 */
export const useLogin = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (data) => {
      // Store token and user in Zustand store
      setAuth(data.token, data.user);

      // Redirect to prospects page
      navigate('/prospects');
    },
  });
};

/**
 * Register mutation
 * @returns {object} Mutation object with mutate function
 */
export const useRegister = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: ({ name, email, password, password_confirmation }) =>
      authService.register(name, email, password, password_confirmation),
    onSuccess: (data) => {
      // Store token and user in Zustand store
      setAuth(data.token, data.user);

      // Redirect to prospects page
      navigate('/prospects');
    },
  });
};

/**
 * Logout mutation
 * @returns {object} Mutation object with mutate function
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear auth store
      clearAuth();

      // Redirect to login page
      navigate('/login');
    },
    onError: () => {
      // Even if API call fails, clear local auth
      clearAuth();
      navigate('/login');
    },
  });
};
