import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

const SPECIES = ['Cattle', 'Sheep', 'Goat', 'Camel', 'Donkey', 'Horse'];
const GENDERS = ['Male', 'Female'];
const HEALTH = ['Healthy', 'Sick', 'Quarantine'];

export default function AddAnimal() {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Cattle');
  const [breed, setBreed] = useState('');
  const [tagId, setTagId] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('Male');
  const [color, setColor] = useState('');
  const [health, setHealth] = useState('Healthy');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { getAuthHeader } = useAuth();

  const handleAdd = async () => {
    if (!name) { Alert.alert('Error', 'Animal name is required'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/animals`, {
        name, species, breed, tag_id: tagId,
        age_years: parseFloat(age) || 0,
        weight_kg: parseFloat(weight) || 0,
        gender, color,
        health_status: health,
        lat: parseFloat(lat) || -1.29,
        lng: parseFloat(lng) || 36.82,
      }, getAuthHeader());
      Alert.alert('✅ Success', `${name} registered successfully!`, [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to register animal');
    } finally {
      setLoading(false);
    }
  };

  const Selector = ({ label, options, value, onChange }) => (
    <View style={s.selectorBox}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.selectorRow}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.chip, value === opt && s.chipActive]}
              onPress={() => onChange(opt)}
            >
              <Text style={[s.chipText, value === opt && s.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={s.container}>
      <View style={s.inner}>
        <View style={s.titleBox}>
          <Text style={s.title}>🐄 Register Animal</Text>
          <Text style={s.subtitle}>Official Livestock Registration Form</Text>
        </View>

        {/* Basic Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Basic Information</Text>
          <Text style={s.label}>Animal Name *</Text>
          <TextInput style={s.input} placeholder="e.g., Cow 001" value={name} onChangeText={setName} />
          <Text style={s.label}>Ear Tag / RFID ID</Text>
          <TextInput style={s.input} placeholder="e.g., KE-2024-001" value={tagId} onChangeText={setTagId} />
          <Text style={s.label}>Breed</Text>
          <TextInput style={s.input} placeholder="e.g., Friesian, Boran" value={breed} onChangeText={setBreed} />
          <Text style={s.label}>Color / Markings</Text>
          <TextInput style={s.input} placeholder="e.g., Black & White" value={color} onChangeText={setColor} />
        </View>

        {/* Species & Gender */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🐾 Classification</Text>
          <Selector label="Species" options={SPECIES} value={species} onChange={setSpecies} />
          <Selector label="Gender" options={GENDERS} value={gender} onChange={setGender} />
          <Selector label="Health Status" options={HEALTH} value={health} onChange={setHealth} />
        </View>

        {/* Physical Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📏 Physical Details</Text>
          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Age (Years)</Text>
              <TextInput style={s.input} placeholder="e.g., 3" value={age} onChangeText={setAge} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.label}>Weight (kg)</Text>
              <TextInput style={s.input} placeholder="e.g., 450" value={weight} onChangeText={setWeight} keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* GPS Location */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 GPS Location</Text>
          <Text style={s.hint}>Leave blank to use default farm location</Text>
          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Latitude</Text>
              <TextInput style={s.input} placeholder="-1.2921" value={lat} onChangeText={setLat} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.label}>Longitude</Text>
              <TextInput style={s.input} placeholder="36.8219" value={lng} onChangeText={setLng} keyboardType="numeric" />
            </View>
          </View>
        </View>

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleAdd} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>✅ Register Animal</Text>}
        </TouchableOpacity>

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>ℹ️ Government Registration</Text>
          <Text style={s.infoText}>
            All registered animals are tracked under your farm license.
            Ear tag IDs must match official government-issued tags.
            Data is stored securely and can be exported for compliance reports.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 16 },
  titleBox: { alignItems: 'center', marginBottom: 20, padding: 16, backgroundColor: '#16a34a', borderRadius: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  subtitle: { color: '#d1fae5', marginTop: 4, fontSize: 13 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, fontSize: 15 },
  row: { flexDirection: 'row' },
  selectorBox: { marginBottom: 12 },
  selectorRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: 'white' },
  btn: { backgroundColor: '#16a34a', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  infoBox: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, marginBottom: 32 },
  infoTitle: { color: '#1e40af', fontWeight: '700', marginBottom: 6 },
  infoText: { color: '#1d4ed8', fontSize: 13, lineHeight: 20 },
});
