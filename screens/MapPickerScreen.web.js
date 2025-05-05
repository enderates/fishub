// screens/MapPickerScreen.web.js

import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MapPickerScreen() {
  const navigation = useNavigation();

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.alert("Harita seçimi şu anda sadece mobil cihazlarda desteklenmektedir.");
    } else {
      Alert.alert("Uyarı", "Harita seçimi şu anda sadece mobil cihazlarda desteklenmektedir.");
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.message}>Bu özellik web ortamında desteklenmiyor.</Text>
      <Button title="Geri Dön" onPress={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  message: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
});
