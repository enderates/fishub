import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import FishEntryScreen from './screens/FishEntryScreen';
import MapPickerScreen from './screens/MapPickerScreen';
import RecordList from './screens/RecordList';
import EditRecord from './screens/EditRecord';
import EditFishScreen from './screens/EditFishScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="FishEntry" component={FishEntryScreen} />
        <Stack.Screen name="MapPickerScreen" component={MapPickerScreen} />
        <Stack.Screen name="RecordList" component={RecordList} />
        <Stack.Screen name="EditRecord" component={EditRecord} />
        <Stack.Screen name="EditFish" component={EditFishScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
