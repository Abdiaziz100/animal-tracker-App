import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import Register from '../screens/Register';
import Dashboard from '../screens/Dashboard';
import AddAnimal from '../screens/AddAnimal';
import AnimalDetail from '../screens/AnimalDetail';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LoginScreen">
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} options={{ title: 'Register' }} />
        <Stack.Screen name="Dashboard" component={Dashboard} options={{ headerShown: false }} />
        <Stack.Screen name="AddAnimal" component={AddAnimal} options={{ title: 'Add Animal' }} />
        <Stack.Screen name="AnimalDetail" component={AnimalDetail} options={{ title: 'Animal Details' }} />
        <Stack.Screen name="MapScreen" component={MapScreen} options={{ title: 'Location History' }} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}