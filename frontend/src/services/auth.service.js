/**
 * Authentication Service
 *
 * Handles user authentication operations: login, register, logout, and get user data.
 */

import api from './api';

export const authService = {
  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} Response with token and user data
   */
  async login(email, password) {
    const response = await api.post('/login', { email, password });
    return response.data;
  },

  /**
   * Register new user
   * @param {string} name - User name
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} password_confirmation - Password confirmation
   * @returns {Promise<object>} Response with token and user data
   */
  async register(name, email, password, password_confirmation) {
    const response = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation
    });
    return response.data;
  },

  /**
   * Logout user (revoke token)
   * @returns {Promise<object>} Response message
   */
  async logout() {
    const response = await api.post('/logout');
    return response.data;
  },

  /**
   * Get authenticated user data
   * @returns {Promise<object>} User object
   */
  async getUser() {
    const response = await api.get('/user');
    return response.data;
  }
};
