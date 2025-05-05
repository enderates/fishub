// EditRecord.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { db } from '../firebaseConfig';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

export default function EditRecord({ route, navigation }) {
  const { recordData } = route.params;
  const [record, setRecord] = useState(recordData);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'fish_entries', recordData.id);
      await updateDoc(docRef, {
        speciesLabel: record.speciesLabel,
        species: record.species,
        location: record.location,
        timestamp: record.dateTime,
        length: record.length,
        weight: record.weight,
        rodType: record.rodType,
        baitType: record.baitType,
        baitColor: record.baitColor,
        baitWeight: record.baitWeight,
        reelType: record.reelType,
        lineThickness: record.lineThickness,
        seaColor: record.seaColor,
        moonPhase: record.moonPhase,
        waterTemp: record.waterTemp,
        currentStatus: record.currentStatus
      });
      Alert.alert('Başarılı', 'Kayıt güncellendi');
      navigation.goBack();
    } catch (err) {
      console.error('Güncelleme hatası:', err);
      Alert.alert('Hata', 'Güncelleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kaydı Düzenle</Text>
      <Text style={styles.label}>Balık Türü</Text>
      <TextInput
        style={styles.input}
        value={record.speciesLabel}
        onChangeText={(text) => setRecord({ ...record, speciesLabel: text })}
      />
      <Text style={styles.label}>Lokasyon</Text>
      <TextInput
        style={styles.input}
        value={record.location}
        onChangeText={(text) => setRecord({ ...record, location: text })}
      />
      <Text style={styles.label}>Boy (cm)</Text>
      <TextInput
        style={styles.input}
        value={record.length?.toString()}
        keyboardType="numeric"
        onChangeText={(text) => setRecord({ ...record, length: text })}
      />
      <Text style={styles.label}>Ağırlık (gr)</Text>
      <TextInput
        style={styles.input}
        value={record.weight?.toString()}
        keyboardType="numeric"
        onChangeText={(text) => setRecord({ ...record, weight: text })}
      />
      <View style={styles.buttonContainer}>
        <Button 
          title="Güncelle" 
          onPress={handleUpdate} 
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
  },
});