import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved token on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser  = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.log('Error loading auth:', e);
    } finally {
      setLoading(false);
    }
  };

  // Auto logout on 401 or 422
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401 || error.response?.status === 422) {
          await clearAuth();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const saveAuth = async (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const clearAuth = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const userData = { id: res.data.user_id, email, full_name: res.data.full_name };
      await saveAuth(res.data.token, userData);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (email, password, full_name = '', phone = '', farm_name = '', farm_location = '') => {
    try {
      const res = await axios.post(`${API_URL}/register`, { email, password, full_name, phone, farm_name, farm_location });
      const userData = { id: res.data.user_id, email, full_name: res.data.full_name };
      await saveAuth(res.data.token, userData);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = async () => {
    await clearAuth();
  };

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
