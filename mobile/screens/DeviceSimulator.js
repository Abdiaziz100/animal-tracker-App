import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, TextInput, ActivityIndicator
} from 'react-native';
import axios from 'axios';

import { API_URL } from '../config';

// Simulated GPS movement around farm center
const FARM_CENTER = { lat: -1.29, lng: 36.82 };

export default function DeviceSimulator() {
  const [animalId, setAnimalId]       = useState('');
  const [isTracking, setIsTracking]   = useState(false);
  const [currentLat, setCurrentLat]   = useState(FARM_CENTER.lat);
  const [currentLng, setCurrentLng]   = useState(FARM_CENTER.lng);
  const [status, setStatus]           = useState('IN');
  const [logs, setLogs]               = useState([]);
  const [updateCount, setUpdateCount] = useState(0);
  const [interval, setIntervalSec]    = useState('10');
  const [loading, setLoading]         = useState(false);
  const timerRef                      = useRef(null);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  };

  const sendGPS = async (lat, lng) => {
    if (!animalId) return;
    try {
      const res = await axios.post(`${API_URL}/update-location`, {
        id: parseInt(animalId), lat, lng
      });
      setStatus(res.data.status);
      setUpdateCount(c => c + 1);
      addLog(`📡 Sent: ${lat.toFixed(4)}, ${lng.toFixed(4)} → Status: ${res.data.status}`,
        res.data.status === 'OUT' ? 'alert' : 'success');
    } catch (e) {
      addLog(`❌ Failed to send GPS update`, 'error');
    }
  };

  const simulateMovement = () => {
    // Randomly move the animal slightly
    const variation = 0.002;
    const newLat = currentLat + (Math.random() * variation * 2 - variation);
    const newLng = currentLng + (Math.random() * variation * 2 - variation);
    setCurrentLat(newLat);
    setCurrentLng(newLng);
    sendGPS(newLat, newLng);
  };

  const startTracking = () => {
    if (!animalId) { Alert.alert('Error', 'Enter Animal ID first'); return; }
    setIsTracking(true);
    addLog(`🟢 Started tracking Animal ID: ${animalId}`);
    sendGPS(currentLat, currentLng);
    timerRef.current = setInterval(simulateMovement, parseInt(interval) * 1000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    addLog('🔴 Tracking stopped');
  };

  const moveOutside = async () => {
    const outLat = FARM_CENTER.lat + 0.15;
    const outLng = FARM_CENTER.lng + 0.15;
    setCurrentLat(outLat);
    setCurrentLng(outLng);
    await sendGPS(outLat, outLng);
    addLog('⚠️ Moved OUTSIDE geofence!', 'alert');
  };

  const moveInside = async () => {
    setCurrentLat(FARM_CENTER.lat);
    setCurrentLng(FARM_CENTER.lng);
    await sendGPS(FARM_CENTER.lat, FARM_CENTER.lng);
    addLog('✅ Returned INSIDE geofence', 'success');
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const distFromFarm = Math.sqrt(
    Math.pow((currentLat - FARM_CENTER.lat) * 111, 2) +
    Math.pow((currentLng - FARM_CENTER.lng) * 111, 2)
  ).toFixed(2);

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📱 Phone as GPS Device</Text>
        <Text style={s.headerSub}>Simulate a Bluetooth/GPS ear tag using your phone</Text>
      </View>

      <View style={s.inner}>

        {/* Status Card */}
        <View style={[s.statusCard, { backgroundColor: status === 'IN' ? '#f0fdf4' : '#fef2f2' }]}>
          <Text style={s.statusEmoji}>{status === 'IN' ? '✅' : '⚠️'}</Text>
          <View>
            <Text style={[s.statusText, { color: status === 'IN' ? '#16a34a' : '#dc2626' }]}>
              {status === 'IN' ? 'INSIDE FARM' : 'OUTSIDE FARM'}
            </Text>
            <Text style={s.statusSub}>{distFromFarm} km from farm center</Text>
            <Text style={s.statusSub}>Updates sent: {updateCount}</Text>
          </View>
          <View style={[s.statusDot, { backgroundColor: isTracking ? '#16a34a' : '#9ca3af' }]} />
        </View>

        {/* Config */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚙️ Device Configuration</Text>
          <Text style={s.label}>Animal ID (from your registered animals)</Text>
          <TextInput
            style={s.input}
            placeholder="Enter Animal ID e.g. 1"
            value={animalId}
            onChangeText={setAnimalId}
            keyboardType="numeric"
            editable={!isTracking}
          />
          <Text style={s.label}>Update Interval (seconds)</Text>
          <View style={s.chipRow}>
            {['5', '10', '30', '60'].map(v => (
              <TouchableOpacity
                key={v}
                style={[s.chip, interval === v && s.chipActive]}
                onPress={() => setIntervalSec(v)}
                disabled={isTracking}
              >
                <Text style={[s.chipText, interval === v && { color: 'white' }]}>{v}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current GPS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 Current GPS Position</Text>
          <View style={s.coordBox}>
            <Text style={s.coordText}>Lat: {currentLat.toFixed(6)}</Text>
            <Text style={s.coordText}>Lng: {currentLng.toFixed(6)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🎮 Controls</Text>

          {/* Start/Stop */}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: isTracking ? '#dc2626' : '#16a34a' }]}
            onPress={isTracking ? stopTracking : startTracking}
          >
            <Text style={s.btnText}>
              {isTracking ? '⏹ Stop Tracking' : '▶️ Start Tracking'}
            </Text>
          </TouchableOpacity>

          {/* Move buttons */}
          <View style={s.row}>
            <TouchableOpacity style={[s.halfBtn, { backgroundColor: '#dc2626' }]} onPress={moveOutside}>
              <Text style={s.btnText}>⚠️ Move Outside</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.halfBtn, { backgroundColor: '#16a34a' }]} onPress={moveInside}>
              <Text style={s.btnText}>✅ Return Inside</Text>
            </TouchableOpacity>
          </View>

          {/* Manual send */}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#2563eb' }]}
            onPress={() => sendGPS(currentLat, currentLng)}
          >
            <Text style={s.btnText}>📡 Send GPS Now</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Log */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Activity Log</Text>
          {logs.length === 0 ? (
            <Text style={s.noLog}>No activity yet. Start tracking to see logs.</Text>
          ) : (
            logs.map((log, i) => (
              <Text key={i} style={[
                s.logLine,
                log.includes('⚠️') && { color: '#dc2626' },
                log.includes('✅') && { color: '#16a34a' },
                log.includes('❌') && { color: '#dc2626' },
              ]}>
                {log}
              </Text>
            ))
          )}
        </View>

        {/* How to use */}
        <View style={s.infoBox}>
          <Text style={s.infoTitle}>📱 How to Test with 2 Phones</Text>
          <Text style={s.infoText}>
            <Text style={{ fontWeight: '700' }}>Phone 1 (Farmer):{'\n'}</Text>
            • Login as farmer{'\n'}
            • Register an animal{'\n'}
            • Watch Dashboard & Alerts{'\n\n'}
            <Text style={{ fontWeight: '700' }}>Phone 2 (GPS Device):{'\n'}</Text>
            • Open this Device Simulator tab{'\n'}
            • Enter the Animal ID{'\n'}
            • Press Start Tracking{'\n'}
            • Press "Move Outside" to trigger alert{'\n\n'}
            Phone 1 will receive the alert immediately! 🔔
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#7c3aed', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSub: { color: '#ddd6fe', fontSize: 13, marginTop: 2 },
  inner: { padding: 16 },
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  statusEmoji: { fontSize: 36 },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 'auto' },
  section: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  chipText: { color: '#374151', fontSize: 13 },
  coordBox: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 },
  coordText: { fontFamily: 'monospace', color: '#1f2937', fontSize: 14, marginBottom: 2 },
  btn: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  noLog: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: 8 },
  logLine: { fontSize: 12, color: '#374151', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', fontFamily: 'monospace' },
  infoBox: { backgroundColor: '#f5f3ff', padding: 16, borderRadius: 16, marginBottom: 32 },
  infoTitle: { color: '#6d28d9', fontWeight: '700', marginBottom: 8 },
  infoText: { color: '#5b21b6', fontSize: 13, lineHeight: 22 },
});
