// screens/RecordList.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
  ImageBackground,
  SafeAreaView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

const COLUMN_HEADERS = [
  'Sil', 'Düzenle', 'Tür', 'Lokasyon', 'Tarih', 'Boy', 'Ağırlık', 'Kamış', 'Makine', 'Misina', 'Deniz Rengi', 'Ay Durumu', 'Su Sıcaklığı', 'Akıntı'
];

export default function RecordList() {
  const navigation = useNavigation();
  const [fishRecords, setFishRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [fishSpecies, setFishSpecies] = useState([]);
  const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState({ show: false, type: null });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let q = collection(db, 'fish_entries');
      let constraints = [];

      if (selectedSpecies) {
        constraints.push(where('speciesLabel', '==', selectedSpecies));
      }

      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        constraints.push(where('timestamp', '>=', start));
        constraints.push(where('timestamp', '<=', end));
      }

      q = constraints.length > 0 ? query(q, ...constraints) : q;

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

  useEffect(() => {
    fetch('https://api.gbif.org/v1/species/search?taxon_key=204&limit=50')
      .then(res => res.json())
      .then(data => {
        const list = data.results.map(item => ({ label: item.canonicalName, value: item.canonicalName }));
        setFishSpecies(list);
      });
  }, []);

  const handleDelete = async (id) => {
    Alert.alert('Onay', 'Bu kayıt silinecek. Emin misiniz?', [
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
      <View style={styles.actionCellLeftAlign}>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={{ color: 'red' }}>Sil</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionCellLeftAlign}>
        <TouchableOpacity onPress={() => navigation.navigate('EditFish', { id: item.id })}>
          <Text style={{ color: 'green' }}>Düzenle</Text>
        </TouchableOpacity>
      </View>
      {[item.speciesLabel, item.location, new Date(item.dateTime).toLocaleString('tr-TR'), item.length, item.weight, item.rodType, item.reelType, item.lineThickness, item.seaColor, item.moonPhase, item.waterTemp, item.currentStatus].map((value, idx) => (
        <View key={idx} style={styles.cell}><Text style={styles.cellText}>{value}</Text></View>
      ))}
    </View>
  );

  const showPicker = (type) => setDatePickerVisible({ show: true, type });

  const onDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setDatePickerVisible({ show: false, type: null });
      return;
    }
    const { type } = datePickerVisible;
    setDatePickerVisible({ show: false, type: null });
    if (!selectedDate) return;
    if (type === 'start') setStartDate(selectedDate);
    if (type === 'end') setEndDate(selectedDate);
  };

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Kayıt Raporlama</Text>

          <TouchableOpacity style={styles.selectBox} onPress={() => setSpeciesModalVisible(true)}>
            <Text>{selectedSpecies || 'Balık Türü Seçin'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectBox} onPress={() => showPicker('start')}>
            <Text>{startDate ? new Date(startDate).toLocaleDateString('tr-TR') : 'Başlangıç Tarihi Seç'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectBox} onPress={() => showPicker('end')}>
            <Text>{endDate ? new Date(endDate).toLocaleDateString('tr-TR') : 'Bitiş Tarihi Seç'}</Text>
          </TouchableOpacity>

          {datePickerVisible.show && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <ModernButton label="Raporla" onPress={fetchRecords} disabled={loading} />

          <View style={{ marginVertical: 15 }} />

          {loading ? <ActivityIndicator size="large" /> : (
            <ScrollView horizontal>
              <View>
                {renderHeader()}
                {fishRecords.map(renderItemRow)}
              </View>
            </ScrollView>
          )}

          <Modal visible={speciesModalVisible} animationType="slide">
            <View style={{ flex: 1, padding: 20 }}>
              <Text style={styles.header}>Balık Türü Seç</Text>
              <FlatList
                data={fishSpecies}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { setSelectedSpecies(item.value); setSpeciesModalVisible(false); }} style={styles.listItem}>
                    <Text>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
              <ModernButton label="Kapat" onPress={() => setSpeciesModalVisible(false)} />
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 80,
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
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff'
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
  cellText: {
    color: '#fff',
  },
  actionCellLeftAlign: {
    width: 130,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
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
