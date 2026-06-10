import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

const FARM_CENTER = { lat: -1.29, lng: 36.82 };
const GEOFENCE_RADIUS = 0.05;

export default function ScanScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedAnimals, setScannedAnimals] = useState([]);
  const [scanCount, setScanCount] = useState(0);
  const { getAuthHeader } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanInterval = useRef(null);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const fetchAndScan = async () => {
    try {
      const res = await axios.get(`${API_URL}/animals`, getAuthHeader());
      const animals = res.data;

      // Simulate GPS scan - add random RSSI-like signal strength
      const scanned = animals.map(a => {
        const latDiff = Math.abs(a.lat - FARM_CENTER.lat);
        const lngDiff = Math.abs(a.lng - FARM_CENTER.lng);
        const distDeg = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        const distKm = distDeg * 111;
        const rssi = Math.round(-50 - distKm * 10 + (Math.random() * 10 - 5));

        return {
          ...a,
          rssi,
          distance: distKm < 1 ? `${(distKm * 1000).toFixed(0)}m` : `${distKm.toFixed(1)}km`,
          signal: rssi >= -60 ? 'Strong' : rssi >= -75 ? 'Good' : rssi >= -90 ? 'Weak' : 'Very Weak',
          signalColor: rssi >= -60 ? '#16a34a' : rssi >= -75 ? '#65a30d' : rssi >= -90 ? '#f59e0b' : '#dc2626',
        };
      });

      scanned.sort((a, b) => b.rssi - a.rssi);
      setScannedAnimals(scanned);
      setScanCount(c => c + 1);
    } catch (e) {}
  };

  const startScan = () => {
    setIsScanning(true);
    setScannedAnimals([]);
    setScanCount(0);
    startPulse();
    fetchAndScan();
    scanInterval.current = setInterval(fetchAndScan, 3000);
  };

  const stopScan = () => {
    setIsScanning(false);
    stopPulse();
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  const handleSimulateOut = async (animal) => {
    try {
      const randomLat = FARM_CENTER.lat + (Math.random() * 0.2 - 0.1) + 0.1;
      const randomLng = FARM_CENTER.lng + (Math.random() * 0.2 - 0.1) + 0.1;
      await axios.post(`${API_URL}/update-location`, { id: animal.id, lat: randomLat, lng: randomLng });
      Alert.alert('📡 GPS Updated', `${animal.name} moved outside geofence`);
      if (isScanning) fetchAndScan();
    } catch (e) {
      Alert.alert('Error', 'Failed to update GPS');
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📡 GPS Scanner</Text>
        <Text style={s.headerSub}>Scan for nearby animals via ear tags</Text>
      </View>

      {/* Scan Button */}
      <View style={s.scanArea}>
        <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }], opacity: isScanning ? 0.3 : 0 }]} />
        <TouchableOpacity
          style={[s.scanBtn, { backgroundColor: isScanning ? '#dc2626' : '#16a34a' }]}
          onPress={isScanning ? stopScan : startScan}
        >
          <Text style={s.scanBtnIcon}>{isScanning ? '⏹' : '📡'}</Text>
          <Text style={s.scanBtnText}>{isScanning ? 'Stop Scan' : 'Start Scan'}</Text>
        </TouchableOpacity>
        {isScanning && (
          <Text style={s.scanStatus}>Scanning... ({scanCount} updates)</Text>
        )}
        {!isScanning && scannedAnimals.length > 0 && (
          <Text style={s.scanStatus}>Found {scannedAnimals.length} animals</Text>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={scannedAnimals}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !isScanning ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>📡</Text>
              <Text style={s.emptyText}>Press Start Scan to detect animals</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.animalCard}>
            <View style={[s.signalDot, { backgroundColor: item.signalColor }]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={s.row}>
                <Text style={s.animalName}>{item.name}</Text>
                <View style={[s.statusBadge, { backgroundColor: item.status === 'IN' ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={{ color: item.status === 'IN' ? '#16a34a' : '#dc2626', fontSize: 12, fontWeight: '700' }}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <View style={s.row}>
                <Text style={s.detail}>📶 {item.rssi} dBm</Text>
                <Text style={s.detail}>  📍 {item.distance}</Text>
                <Text style={[s.detail, { color: item.signalColor }]}>  {item.signal}</Text>
              </View>
              <Text style={s.coords}>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</Text>
            </View>
            <TouchableOpacity style={s.gpsBtn} onPress={() => handleSimulateOut(item)}>
              <Text style={s.gpsBtnText}>📡</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1e40af', padding: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { color: '#bfdbfe', marginTop: 2 },
  scanArea: { alignItems: 'center', paddingVertical: 30, position: 'relative' },
  pulseRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#16a34a' },
  scanBtn: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  scanBtnIcon: { fontSize: 32 },
  scanBtnText: { color: 'white', fontWeight: '700', fontSize: 13, marginTop: 2 },
  scanStatus: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#6b7280', marginTop: 12, fontSize: 15 },
  animalCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  signalDot: { width: 12, height: 12, borderRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  animalName: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  detail: { fontSize: 12, color: '#6b7280' },
  coords: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  gpsBtn: { width: 36, height: 36, backgroundColor: '#eff6ff', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  gpsBtnText: { fontSize: 18 },
});
