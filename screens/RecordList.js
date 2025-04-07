// screens/RecordList.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Button,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const lookupKeys = {
  speciesLabel: 'fishSpecies'
};

const COLUMN_HEADERS = [
  '', '', 'Tür', 'Lokasyon', 'Tarih', 'Ağırlık', 'Boy', 'Cinsiyet', 'Sağlık', 'Kamış', 'Makine', 'Misina',
  'Yem Tipi', 'Yem Rengi', 'Yem Gramajı', 'Su Sıcaklığı', 'Deniz Rengi', 'Akıntı', 'Tuzluluk', 'Av Zamanı', 'Ay Durumu'
];

export default function RecordList() {
  const navigation = useNavigation();
  const [fishRecords, setFishRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [lookupOptions, setLookupOptions] = useState([]);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [activeLookupKey, setActiveLookupKey] = useState('');
  const [activeSetter, setActiveSetter] = useState(null);

  const fetchLookupData = async (key, setter) => {
    const actualKey = lookupKeys[key];
    setActiveLookupKey(key);
    setActiveSetter(() => setter);
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
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let q = collection(db, 'fish_entries');
      const filters = [];
      if (selectedSpecies) {
        filters.push(where('speciesLabel', '==', selectedSpecies));
      }
      if (selectedDate) {
        filters.push(where('dateTime', '>=', new Date(`${selectedDate}T00:00:00`)));
        filters.push(where('dateTime', '<=', new Date(`${selectedDate}T23:59:59`)));
      }
      if (filters.length > 0) {
        q = query(q, ...filters);
      }
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFishRecords(results);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [])
  );

  const handleDelete = async (id) => {
    console.log("Silinecek ID:", id);
    Alert.alert('Onay', `${id} Numaralı kayıt silinecektir. Onaylıyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'fish_entries', id));
            Alert.alert('Başarılı', 'Veri silinmiştir');
            fetchRecords();
          } catch (error) {
            Alert.alert('Hata', 'Veri silinemedi');
            console.error('Silme hatası:', error);
          }
        }
      }
    ]);
  };

  const renderHeader = () => (
    <View style={styles.rowContainer}>
      {COLUMN_HEADERS.map((header, idx) => (
        <View key={idx} style={styles.headerCell}>
          <Text style={styles.headerText}>{header}</Text>
        </View>
      ))}
    </View>
  );

  const renderItemRow = (item) => (
    <View key={item.id} style={styles.rowContainer}>
      <TouchableOpacity style={styles.actionCell} onPress={() => handleDelete(item.id)}>
        <Text style={{ color: 'red' }}>Sil</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionCell} onPress={() => navigation.navigate('EditFish', { id: item.id })}>
        <Text style={{ color: 'blue' }}>Değiştir</Text>
      </TouchableOpacity>
      {[item.speciesLabel, item.location, new Date(item.dateTime).toLocaleString(), item.weight, item.length, item.gender, item.healthStatus, item.rodType, item.reelType, item.lineThickness, item.baitType, item.baitColor, item.baitWeight, item.waterTemp, item.seaColor, item.currentStatus, item.salinity, item.fishingTime, item.moonPhase].map((value, idx) => (
        <View key={idx} style={styles.cell}><Text>{value}</Text></View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Kayıt Raporlama</Text>

      <TouchableOpacity style={styles.selectBox} onPress={() => fetchLookupData('speciesLabel', setSelectedSpecies)}>
        <Text>{selectedSpecies || 'Balık Türü Seçin'}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Tarih (YYYY-MM-DD)"
        value={selectedDate}
        onChangeText={setSelectedDate}
      />

      <Button title="Raporla" onPress={fetchRecords} disabled={loading} />

      {loading ? <ActivityIndicator size="large" /> : (
        <ScrollView horizontal>
          <View>
            {renderHeader()}
            {fishRecords.map(renderItemRow)}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={lookupModalVisible}
        animationType="slide"
        onRequestClose={() => setLookupModalVisible(false)}
      >
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={styles.header}>{activeLookupKey} Seçimi</Text>
          <FlatList
            data={lookupOptions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { activeSetter(item); setLookupModalVisible(false); }} style={styles.listItem}>
                <Text>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <Button title="Kapat" onPress={() => setLookupModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  selectBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 15,
  },
  rowContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  headerCell: {
    width: 130,
    padding: 10,
    backgroundColor: '#eee',
    borderRightWidth: 1,
    borderColor: '#ccc',
  },
  headerText: {
    fontWeight: 'bold',
  },
  cell: {
    width: 130,
    padding: 10,
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  actionCell: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
    padding: 10,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
