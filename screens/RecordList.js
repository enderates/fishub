// screens/RecordList.js

import React, { useEffect, useState, useCallback, memo } from 'react';
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
  SafeAreaView,
  Pressable,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ModernButton from '../components/ModernButton';

const TABLE_COLUMNS = [
  { key: 'delete', header: 'Sil' },
  { key: 'edit', header: 'Düzenle' },
  { key: 'speciesLabel', header: 'Tür' },
  { key: 'location', header: 'Lokasyon' },
  { key: 'dateTime', header: 'Tarih' },
  { key: 'length', header: 'Boy' },
  { key: 'weight', header: 'Ağırlık' },
  { key: 'rodType', header: 'Kamış' },
  { key: 'baitType', header: 'Yem Tipi' },
  { key: 'baitColor', header: 'Yem Rengi' },
  { key: 'baitWeight', header: 'Yem Ağırlığı' },
  { key: 'reelType', header: 'Makine' },
  { key: 'lineThickness', header: 'Misina' },
  { key: 'seaColor', header: 'Deniz Rengi' },
  { key: 'moonPhase', header: 'Ay Durumu' },
  { key: 'waterTemp', header: 'Su Sıcaklığı' },
  { key: 'currentStatus', header: 'Akıntı' }
];

const SpeciesPickerModal = memo(({ visible, onClose, fishSpecies, onSelect }) => {
  const allSpeciesOption = { label: 'Tüm Balık Türleri', value: '' };
  const allData = [allSpeciesOption, ...fishSpecies];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalHeaderButton} 
              onPress={onClose}
            >
              <Text style={styles.modalHeaderButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Balık Türü Seç</Text>
            
            <TouchableOpacity 
              style={styles.modalHeaderButton} 
              onPress={onClose}
            >
              <Text style={[styles.modalHeaderButtonText, styles.modalHeaderButtonTextConfirm]}>
                Tamam
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <FlatList
              data={allData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }} 
                  style={[
                    styles.modalListItem,
                    item.value === '' && styles.modalListItemHighlight
                  ]}
                >
                  <Text style={[
                    styles.modalListItemText,
                    item.value === '' && styles.modalListItemTextHighlight
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const DatePickerModal = memo(({ visible, onClose, onConfirm, type, initialDate }) => {
  // Geçici tarih state'i
  const [tempDate, setTempDate] = useState(initialDate || new Date());

  // Tarih değiştiğinde geçici state'i güncelle
  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  // Tamam'a basıldığında seçilen tarihi gönder ve modalı kapat
  const handleConfirm = () => {
    onConfirm(tempDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalHeaderButton} 
              onPress={onClose}
            >
              <Text style={styles.modalHeaderButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>
              {type === 'start' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}
            </Text>
            
            <TouchableOpacity 
              style={styles.modalHeaderButton} 
              onPress={handleConfirm}
            >
              <Text style={[styles.modalHeaderButtonText, styles.modalHeaderButtonTextConfirm]}>
                Tamam
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              textColor="#fff"
              themeVariant="dark"
              style={{ backgroundColor: 'transparent' }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

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

      // Balık türü filtresi
      if (selectedSpecies) {
        constraints.push(where('speciesLabel', '==', selectedSpecies));
      }

      // Tarih filtrelerini ayarlayalım
      if (startDate || endDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          constraints.push(where('timestamp', '>=', start));
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          constraints.push(where('timestamp', '<=', end));
        }
      }

      // Sorguyu oluştur ve tarihe göre sırala
      q = constraints.length > 0 
        ? query(q, ...constraints, orderBy('timestamp', 'desc'))
        : query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFishRecords(records);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      Alert.alert('Hata', 'Veriler alınamadı');
    } finally {
      setLoading(false);
    }
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

  const renderTableHeaders = () => (
    <View style={styles.headerRow}>
      {TABLE_COLUMNS.map((column, index) => (
        <View key={index} style={styles.cell}>
          <Text style={styles.headerText}>{column.header}</Text>
        </View>
      ))}
    </View>
  );

  const renderTableRow = (item, index) => (
    <View style={[styles.dataRow, index % 2 === 1 && styles.alternateRow]}>
      <View style={styles.cell}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteText}>Sil</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cell}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditFish', { id: item.id })}
        >
          <Text style={styles.editText}>Düzenle</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.speciesLabel}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.location}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.dateTime}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.length}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.weight}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.rodType}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.baitType}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.baitColor}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.baitWeight}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.reelType}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.lineThickness}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.seaColor}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.moonPhase}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.waterTemp}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.cellText}>{item.currentStatus}</Text>
      </View>
    </View>
  );

  const showPicker = (type) => {
    setDatePickerVisible({ show: true, type });
  };

  const handleDateConfirm = (selectedDate) => {
    const { type } = datePickerVisible;
    
    // Seçilen tarihi UTC'ye çevir ve saat bilgisini sıfırla
    const date = new Date(selectedDate);
    date.setUTCHours(0, 0, 0, 0);

    if (type === 'start') {
      setStartDate(date);
    } else if (type === 'end') {
      setEndDate(date);
    }
    
    setDatePickerVisible({ show: false, type: null });
  };

  // Tarih gösterimi için yardımcı fonksiyon
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  return (
    <ImageBackground source={require('../assets/bg06.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Kayıt Raporlama</Text>

          <TouchableOpacity 
            style={styles.selectBox} 
            onPress={() => setSpeciesModalVisible(true)}
          >
            <Text style={styles.selectBoxText}>
              {selectedSpecies || 'Tüm Balık Türleri'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectBox} 
            onPress={() => showPicker('start')}
          >
            <Text style={styles.selectBoxText}>
              {startDate ? formatDate(startDate) : 'Başlangıç Tarihi Seç'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectBox} 
            onPress={() => showPicker('end')}
          >
            <Text style={styles.selectBoxText}>
              {endDate ? formatDate(endDate) : 'Bitiş Tarihi Seç'}
            </Text>
          </TouchableOpacity>

          <View style={styles.reportButtonContainer}>
            <ModernButton 
              label="Raporla" 
              onPress={fetchRecords} 
              disabled={loading}
              style={styles.customReportButton}
            />
          </View>

          <View style={{ marginVertical: 15 }} />

          {loading ? (
            <ActivityIndicator size="large" color="#6200ee" />
          ) : (
            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {renderTableHeaders()}
                  {fishRecords.map((item, index) => (
                    <View key={item.id}>
                      {renderTableRow(item, index)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <SpeciesPickerModal 
            visible={speciesModalVisible}
            onClose={() => setSpeciesModalVisible(false)}
            fishSpecies={fishSpecies}
            onSelect={(value) => {
              setSelectedSpecies(value);
              setSpeciesModalVisible(false);
            }}
          />

          <DatePickerModal
            visible={datePickerVisible.show}
            onClose={() => setDatePickerVisible({ show: false, type: null })}
            onConfirm={handleDateConfirm}
            type={datePickerVisible.type}
            initialDate={datePickerVisible.type === 'start' ? startDate : endDate}
          />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectBoxText: {
    color: '#fff',
    fontSize: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    minHeight: 35,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  alternateRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cell: {
    flex: 1,
    minWidth: 120,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerText: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cellText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deleteText: {
    color: '#ff0000',
    fontWeight: '500',
  },
  editText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  tableContainer: {
    marginTop: 15,
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    borderRadius: 14,
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderButton: {
    padding: 8,
  },
  modalHeaderButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalHeaderButtonTextConfirm: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  modalBody: {
    maxHeight: '80%',
  },
  modalListItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalListItemText: {
    color: '#fff',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 235, 238, 0.7)',
  },
  editButton: {
    backgroundColor: 'rgba(232, 245, 233, 0.7)',
  },
  modalListItemHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalListItemTextHighlight: {
    fontWeight: '600',
    color: '#fff',
  },
  reportButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  customReportButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 0,
    width: 'auto',
    minWidth: 0,
  },
});
