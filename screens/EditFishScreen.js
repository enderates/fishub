// screens/EditFishScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  ImageBackground,
  SafeAreaView
} from 'react-native';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

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
  const [fishSpecies, setFishSpecies] = useState([]);
  const [speciesModalVisible, setSpeciesModalVisible] = useState(false);

  const lookupKeys = {
    rodType: 'rodTypes',
    reelType: 'reelTypes',
    lineThickness: 'lineThicknessOptions',
    seaColor: 'seaColors',
    moonPhase: 'moonPhases',
    currentStatus: 'currentStatuses',
    baitType: 'baitTypes',
    baitColor: 'baitColors',
    baitWeight: 'baitWeights'
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

    fetch('https://api.gbif.org/v1/species/search?taxon_key=204&limit=50')
      .then(response => response.json())
      .then(data => {
        const speciesList = data.results.map(item => ({
          label: item.canonicalName,
          value: item.key.toString(),
        }));
        setFishSpecies(speciesList);
      })
      .catch(error => console.error('Balık türleri alınamadı:', error));
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

  const updateField = (key, value) => {
    setRecord(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  if (!record) return <Text style={{ marginTop: 50, textAlign: 'center' }}>Kayıt bulunamadı.</Text>;

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Veriyi Güncelle</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Balık Türü</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setSpeciesModalVisible(true)}>
                <Text>{record.speciesLabel || 'Balık türü seçin...'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lokasyon</Text>
              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => navigation.navigate('MapPickerScreen', {
                  onLocationSelected: (coords) => {
                    const formatted = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
                    updateField('location', formatted);
                  },
                })}
              >
                <Text>{record.location || 'Konum seçin...'}</Text>
              </TouchableOpacity>
            </View>

            {[{
              label: 'Boy (cm)', key: 'length'
            }, {
              label: 'Ağırlık (gr)', key: 'weight'
            }, {
              label: 'Su Sıcaklığı', key: 'waterTemp'
            }].map(({ label, key }, idx) => (
              <View key={idx} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={record[key] || ''}
                  onChangeText={(val) => updateField(key, val)}
                />
              </View>
            ))}

            {[{
              label: 'Kamış Tipi', key: 'rodType'
            }, {
              label: 'Makine Tipi', key: 'reelType'
            }, {
              label: 'Misina Kalınlığı', key: 'lineThickness'
            }, {
              label: 'Denizin Rengi', key: 'seaColor'
            }, {
              label: 'Ayın Durumu', key: 'moonPhase'
            }, {
              label: 'Akıntı Durumu', key: 'currentStatus'
            }, {
              label: 'Yem Tipi', key: 'baitType'
            }, {
              label: 'Yem Rengi', key: 'baitColor'
            }, {
              label: 'Yem Ağırlığı', key: 'baitWeight'
            }].map(({ label, key }, idx) => (
              <View key={idx} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => fetchLookupData(key, val => updateField(key, val))}
                >
                  <Text>{record[key] || 'Seçiniz...'}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <ModernButton label="Değişiklikleri Kaydet" onPress={handleUpdate} />

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
                <ModernButton label="Kapat" onPress={() => setLookupModalVisible(false)} />
              </View>
            </Modal>

            <Modal visible={speciesModalVisible} animationType="slide">
              <View style={{ flex: 1, padding: 20 }}>
                <Text style={styles.title}>Balık Türü Seçimi</Text>
                <FlatList
                  data={fishSpecies}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => { updateField('species', item.value); updateField('speciesLabel', item.label); setSpeciesModalVisible(false); }} style={styles.listItem}>
                      <Text>{item.label}</Text>
                    </TouchableOpacity>
                  )}
                />
                <ModernButton label="Kapat" onPress={() => setSpeciesModalVisible(false)} />
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 80 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#fff' },
  inputGroup: { marginBottom: 15 },
  label: { marginBottom: 5, fontWeight: 'bold', color: '#fff' },
  input: { borderWidth: 1, padding: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' },
  selectBox: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff'
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButtonContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 999,
  },
  backText: {
    color: '#fff',
    fontSize: 18,
  },
});
