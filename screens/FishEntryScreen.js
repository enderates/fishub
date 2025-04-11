// screens/FishEntryScreen.js

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
import { Picker } from '@react-native-picker/picker';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function FishEntryScreen() {
  const navigation = useNavigation();

  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [rodType, setRodType] = useState('');
  const [reelType, setReelType] = useState('');
  const [lineThickness, setLineThickness] = useState('');
  const [seaColor, setSeaColor] = useState('');
  const [moonPhase, setMoonPhase] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [fishSpecies, setFishSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const lookupKeys = {
    rodType: 'rodTypes',
    reelType: 'reelTypes',
    lineThickness: 'lineThicknessOptions',
    seaColor: 'seaColors',
    moonPhase: 'moonPhases',
    currentStatus: 'currentStatuses'
  };

  const [lookupOptions, setLookupOptions] = useState([]);
  const [activeLookupKey, setActiveLookupKey] = useState('');
  const [activeSetter, setActiveSetter] = useState(null);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);

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
    fetch('https://api.gbif.org/v1/species/search?taxon_key=204&limit=50')
      .then(response => response.json())
      .then(data => {
        const speciesList = data.results.map(item => ({
          label: item.canonicalName,
          value: item.key.toString(),
        }));
        setFishSpecies(speciesList);
        setLoadingSpecies(false);
      })
      .catch(error => {
        console.error('Balık türleri alınamadı:', error);
        setLoadingSpecies(false);
      });
  }, []);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = async () => {
    if (!selectedSpecies || !weight || !selectedLabel || !location) {
      showAlert("Eksik Bilgi", "Zorunlu alanları doldurunuz.");
      return;
    }

    const combinedDateTime = Platform.OS === 'web'
      ? new Date(`${webDate}T${webTime}`)
      : dateTime;

    try {
      await addDoc(collection(db, "fish_entries"), {
        species: selectedSpecies,
        speciesLabel: selectedLabel,
        length,
        weight,
        rodType,
        reelType,
        lineThickness,
        seaColor,
        moonPhase,
        waterTemp,
        currentStatus,
        location,
        dateTime: combinedDateTime.toString(),
        timestamp: new Date(),
      });

      showAlert("Başarılı", "Kayıt başarıyla eklendi.");
      setSelectedSpecies('');
      setSelectedLabel('');
      setLength('');
      setWeight('');
      setRodType('');
      setReelType('');
      setLineThickness('');
      setSeaColor('');
      setMoonPhase('');
      setWaterTemp('');
      setCurrentStatus('');
      setLocation('');
      setDateTime(new Date());
      setWebDate('');
      setWebTime('');
    } catch (error) {
      console.error("Firestore hata:", error);
      showAlert("Hata", "Kayıt sırasında bir hata oluştu.");
    }
  };

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={styles.background} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Balık Girişi</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Balık Türü</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => setModalVisible(true)}>
                <Text style={styles.selectBoxText}>{selectedLabel || 'Balık türü seçin...'}</Text>
              </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
              <View style={{ flex: 1, padding: 20 }}>
                <Text style={styles.title}>Balık Türü Seçimi</Text>
                {loadingSpecies ? <ActivityIndicator size="large" /> : (
                  <FlatList
                    data={fishSpecies}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => { setSelectedSpecies(item.value); setSelectedLabel(item.label); setModalVisible(false); }} style={styles.listItem}>
                        <Text>{item.label}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
                <ModernButton label="Kapat" onPress={() => setModalVisible(false)} />
              </View>
            </Modal>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lokasyon</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => navigation.navigate('MapPickerScreen', {
                onLocationSelected: (coords) => {
                  const formatted = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
                  setLocation(formatted);
                },
              })}>
                <Text style={styles.selectBoxText}>{location || 'Konum seçin...'}</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS !== 'web' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tarih & Saat</Text>
                <View style={styles.selectBox}>
                  <DateTimePicker
                    value={dateTime}
                    onChange={(event, selectedDate) => setDateTime(selectedDate || dateTime)}
                    mode="datetime"
                    textColor="#fff"
                    style={{ width: '100%' }}
                  />
                </View>
              </View>
            )}

            {[{
              label: 'Boy (cm)', value: length, setter: setLength
            }, {
              label: 'Ağırlık (gr)', value: weight, setter: setWeight
            }, {
              label: 'Su Sıcaklığı', value: waterTemp, setter: setWaterTemp
            }].map(({ label, value, setter }, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.selectBoxSmall}>
                  <Picker
                    selectedValue={value}
                    onValueChange={(val) => setter(val)}
                    itemStyle={styles.pickerItem}
                    style={styles.picker}
                    dropdownIconColor="#fff"
                  >
                    {[...Array(301).keys()].map(n => (
                      <Picker.Item key={n} label={`${n}`} value={`${n}`} />
                    ))}
                  </Picker>
                </View>
              </View>
            ))}

            {[{
              label: 'Kamış Tipi', value: rodType, setter: setRodType, key: 'rodType'
            }, {
              label: 'Makine Tipi', value: reelType, setter: setReelType, key: 'reelType'
            }, {
              label: 'Misina Kalınlığı', value: lineThickness, setter: setLineThickness, key: 'lineThickness'
            }, {
              label: 'Denizin Rengi', value: seaColor, setter: setSeaColor, key: 'seaColor'
            }, {
              label: 'Ayın Durumu', value: moonPhase, setter: setMoonPhase, key: 'moonPhase'
            }, {
              label: 'Akıntı Durumu', value: currentStatus, setter: setCurrentStatus, key: 'currentStatus'
            }].map(({ label, value, setter, key }, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => fetchLookupData(key, setter)}>
                  <Text style={styles.selectBoxText}>{value || 'Seçiniz...'}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <ModernButton label="Kaydet" onPress={handleSave} />

            <Modal
              visible={lookupModalVisible}
              animationType="slide"
              transparent={false}
              presentationStyle="pageSheet"
              onRequestClose={() => setLookupModalVisible(false)}
            >
              <View style={{ flex: 1, padding: 20 }}>
                <Text style={styles.title}>{activeLookupKey} Seçimi</Text>
                {loadingLookup ? <ActivityIndicator size="large" /> : (
                  <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    data={lookupOptions}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { activeSetter(item); setLookupModalVisible(false); }}
                        style={styles.listItem}
                      >
                        <Text>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
                <ModernButton label="Kapat" onPress={() => setLookupModalVisible(false)} />
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff'
  },
  inputGroup: {
    marginBottom: 15
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
    color: '#fff'
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff'
  },
  selectBox: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  selectBoxSmall: {
    borderWidth: 1,
    borderRadius: 5,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  selectBoxText: {
    color: '#fff'
  },
  picker: {
    height: 40,
    color: '#fff',
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 14,
    color: '#fff',
    height: 44,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButtonContainer: {
    marginTop: Platform.OS === 'android' ? 50 : 60,
    marginLeft: 20,
    position: 'absolute',
    zIndex: 999,
  },
  backText: {
    color: '#fff',
    fontSize: 18,
  },
});
