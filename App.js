// App.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FishEntryScreen from './screens/FishEntryScreen';
import MapPickerScreen from './screens/MapPickerScreen';
import RecordList from './screens/RecordList';          // EKLENDİ
import EditRecord from './screens/EditRecord';          // EKLENDİ
import EditFishScreen from './screens/EditFishScreen';  // EKLENDİ

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="FishEntry" component={FishEntryScreen} />
        <Stack.Screen
          name="MapPickerScreen"
          component={MapPickerScreen}
          options={{ title: 'Harita Üzerinden Seç' }}
        />
        <Stack.Screen
          name="RecordList"
          component={RecordList}
          options={{ title: 'Kayıt Listesi' }}
        />
        <Stack.Screen
          name="EditRecord"
          component={EditRecord}
          options={{ title: 'Kaydı Düzenle' }}
        />
        <Stack.Screen
          name="EditFish"
          component={EditFishScreen}
          options={{ title: 'Veriyi Güncelle' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
