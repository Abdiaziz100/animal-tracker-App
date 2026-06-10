import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext();

// Simple storage using module-level variables (persists during app session)
let storedToken = null;
let storedUser  = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto logout on 401 or 422
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      r => r,
      error => {
        if (error.response?.status === 401 || error.response?.status === 422) {
          clearAuth();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const saveAuth = (newToken, userData) => {
    storedToken = newToken;
    storedUser  = userData;
    setToken(newToken);
    setUser(userData);
  };

  const clearAuth = () => {
    storedToken = null;
    storedUser  = null;
    setToken(null);
    setUser(null);
  };

  const login = async (email, password) => {
    try {
      const res      = await axios.post(`${API_URL}/login`, { email, password });
      const userData = { id: res.data.user_id, email, full_name: res.data.full_name };
      saveAuth(res.data.token, userData);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (email, password, full_name = '', phone = '', farm_name = '', farm_location = '') => {
    try {
      const res      = await axios.post(`${API_URL}/register`, { email, password, full_name, phone, farm_name, farm_location });
      const userData = { id: res.data.user_id, email, full_name: res.data.full_name };
      saveAuth(res.data.token, userData);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => { clearAuth(); };

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
