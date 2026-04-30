import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ScrollView, StyleSheet, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

const PRESET_LOCATIONS = [
  { name: 'Nairobi', lat: '-1.2921', lng: '36.8219' },
  { name: 'Nakuru', lat: '-0.3031', lng: '36.0800' },
  { name: 'Mombasa', lat: '-4.0435', lng: '39.6682' },
  { name: 'Kisumu', lat: '-0.1022', lng: '34.7617' },
  { name: 'Eldoret', lat: '0.5143', lng: '35.2698' },
  { name: 'Thika', lat: '-1.0332', lng: '37.0693' },
];

const RADIUS_PRESETS = [
  { label: '1 km', value: '1' },
  { label: '2 km', value: '2' },
  { label: '5 km', value: '5' },
  { label: '10 km', value: '10' },
  { label: '20 km', value: '20' },
  { label: '50 km', value: '50' },
];

export default function GeofenceScreen() {
  const { getAuthHeader } = useAuth();
  const [name, setName]       = useState('Main Farm');
  const [lat, setLat]         = useState('-1.29');
  const [lng, setLng]         = useState('36.82');
  const [radius, setRadius]   = useState('5');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [animals, setAnimals] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gfRes, animalsRes] = await Promise.all([
        axios.get(`${API_URL}/geofence`, getAuthHeader()),
        axios.get(`${API_URL}/animals`, getAuthHeader()),
      ]);
      setName(gfRes.data.name || 'Main Farm');
      setLat(String(gfRes.data.center_lat || '-1.29'));
      setLng(String(gfRes.data.center_lng || '36.82'));
      setRadius(String(gfRes.data.radius_km || '5'));
      setAnimals(animalsRes.data);
    } catch (e) {}
    finally { setLoading(false); }
  }, [getAuthHeader]);

  useEffect(() => { fetchData(); }, []);

  const save = async () => {
    if (!lat || !lng || !radius) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API_URL}/geofence`, {
        name,
        center_lat: parseFloat(lat),
        center_lng: parseFloat(lng),
        radius_km: parseFloat(radius),
      }, getAuthHeader());
      Alert.alert('✅ Saved', 'Geofence updated. Animals will be checked against new boundary.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save geofence');
    } finally { setSaving(false); }
  };

  const insideCount  = animals.filter(a => a.status === 'IN').length;
  const outsideCount = animals.filter(a => a.status === 'OUT').length;
  const radiusNum    = parseFloat(radius) || 0;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>📍 Geofence Settings</Text>
        <Text style={s.headerSub}>Define your farm boundary for animal tracking</Text>
      </View>

      <View style={s.inner}>

        {/* Current Status */}
        <View style={s.statusRow}>
          <View style={[s.statusCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={s.statusNum}>{insideCount}</Text>
            <Text style={s.statusLabel}>✅ Inside</Text>
          </View>
          <View style={[s.statusCard, { backgroundColor: outsideCount > 0 ? '#fef2f2' : '#f9fafb' }]}>
            <Text style={[s.statusNum, { color: outsideCount > 0 ? '#dc2626' : '#6b7280' }]}>{outsideCount}</Text>
            <Text style={s.statusLabel}>⚠️ Outside</Text>
          </View>
          <View style={[s.statusCard, { backgroundColor: '#eff6ff' }]}>
            <Text style={[s.statusNum, { color: '#2563eb' }]}>{radiusNum} km</Text>
            <Text style={s.statusLabel}>📏 Radius</Text>
          </View>
        </View>

        {/* Visual Geofence Map */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🗺️ Farm Boundary Preview</Text>
          <View style={s.mapPreview}>
            {/* Outer ring */}
            <View style={s.ring3} />
            <View style={s.ring2} />
            <View style={s.ring1} />
            {/* Center */}
            <View style={s.centerDot}>
              <Text style={s.centerText}>🏡</Text>
            </View>
            {/* Animals */}
            {animals.slice(0, 6).map((a, i) => {
              const angle = (i / Math.max(animals.length, 1)) * 2 * Math.PI;
              const isOut = a.status === 'OUT';
              const dist  = isOut ? 85 : 40 + Math.random() * 30;
              const x     = 100 + dist * Math.cos(angle);
              const y     = 100 + dist * Math.sin(angle);
              return (
                <View key={a.id} style={[s.animalDot, { left: x - 10, top: y - 10, backgroundColor: isOut ? '#dc2626' : '#16a34a' }]}>
                  <Text style={{ fontSize: 10 }}>{isOut ? '⚠️' : '🐄'}</Text>
                </View>
              );
            })}
            <Text style={s.mapLabel}>Radius: {radius} km</Text>
          </View>
          <Text style={s.mapHint}>Green = Inside farm  •  Red = Outside farm</Text>
        </View>

        {/* Geofence Form */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚙️ Boundary Configuration</Text>

          <Text style={s.label}>Geofence Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g., Main Farm" />

          {/* Preset Locations */}
          <Text style={s.label}>Quick Select Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={s.chipRow}>
              {PRESET_LOCATIONS.map(loc => (
                <TouchableOpacity
                  key={loc.name}
                  style={s.chip}
                  onPress={() => { setLat(loc.lat); setLng(loc.lng); }}
                >
                  <Text style={s.chipText}>📍 {loc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Center Latitude</Text>
              <TextInput style={s.input} value={lat} onChangeText={setLat} placeholder="-1.29" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.label}>Center Longitude</Text>
              <TextInput style={s.input} value={lng} onChangeText={setLng} placeholder="36.82" keyboardType="numeric" />
            </View>
          </View>

          {/* Radius Presets */}
          <Text style={s.label}>Radius</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={s.chipRow}>
              {RADIUS_PRESETS.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[s.chip, radius === r.value && s.chipActive]}
                  onPress={() => setRadius(r.value)}
                >
                  <Text style={[s.chipText, radius === r.value && { color: 'white' }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TextInput style={s.input} value={radius} onChangeText={setRadius} placeholder="Custom radius in km" keyboardType="numeric" />

          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={s.saveBtnText}>💾 Save Geofence</Text>}
          </TouchableOpacity>
        </View>

        {/* Animals Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🐄 Animals vs Boundary</Text>
          {animals.length === 0 ? (
            <Text style={s.noData}>No animals registered yet</Text>
          ) : (
            animals.map(a => (
              <View key={a.id} style={s.animalRow}>
                <View style={[s.animalStatus, { backgroundColor: a.status === 'IN' ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={{ fontSize: 16 }}>{a.status === 'IN' ? '✅' : '⚠️'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.animalName}>{a.name}</Text>
                  <Text style={s.animalCoords}>{a.lat?.toFixed(4)}, {a.lng?.toFixed(4)}</Text>
                </View>
                <Text style={[s.animalStatusText, { color: a.status === 'IN' ? '#16a34a' : '#dc2626' }]}>
                  {a.status}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Info Box */}
        <View style={s.infoBox}>
          <Text style={s.infoTitle}>ℹ️ How Geofencing Works</Text>
          <Text style={s.infoText}>
            • Set your farm center coordinates and radius{'\n'}
            • When an animal's GPS moves outside the radius, status changes to OUT{'\n'}
            • You receive an alert immediately when an animal leaves{'\n'}
            • Use the Scan screen to simulate GPS updates{'\n'}
            • Larger radius = larger safe zone for your animals
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#16a34a', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSub: { color: '#d1fae5', fontSize: 13, marginTop: 2 },
  inner: { padding: 16 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusCard: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  statusNum: { fontSize: 22, fontWeight: 'bold', color: '#16a34a' },
  statusLabel: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  mapPreview: { width: 200, height: 200, alignSelf: 'center', position: 'relative', marginBottom: 8 },
  ring3: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  ring2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: '#86efac', backgroundColor: '#dcfce7', top: 25, left: 25 },
  ring1: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#16a34a', backgroundColor: '#bbf7d0', top: 50, left: 50 },
  centerDot: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', top: 82, left: 82, zIndex: 10 },
  centerText: { fontSize: 18 },
  animalDot: { position: 'absolute', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  mapLabel: { position: 'absolute', bottom: 4, right: 4, fontSize: 10, color: '#6b7280' },
  mapHint: { textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, fontSize: 15 },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { color: '#374151', fontSize: 13 },
  saveBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  animalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  animalStatus: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  animalName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  animalCoords: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  animalStatusText: { fontWeight: '700', fontSize: 13 },
  noData: { color: '#9ca3af', textAlign: 'center', padding: 12, fontStyle: 'italic' },
  infoBox: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 16, marginBottom: 32 },
  infoTitle: { color: '#1e40af', fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#1d4ed8', fontSize: 13, lineHeight: 22 },
});
