import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Alert, ActivityIndicator,
  ScrollView, StyleSheet, TextInput, Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

const RECORD_TYPES = ['Vaccination', 'Treatment', 'Checkup', 'Deworming', 'Surgery'];
const HEALTH_OPTIONS = ['Healthy', 'Sick', 'Quarantine'];

export default function AnimalDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { getAuthHeader } = useAuth();
  const { animal: initialAnimal } = route.params || {};

  const [animal, setAnimal]           = useState(initialAnimal);
  const [loading, setLoading]         = useState(false);
  const [healthRecords, setHealthRecords] = useState([]);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Health record form
  const [recordType, setRecordType]   = useState('Vaccination');
  const [description, setDescription] = useState('');
  const [vetName, setVetName]         = useState('');
  const [nextDue, setNextDue]         = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  const fetchAnimal = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/animals/${animal.id}`, getAuthHeader());
      setAnimal(res.data);
      setHealthRecords(res.data.health_records || []);
    } catch (e) {}
  }, [animal.id, getAuthHeader]);

  useEffect(() => { fetchAnimal(); }, []);

  const handleDelete = () => {
    Alert.alert('Delete Animal', `Are you sure you want to delete ${animal.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await axios.delete(`${API_URL}/animals/${animal.id}`, getAuthHeader());
            Alert.alert('✅ Deleted', 'Animal removed successfully', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch { Alert.alert('Error', 'Failed to delete animal'); }
          finally { setLoading(false); }
        }
      }
    ]);
  };

  const handleSimulate = () => {
    Alert.alert('📡 Simulate GPS Update', 'Choose location:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: '⚠️ Move Outside Farm', onPress: async () => {
          try {
            await axios.post(`${API_URL}/update-location`, {
              id: animal.id, lat: -1.20, lng: 36.95
            });
            Alert.alert('Done', 'Animal moved OUTSIDE geofence');
            fetchAnimal();
          } catch { Alert.alert('Error', 'Failed to update location'); }
        }
      },
      {
        text: '✅ Return to Farm', onPress: async () => {
          try {
            await axios.post(`${API_URL}/update-location`, {
              id: animal.id, lat: -1.29, lng: 36.82
            });
            Alert.alert('Done', 'Animal returned INSIDE geofence');
            fetchAnimal();
          } catch { Alert.alert('Error', 'Failed to update location'); }
        }
      },
    ]);
  };

  const handleUpdateHealth = (status) => {
    Alert.alert('Update Health', `Set ${animal.name} as ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update', onPress: async () => {
          try {
            await axios.put(`${API_URL}/animals/${animal.id}`, { health_status: status }, getAuthHeader());
            fetchAnimal();
          } catch { Alert.alert('Error', 'Failed to update health status'); }
        }
      }
    ]);
  };

  const saveHealthRecord = async () => {
    if (!description) { Alert.alert('Error', 'Description is required'); return; }
    setSavingRecord(true);
    try {
      await axios.post(`${API_URL}/animals/${animal.id}/health`, {
        record_type: recordType,
        description,
        vet_name: vetName,
        next_due: nextDue || null,
      }, getAuthHeader());
      setShowHealthModal(false);
      setDescription(''); setVetName(''); setNextDue('');
      fetchAnimal();
      Alert.alert('✅ Success', 'Health record added');
    } catch { Alert.alert('Error', 'Failed to add health record'); }
    finally { setSavingRecord(false); }
  };

  const isIn = animal.status === 'IN';
  const healthColor = animal.health_status === 'Healthy' ? '#16a34a' : animal.health_status === 'Sick' ? '#dc2626' : '#f59e0b';

  return (
    <ScrollView style={s.container}>
      {/* Status Header */}
      <View style={[s.header, { backgroundColor: isIn ? '#16a34a' : '#dc2626' }]}>
        <Text style={s.headerEmoji}>{isIn ? '🐄' : '⚠️'}</Text>
        <Text style={s.headerName}>{animal.name}</Text>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{isIn ? '✅ INSIDE FARM' : '⚠️ OUTSIDE FARM'}</Text>
        </View>
        <View style={[s.healthBadge, { backgroundColor: healthColor }]}>
          <Text style={s.healthBadgeText}>{animal.health_status || 'Healthy'}</Text>
        </View>
      </View>

      <View style={s.inner}>
        {/* Animal Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Animal Information</Text>
          <View style={s.grid}>
            <InfoRow label="Species" value={animal.species} />
            <InfoRow label="Breed" value={animal.breed || 'N/A'} />
            <InfoRow label="Tag ID" value={animal.tag_id || 'N/A'} />
            <InfoRow label="Gender" value={animal.gender || 'N/A'} />
            <InfoRow label="Age" value={animal.age_years ? `${animal.age_years} yrs` : 'N/A'} />
            <InfoRow label="Weight" value={animal.weight_kg ? `${animal.weight_kg} kg` : 'N/A'} />
            <InfoRow label="Color" value={animal.color || 'N/A'} />
            <InfoRow label="Registered" value={animal.created_at ? new Date(animal.created_at).toLocaleDateString() : 'N/A'} />
          </View>
        </View>

        {/* GPS Location */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 GPS Location</Text>
          <View style={s.coordBox}>
            <Text style={s.coordText}>Latitude:  {animal.lat?.toFixed(6)}</Text>
            <Text style={s.coordText}>Longitude: {animal.lng?.toFixed(6)}</Text>
          </View>
          <View style={[s.statusBox, { backgroundColor: isIn ? '#f0fdf4' : '#fef2f2' }]}>
            <Text style={{ color: isIn ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
              {isIn ? '✅ Within safe farm area' : '⚠️ Outside designated farm area!'}
            </Text>
          </View>
        </View>

        {/* Health Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏥 Health Status</Text>
          <View style={s.chipRow}>
            {HEALTH_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.chip, animal.health_status === opt && { backgroundColor: healthColor, borderColor: healthColor }]}
                onPress={() => handleUpdateHealth(opt)}
              >
                <Text style={[s.chipText, animal.health_status === opt && { color: 'white' }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Records */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>💉 Health Records</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowHealthModal(true)}>
              <Text style={s.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {healthRecords.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 32 }}>💉</Text>
              <Text style={s.emptyText}>No health records yet</Text>
              <Text style={s.emptyHint}>Tap + Add to record vaccinations, treatments etc.</Text>
            </View>
          ) : (
            healthRecords.map((r, i) => (
              <View key={i} style={s.recordCard}>
                <View style={s.recordHeader}>
                  <Text style={s.recordType}>{r.record_type}</Text>
                  <Text style={s.recordDate}>{new Date(r.date).toLocaleDateString()}</Text>
                </View>
                <Text style={s.recordDesc}>{r.description}</Text>
                {r.vet_name ? <Text style={s.recordVet}>👨‍⚕️ {r.vet_name}</Text> : null}
                {r.next_due ? <Text style={s.recordNext}>📅 Next due: {new Date(r.next_due).toLocaleDateString()}</Text> : null}
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚡ Actions</Text>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2563eb' }]} onPress={handleSimulate}>
            <Text style={s.actionBtnText}>📡 Simulate GPS Update</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ef4444' }]} onPress={handleDelete} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={s.actionBtnText}>🗑️ Delete Animal</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Health Record Modal */}
      <Modal visible={showHealthModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>💉 Add Health Record</Text>

            <Text style={s.label}>Record Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RECORD_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, recordType === t && s.chipActive]}
                    onPress={() => setRecordType(t)}
                  >
                    <Text style={[s.chipText, recordType === t && { color: 'white' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.label}>Description *</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="e.g., FMD Vaccine administered" value={description} onChangeText={setDescription} multiline />

            <Text style={s.label}>Vet Name</Text>
            <TextInput style={s.input} placeholder="e.g., Dr. John Kamau" value={vetName} onChangeText={setVetName} />

            <Text style={s.label}>Next Due Date (YYYY-MM-DD)</Text>
            <TextInput style={s.input} placeholder="e.g., 2025-06-01" value={nextDue} onChangeText={setNextDue} />

            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#e5e7eb' }]} onPress={() => setShowHealthModal(false)}>
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#16a34a' }]} onPress={saveHealthRecord} disabled={savingRecord}>
                {savingRecord ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 28, alignItems: 'center' },
  headerEmoji: { fontSize: 48 },
  headerName: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  headerBadgeText: { color: 'white', fontWeight: '700' },
  healthBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  healthBadgeText: { color: 'white', fontWeight: '700', fontSize: 12 },
  inner: { padding: 16 },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  grid: { gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { color: '#6b7280', fontSize: 13 },
  infoValue: { color: '#1f2937', fontSize: 13, fontWeight: '600' },
  coordBox: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 10 },
  coordText: { fontFamily: 'monospace', color: '#1f2937', fontSize: 14, marginBottom: 2 },
  statusBox: { padding: 12, borderRadius: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  emptyBox: { alignItems: 'center', padding: 20 },
  emptyText: { color: '#6b7280', marginTop: 8, fontWeight: '600' },
  emptyHint: { color: '#9ca3af', fontSize: 12, marginTop: 4, textAlign: 'center' },
  recordCard: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  recordType: { fontWeight: '700', color: '#16a34a', fontSize: 13 },
  recordDate: { color: '#9ca3af', fontSize: 12 },
  recordDesc: { color: '#374151', fontSize: 13 },
  recordVet: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  recordNext: { color: '#2563eb', fontSize: 12, marginTop: 2 },
  actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
