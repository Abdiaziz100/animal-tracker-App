import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { getAuthHeader } = useAuth();
  const navigation = useNavigation();

  const fetchAnimals = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/animals`, getAuthHeader());
      setAnimals(res.data);
      // Animals outside geofence are alerts
      const outAnimals = res.data.filter(a => a.status === 'OUT');
      const newAlerts = outAnimals.map(a => ({
        id: a.id,
        title: `⚠️ ${a.name} left the farm!`,
        body: `Last seen at: ${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`,
        time: new Date().toLocaleTimeString(),
        animal: a,
      }));
      setAlerts(newAlerts);
    } catch (e) {}
  }, [getAuthHeader]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnimals();
    setRefreshing(false);
  }, [fetchAnimals]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchAnimals);
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchAnimals, 10000);
    return () => { unsubscribe(); clearInterval(interval); };
  }, [navigation, fetchAnimals]);

  const handleSimulateReturn = async (animal) => {
    try {
      await axios.post(`${API_URL}/update-location`, {
        id: animal.id, lat: -1.29, lng: 36.82
      });
      Alert.alert('✅ Done', `${animal.name} returned to farm`);
      fetchAnimals();
    } catch (e) {
      Alert.alert('Error', 'Failed to update location');
    }
  };

  const totalOut = animals.filter(a => a.status === 'OUT').length;
  const totalIn = animals.filter(a => a.status === 'IN').length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🔔 Alerts</Text>
        <Text style={s.headerSub}>Real-time geofence notifications</Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={[s.statNum, { color: '#16a34a' }]}>{totalIn}</Text>
          <Text style={s.statLabel}>✅ Inside</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: alerts.length > 0 ? '#fee2e2' : '#f3f4f6' }]}>
          <Text style={[s.statNum, { color: alerts.length > 0 ? '#dc2626' : '#6b7280' }]}>{totalOut}</Text>
          <Text style={s.statLabel}>⚠️ Outside</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: '#fef9c3' }]}>
          <Text style={[s.statNum, { color: '#ca8a04' }]}>{alerts.length}</Text>
          <Text style={s.statLabel}>🔔 Alerts</Text>
        </View>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 64 }}>✅</Text>
            <Text style={s.emptyTitle}>All Animals Safe!</Text>
            <Text style={s.emptySub}>No animals outside the geofence</Text>
            <Text style={s.emptyHint}>Pull down to refresh</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.alertCard}>
            <View style={s.alertIcon}>
              <Text style={{ fontSize: 28 }}>⚠️</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.alertTitle}>{item.title}</Text>
              <Text style={s.alertBody}>{item.body}</Text>
              <Text style={s.alertTime}>{item.time}</Text>
              <TouchableOpacity
                style={s.returnBtn}
                onPress={() => handleSimulateReturn(item.animal)}
              >
                <Text style={s.returnBtnText}>📍 Simulate Return to Farm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#dc2626', padding: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSub: { color: '#fecaca', marginTop: 2 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: 'bold' },
  statLabel: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#16a34a', marginTop: 12 },
  emptySub: { color: '#6b7280', marginTop: 6 },
  emptyHint: { color: '#9ca3af', fontSize: 12, marginTop: 20 },
  alertCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', elevation: 3, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  alertIcon: { width: 48, height: 48, backgroundColor: '#fee2e2', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#991b1b' },
  alertBody: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  alertTime: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  returnBtn: { backgroundColor: '#16a34a', padding: 8, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  returnBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
});
