import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, FlatList, useNavigation } from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API_URL } from '../config';
const FARM_CENTER = { lat: -1.29, lng: 36.82 };
const GEOFENCE_RADIUS = 0.05;

export default function MapScreen({ navigation }) {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAuthHeader } = useAuth();

  const fetchAnimals = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/animals`, getAuthHeader());
      setAnimals(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load animal locations');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchAnimals);
    return unsubscribe;
  }, [navigation, fetchAnimals]);

  const getDistanceFromFarm = (lat, lng) => {
    const latDiff = Math.abs(lat - FARM_CENTER.lat);
    const lngDiff = Math.abs(lng - FARM_CENTER.lng);
    const distDeg = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    return (distDeg * 111).toFixed(2);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ color: '#666', marginTop: 12 }}>Loading locations...</Text>
      </View>
    );
  }

  const inside = animals.filter(a => a.status === 'IN').length;
  const outside = animals.filter(a => a.status === 'OUT').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#16a34a', padding: 16, paddingTop: 12 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>📍 Animal Locations</Text>
        <Text style={{ color: '#d1fae5', fontSize: 13, marginTop: 2 }}>
          Farm Center: {FARM_CENTER.lat}, {FARM_CENTER.lng} | Radius: ~5km
        </Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: '#dcfce7', padding: 12, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#16a34a' }}>{inside}</Text>
          <Text style={{ color: '#15803d', fontSize: 12 }}>✅ Inside Farm</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#fee2e2', padding: 12, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>{outside}</Text>
          <Text style={{ color: '#b91c1c', fontSize: 12 }}>⚠️ Outside Farm</Text>
        </View>
      </View>

      {/* Animal List */}
      <FlatList
        data={animals}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        refreshing={loading}
        onRefresh={fetchAnimals}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 48 }}>🐄</Text>
            <Text style={{ color: '#666', marginTop: 8 }}>No animals tracked yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: item.status === 'IN' ? '#dcfce7' : '#fee2e2',
              justifyContent: 'center', alignItems: 'center', marginRight: 12
            }}>
              <Text style={{ fontSize: 24 }}>{item.status === 'IN' ? '🐄' : '⚠️'}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937' }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                📍 {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                🏠 {getDistanceFromFarm(item.lat, item.lng)} km from farm center
              </Text>
            </View>

            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
              backgroundColor: item.status === 'IN' ? '#dcfce7' : '#fee2e2'
            }}>
              <Text style={{
                fontWeight: 'bold', fontSize: 12,
                color: item.status === 'IN' ? '#16a34a' : '#dc2626'
              }}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
