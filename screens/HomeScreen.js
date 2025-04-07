// HomeScreen.js

import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hoş Geldin Fishub!</Text>
      <View style={styles.buttonGroup}>
        <View style={styles.buttonContainer}>
          <Button
            title="Veri Giriş Ekranına Git"
            onPress={() => navigation.navigate('FishEntry')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="Raporla / Sil / Değiştir"
            onPress={() => navigation.navigate('RecordList')}
            color="#007BFF"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 24, marginBottom: 30, fontWeight: 'bold' },
  buttonGroup: { width: '100%' },
  buttonContainer: { marginVertical: 10 },
});
