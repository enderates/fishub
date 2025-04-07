// screens/FishEntryScreen.js

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
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function FishEntryScreen() {
  const navigation = useNavigation();

  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const [rodType, setRodType] = useState('');
  const [reelType, setReelType] = useState('');
  const [lineThickness, setLineThickness] = useState('');
  const [baitType, setBaitType] = useState('');
  const [baitColor, setBaitColor] = useState('');
  const [baitWeight, setBaitWeight] = useState('');
  const [location, setLocation] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [seaColor, setSeaColor] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [salinity, setSalinity] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [fishingTime, setFishingTime] = useState('');
  const [moonPhase, setMoonPhase] = useState('');

  const [fishSpecies, setFishSpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

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
        const values = docSnap.data().values;
        setLookupOptions(values);
      } else {
        console.log(`${key} verisi bulunamadı.`);
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
    const errorMessages = [];
    if (!selectedSpecies) errorMessages.push("Balık türü seçilmemiş.");
    if (!weight) errorMessages.push("Ağırlık bilgisi girilmemiş.");
    if (!selectedLabel) errorMessages.push("Balık türü etiketi eksik.");
    if (!location) errorMessages.push("Lokasyon seçilmemiş.");

    if (errorMessages.length > 0) {
      showAlert("Eksik Bilgi", errorMessages.join("\n"));
      return;
    }

    const combinedDateTime = Platform.OS === 'web'
      ? new Date(`${webDate}T${webTime}`)
      : dateTime;

    try {
      const docRef = await addDoc(collection(db, "fish_entries"), {
        species: selectedSpecies,
        speciesLabel: selectedLabel,
        length,
        weight,
        gender,
        healthStatus,
        rodType,
        reelType,
        lineThickness,
        baitType,
        baitColor,
        baitWeight,
        location,
        waterTemp,
        seaColor,
        currentStatus,
        salinity,
        dateTime: combinedDateTime.toString(),
        fishingTime,
        moonPhase,
        timestamp: new Date(),
      });

      if (docRef.id) {
        showAlert("Başarılı", "Kayıt başarıyla eklendi.");
        setSelectedSpecies('');
        setSelectedLabel('');
        setLength('');
        setWeight('');
        setGender('');
        setHealthStatus('');
        setRodType('');
        setReelType('');
        setLineThickness('');
        setBaitType('');
        setBaitColor('');
        setBaitWeight('');
        setLocation('');
        setWaterTemp('');
        setSeaColor('');
        setCurrentStatus('');
        setSalinity('');
        setDateTime(new Date());
        setWebDate('');
        setWebTime('');
        setFishingTime('');
        setMoonPhase('');
      } else {
        showAlert("Hata", "Kayıt eklenemedi. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Firestore hata:", error);
      showAlert("Hata", "Kayıt sırasında bir hata oluştu.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Balık Girişi</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Balık Türü</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setModalVisible(true)}>
            <Text>{selectedLabel || 'Balık türü seçin...'}</Text>
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
            <Button title="Kapat" onPress={() => setModalVisible(false)} />
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
            <Text>{location || 'Konum seçin...'}</Text>
          </TouchableOpacity>
        </View>

        <View style={Platform.OS === 'web' ? styles.inputGroup : styles.dateBox}>
          <Text style={styles.label}>Tarih & Saat</Text>
          {Platform.OS === 'web' ? (
            <>
              <TextInput
                style={styles.input}
                value={webDate}
                onChangeText={setWebDate}
                placeholder="YYYY-MM-DD"
              />
              <TextInput
                style={styles.input}
                value={webTime}
                onChangeText={setWebTime}
                placeholder="HH:mm"
              />
            </>
          ) : (
            <DateTimePicker
              value={dateTime}
              onChange={(event, selectedDate) => setDateTime(selectedDate || dateTime)}
              mode="datetime"
              style={{ backgroundColor: 'white' }}
            />
          )}
        </View>

        {[{
          label: 'Cinsiyet', value: gender, setter: setGender, key: 'gender'
        }, {
          label: 'Sağlık Durumu', value: healthStatus, setter: setHealthStatus, key: 'healthStatus'
        }, {
          label: 'Kamış Tipi', value: rodType, setter: setRodType, key: 'rodType'
        }, {
          label: 'Makine Tipi', value: reelType, setter: setReelType, key: 'reelType'
        }, {
          label: 'Misina Kalınlığı', value: lineThickness, setter: setLineThickness, key: 'lineThickness'
        }, {
          label: 'Yem Tipi', value: baitType, setter: setBaitType, key: 'baitType'
        }, {
          label: 'Yem Rengi', value: baitColor, setter: setBaitColor, key: 'baitColor'
        }, {
          label: 'Yem Gramajı', value: baitWeight, setter: setBaitWeight, key: 'baitWeight'
        }, {
          label: 'Deniz Rengi', value: seaColor, setter: setSeaColor, key: 'seaColor'
        }, {
          label: 'Ay Durumu', value: moonPhase, setter: setMoonPhase, key: 'moonPhase'
        }].map(({ label, value, setter, key }, index) => (
          <View key={index} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => fetchLookupData(key, setter)}>
              <Text>{value || 'Seçiniz...'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {[{
          label: 'Boy (cm)', state: length, setter: setLength
        }, {
          label: 'Ağırlık (gr)', state: weight, setter: setWeight
        }, {
          label: 'Su Sıcaklığı', state: waterTemp, setter: setWaterTemp
        }, {
          label: 'Akıntı Durumu', state: currentStatus, setter: setCurrentStatus
        }, {
          label: 'Tuzluluk Derecesi', state: salinity, setter: setSalinity
        }, {
          label: 'Av Zamanı', state: fishingTime, setter: setFishingTime
        }].map(({ label, state, setter }, index) => (
          <View key={index} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={setter}
            />
          </View>
        ))}

        <Button title="Kaydet" onPress={handleSave} />

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
            <Button title="Kapat" onPress={() => setLookupModalVisible(false)} />
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center' },
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
  dateBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#f9f9f9'
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
});
