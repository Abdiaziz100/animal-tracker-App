import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ScrollView, StyleSheet, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import axios from 'axios';

import { API_URL } from '../config';

export default function SettingsScreen() {
  const { user, logout, getAuthHeader } = useAuth();
  const { notifications, clearNotifications } = useNotifications();

  // Profile state
  const [fullName, setFullName]       = useState('');
  const [phone, setPhone]             = useState('');
  const [farmName, setFarmName]       = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Geofence state
  const [gfName, setGfName]           = useState('Main Farm');
  const [gfLat, setGfLat]             = useState('');
  const [gfLng, setGfLng]             = useState('');
  const [gfRadius, setGfRadius]       = useState('');
  const [savingGf, setSavingGf]       = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/profile`, getAuthHeader());
      setFullName(res.data.full_name || '');
      setPhone(res.data.phone || '');
      setFarmName(res.data.farm_name || '');
      setFarmLocation(res.data.farm_location || '');
    } catch (e) {}
  }, [getAuthHeader]);

  const fetchGeofence = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/geofence`, getAuthHeader());
      setGfName(res.data.name || 'Main Farm');
      setGfLat(String(res.data.center_lat || '-1.29'));
      setGfLng(String(res.data.center_lng || '36.82'));
      setGfRadius(String(res.data.radius_km || '5'));
    } catch (e) {}
  }, [getAuthHeader]);

  useEffect(() => {
    fetchProfile();
    fetchGeofence();
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API_URL}/profile`, {
        full_name: fullName, phone, farm_name: farmName, farm_location: farmLocation
      }, getAuthHeader());
      Alert.alert('✅ Success', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveGeofence = async () => {
    if (!gfLat || !gfLng || !gfRadius) {
      Alert.alert('Error', 'Please fill all geofence fields');
      return;
    }
    setSavingGf(true);
    try {
      await axios.put(`${API_URL}/geofence`, {
        name: gfName,
        center_lat: parseFloat(gfLat),
        center_lng: parseFloat(gfLng),
        radius_km: parseFloat(gfRadius),
      }, getAuthHeader());
      Alert.alert('✅ Success', 'Geofence updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update geofence');
    } finally {
      setSavingGf(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{fullName ? fullName[0].toUpperCase() : '👤'}</Text>
        </View>
        <Text style={s.headerName}>{fullName || 'Farmer'}</Text>
        <Text style={s.headerEmail}>{user?.email}</Text>
        <Text style={s.headerFarm}>{farmName ? `🏡 ${farmName}` : ''}</Text>
      </View>

      <View style={s.inner}>

        {/* Profile Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>👤 Edit Profile</Text>
          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" />
          <Text style={s.label}>Phone Number</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+254 700 000 000" keyboardType="phone-pad" />
          <Text style={s.label}>Farm Name</Text>
          <TextInput style={s.input} value={farmName} onChangeText={setFarmName} placeholder="e.g., Green Valley Farm" />
          <Text style={s.label}>Farm Location / County</Text>
          <TextInput style={s.input} value={farmLocation} onChangeText={setFarmLocation} placeholder="e.g., Nakuru County, Kenya" />
          <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={saveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>💾 Save Profile</Text>}
          </TouchableOpacity>
        </View>

        {/* Geofence Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 Farm Geofence Settings</Text>
          <Text style={s.hint}>Set your farm boundary. Animals outside this area will trigger alerts.</Text>
          <Text style={s.label}>Geofence Name</Text>
          <TextInput style={s.input} value={gfName} onChangeText={setGfName} placeholder="e.g., Main Farm" />
          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Center Latitude</Text>
              <TextInput style={s.input} value={gfLat} onChangeText={setGfLat} placeholder="-1.29" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.label}>Center Longitude</Text>
              <TextInput style={s.input} value={gfLng} onChangeText={setGfLng} placeholder="36.82" keyboardType="numeric" />
            </View>
          </View>
          <Text style={s.label}>Radius (km)</Text>
          <TextInput style={s.input} value={gfRadius} onChangeText={setGfRadius} placeholder="e.g., 5" keyboardType="numeric" />
          <View style={s.infoBox}>
            <Text style={s.infoText}>📌 Current: {gfLat}, {gfLng} | Radius: {gfRadius} km</Text>
          </View>
          <TouchableOpacity style={[s.btn, s.btnBlue]} onPress={saveGeofence} disabled={savingGf}>
            {savingGf ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>💾 Save Geofence</Text>}
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔔 Recent Alerts</Text>
          {notifications.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 32 }}>🔔</Text>
              <Text style={s.emptyText}>No alerts yet</Text>
            </View>
          ) : (
            notifications.slice(0, 5).map((n, i) => (
              <View key={i} style={s.alertItem}>
                <Text style={s.alertTitle}>{n.title}</Text>
                <Text style={s.alertBody}>{n.body}</Text>
              </View>
            ))
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearNotifications}>
              <Text style={s.clearText}>Clear All Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* App Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ℹ️ About</Text>
          <Text style={s.infoRow}>📱 App Version: 2.0.0</Text>
          <Text style={s.infoRow}>🏛️ Livestock Tracker - Government Edition</Text>
          <Text style={s.infoRow}>🔒 Data encrypted & securely stored</Text>
          <Text style={s.infoRow}>📊 Compliant with livestock regulations</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[s.btn, s.btnRed]} onPress={handleLogout}>
          <Text style={s.btnText}>🚪 Logout</Text>
        </TouchableOpacity>

        <Text style={s.footer}>Built for Government Livestock Management</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#16a34a', padding: 32, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: 'white', fontWeight: 'bold' },
  headerName: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerEmail: { color: '#d1fae5', fontSize: 13, marginTop: 2 },
  headerFarm: { color: '#d1fae5', fontSize: 13, marginTop: 4 },
  inner: { padding: 16 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, fontSize: 15 },
  row: { flexDirection: 'row' },
  btn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnGreen: { backgroundColor: '#16a34a' },
  btnBlue: { backgroundColor: '#2563eb' },
  btnRed: { backgroundColor: '#ef4444', marginBottom: 8 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  infoBox: { backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, marginBottom: 12 },
  infoText: { color: '#15803d', fontSize: 13 },
  infoRow: { color: '#374151', fontSize: 13, marginBottom: 6 },
  emptyBox: { alignItems: 'center', padding: 16 },
  emptyText: { color: '#6b7280', marginTop: 6 },
  alertItem: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 8 },
  alertTitle: { color: '#991b1b', fontWeight: '600', fontSize: 13 },
  alertBody: { color: '#dc2626', fontSize: 12, marginTop: 2 },
  clearText: { color: '#ef4444', textAlign: 'center', marginTop: 8, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginBottom: 32, marginTop: 8 },
});
