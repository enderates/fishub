// EditRecord.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { db } from '../firebaseConfig';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

export default function EditRecord({ route, navigation }) {
  const { id } = route.params;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRecord = async () => {
    try {
      const docRef = doc(db, 'fish_entries', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRecord(docSnap.data());
      } else {
        Alert.alert('Hata', 'Kayıt bulunamadı');
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Hata', 'Veri çekilirken sorun oluştu');
      navigation.goBack();
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecord();
  }, []);

  const handleUpdate = async () => {
    try {
      const docRef = doc(db, 'fish_entries', id);
      await updateDoc(docRef, record);
      Alert.alert('Başarılı', 'Kayıt güncellendi');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Hata', 'Güncelleme başarısız');
    }
  };

  if (loading || !record) {
    return (
      <View style={styles.loader}><ActivityIndicator size="large" /></View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Kaydı Düzenle</Text>
      <Text style={styles.label}>Balık Türü</Text>
      <TextInput
        style={styles.input}
        value={record.speciesLabel}
        onChangeText={(text) => setRecord({ ...record, speciesLabel: text })}
      />
      <Text style={styles.label}>Ağırlık (gr)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={record.weight}
        onChangeText={(text) => setRecord({ ...record, weight: text })}
      />
      <Text style={styles.label}>Boy (cm)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={record.length}
        onChangeText={(text) => setRecord({ ...record, length: text })}
      />
      <Button title="Güncelle" onPress={handleUpdate} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontWeight: 'bold', marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginTop: 5 },
});