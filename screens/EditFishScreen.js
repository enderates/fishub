// screens/EditFishScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Platform, 
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal
} from 'react-native';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function EditFishScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const recordId = route.params?.id;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const [lookupOptions, setLookupOptions] = useState([]);
  const [activeLookupKey, setActiveLookupKey] = useState('');
  const [activeSetter, setActiveSetter] = useState(null);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const lookupKeys = {
    gender: 'genderOptions',
    healthStatus: 'healthOptions',
    rodType: 'rodTypes',
    reelType: 'reelTypes',
    lineThickness: 'lineThicknessOptions',
    baitType: 'baitTypes',
    baitColor: 'baitColors',
    baitWeight: 'baitWeights',
    seaColor: 'seaColors',
    moonPhase: 'moonPhases'
  };

  const fetchLookupData = async (key, setter) => {
    const actualKey = lookupKeys[key];
    setActiveLookupKey(key);
    setActiveSetter(() => setter);
    setLoadingLookup(true);
    setLookupModalVisible(true);
    try {
      const docRef = doc(db, 'lookup_tables', actualKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLookupOptions(docSnap.data().values);
      } else {
        setLookupOptions([]);
      }
    } catch (error) {
      console.error(`${key} verisi alınamadı:`, error);
      setLookupOptions([]);
    }
    setLoadingLookup(false);
  };

  useEffect(() => {
    if (recordId) {
      const fetchData = async () => {
        try {
          const docRef = doc(db, 'fish_entries', recordId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRecord(docSnap.data());
          } else {
            console.error('Kayıt bulunamadı');
            Alert.alert('Hata', 'Kayıt bulunamadı.');
          }
        } catch (error) {
          console.error('Kayıt getirilemedi:', error);
          Alert.alert('Hata', 'Kayıt getirilemedi.');
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [recordId]);

  const handleUpdate = async () => {
    if (!recordId || !record) return;
    try {
      await updateDoc(doc(db, 'fish_entries', recordId), record);
      Alert.alert('Başarılı', 'Kayıt güncellendi');
      navigation.goBack();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      Alert.alert('Hata', 'Güncelleme sırasında hata oluştu');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  if (!record) {
    return <Text style={{ marginTop: 50, textAlign: 'center' }}>Kayıt bulunamadı.</Text>;
  }

  const updateField = (key, value) => {
    setRecord(prev => ({ ...prev, [key]: value }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Veriyi Güncelle</Text>

        {Object.entries({
          'Balık Türü': 'speciesLabel',
          'Boy (cm)': 'length',
          'Ağırlık (gr)': 'weight',
          'Cinsiyet': 'gender',
          'Sağlık Durumu': 'healthStatus',
          'Kamış Tipi': 'rodType',
          'Makine Tipi': 'reelType',
          'Misina Kalınlığı': 'lineThickness',
          'Yem Tipi': 'baitType',
          'Yem Rengi': 'baitColor',
          'Yem Gramajı': 'baitWeight',
          'Lokasyon': 'location',
          'Su Sıcaklığı': 'waterTemp',
          'Deniz Rengi': 'seaColor',
          'Akıntı Durumu': 'currentStatus',
          'Tuzluluk Derecesi': 'salinity',
          'Av Zamanı': 'fishingTime',
          'Ay Durumu': 'moonPhase'
        }).map(([label, key], index) => (
          <View key={index} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            {lookupKeys[key] ? (
              <TouchableOpacity style={styles.selectBox} onPress={() => fetchLookupData(key, value => updateField(key, value))}>
                <Text>{record[key] || 'Seçiniz...'}</Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                value={record[key] || ''}
                onChangeText={(value) => updateField(key, value)}
              />
            )}
          </View>
        ))}

        <Button title="Değişiklikleri Kaydet" onPress={handleUpdate} />

        <Modal visible={lookupModalVisible} animationType="slide">
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={styles.title}>{activeLookupKey} Seçimi</Text>
            {loadingLookup ? <ActivityIndicator size="large" /> : (
              <FlatList
                data={lookupOptions}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { activeSetter(item); setLookupModalVisible(false); }} style={styles.listItem}>
                    <Text>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <Button title="Kapat" onPress={() => setLookupModalVisible(false)} />
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 15 },
  label: { marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, padding: 10, borderRadius: 5 },
  selectBox: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 12,
    backgroundColor: '#f0f0f0'
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
});
