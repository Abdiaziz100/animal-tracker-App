import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import Dashboard from './screens/Dashboard';
import ScanScreen from './screens/ScanScreen';
import AlertsScreen from './screens/AlertsScreen';
import ReportScreen from './screens/ReportScreen';
import GeofenceScreen from './screens/GeofenceScreen';
import DeviceSimulator from './screens/DeviceSimulator';
import AddAnimal from './screens/AddAnimal';
import AnimalDetail from './screens/AnimalDetail';
import SettingsScreen from './screens/SettingsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home' : 'home-outline',
            Scan: focused ? 'radio' : 'radio-outline',
            Alerts: focused ? 'notifications' : 'notifications-outline',
            Report: focused ? 'document-text' : 'document-text-outline',
            Geofence: focused ? 'location' : 'location-outline',
            Device: focused ? 'phone-portrait' : 'phone-portrait-outline',
            'Add Animal': focused ? 'add-circle' : 'add-circle-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#16a34a' },
        headerTintColor: 'white',
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ headerStyle: { backgroundColor: '#1e40af' } }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ headerStyle: { backgroundColor: '#dc2626' } }} />
      <Tab.Screen name="Report" component={ReportScreen} options={{ headerStyle: { backgroundColor: '#1e3a5f' } }} />
      <Tab.Screen name="Geofence" component={GeofenceScreen} options={{ headerStyle: { backgroundColor: '#16a34a' } }} />
      <Tab.Screen name="Device" component={DeviceSimulator} options={{ headerStyle: { backgroundColor: '#7c3aed' } }} />
      <Tab.Screen name="Add Animal" component={AddAnimal} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#16a34a' }, headerTintColor: 'white' }}>
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="AnimalDetail" component={AnimalDetail} options={{ title: 'Animal Detail' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RootNavigator />
      </NotificationProvider>
    </AuthProvider>
  );
}
