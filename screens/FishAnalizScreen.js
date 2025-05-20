import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Image, ActivityIndicator, Alert, FlatList } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModernButton from '../components/ModernButton';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import DropDownPicker from 'react-native-dropdown-picker';

export default function FishAnalizScreen() {
  const navigation = useNavigation();
  const [analizType, setAnalizType] = useState('tarih');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Tarih Aralığına göre', value: 'tarih', icon: () => <Text style={styles.dropdownIcon}>📅</Text> },
    { label: 'Lokasyona Göre', value: 'lokasyon', icon: () => <Text style={styles.dropdownIcon}>📍</Text> },
    { label: 'Balık Türüne Göre', value: 'tur', icon: () => <Text style={styles.dropdownIcon}>🐟</Text>, disabled: true },
    { label: 'Yöreye Göre', value: 'yore', icon: () => <Text style={styles.dropdownIcon}>🏙️</Text> },
  ]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [fishData, setFishData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [regionGroupedData, setRegionGroupedData] = useState({});
  const [showRegionList, setShowRegionList] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [viewMode, setViewMode] = useState('harita');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [initialMapRegion, setInitialMapRegion] = useState({
    latitude: 41.0,
    longitude: 29.0,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const mapRef = useRef(null);

  const handleAnalizTypeChange = (value) => {
    setAnalizType(value);
    setShowReport(false);
    setSelectedLocation(null);
    setSelectedRegion(null);
    setShowRegionList(false);
    setViewMode('harita');
    setRegionGroupedData({});
    setShowLocationPicker(false);
  };

  const handleSelectLocation = () => {
    navigation.navigate('MapPicker', {
      onLocationSelected: (coords) => {
        setSelectedLocation(coords);
        // Determine the city for the selected location
        const regionInfo = determineRegion(coords.latitude, coords.longitude);
        if (regionInfo.city !== "Bilinmiyor") {
          setSelectedRegion(`Türkiye - ${regionInfo.city}`);
        }
      }
    });
  };

  const groupDataByRegion = (data) => {
    const groupedByCity = {};
    
    console.log("Grouping data by region, total records:", data.length);
    
    data.forEach(record => {
      console.log(`Record ${record.id}: Lat=${record.locationLatitude}, Lng=${record.locationLongitude}, Type=${record.species}`);
      
      const regionInfo = determineRegion(record.locationLatitude, record.locationLongitude);
      const cityKey = regionInfo.city || "Bilinmiyor";
      
      console.log(`Record ${record.id} assigned to city: ${cityKey}`);
      
      if (!groupedByCity[cityKey]) {
        groupedByCity[cityKey] = [];
      }
      
      groupedByCity[cityKey].push(record);
    });
    
    console.log("City groups:", Object.keys(groupedByCity).map(city => ({
      city,
      count: groupedByCity[city].length,
      recordIds: groupedByCity[city].map(r => r.id).join(", ")
    })));
    
    const formattedGroups = {};
    Object.keys(groupedByCity).forEach(city => {
      const groupKey = `Türkiye - ${city}`;
      formattedGroups[groupKey] = groupedByCity[city];
    });
    
    console.log("Final groups:", Object.keys(formattedGroups).map(key => ({
      key,
      count: formattedGroups[key].length
    })));
    
    setRegionGroupedData(formattedGroups);
    setShowRegionList(true);
  };
  
  const determineRegion = (lat, lng) => {
    lat = typeof lat === 'string' ? parseFloat(lat) : lat;
    lng = typeof lng === 'string' ? parseFloat(lng) : lng;
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.log("Invalid coordinates:", lat, lng);
      return { name: "Geçersiz Koordinat", country: "Bilinmiyor", city: "Bilinmiyor" };
    }
    
    console.log(`Determining region for coordinates: ${lat}, ${lng}`);
    
    const cities = [
      { 
        name: "İstanbul", 
        center: { lat: 41.0082, lng: 28.9784 },
        radius: 0.5  // Yaklaşık 50km
      },
      { 
        name: "İzmir", 
        center: { lat: 38.4192, lng: 27.1287 },
        radius: 0.4
      },
      { 
        name: "Ankara", 
        center: { lat: 39.9334, lng: 32.8597 },
        radius: 0.5
      },
      { 
        name: "Antalya", 
        center: { lat: 36.8969, lng: 30.7133 },
        radius: 0.4
      },
      { 
        name: "Mersin", 
        center: { lat: 36.8121, lng: 34.6412 },
        radius: 0.4
      },
      { 
        name: "Silifke", 
        center: { lat: 36.3774, lng: 33.9371 },
        radius: 0.2
      },
      { 
        name: "Adana", 
        center: { lat: 37.0000, lng: 35.3213 },
        radius: 0.4
      },
      { 
        name: "Muğla", 
        center: { lat: 37.2153, lng: 28.3636 },
        radius: 0.4
      },
      { 
        name: "Aydın", 
        center: { lat: 37.8560, lng: 27.8416 },
        radius: 0.3
      },
      { 
        name: "Isparta", 
        center: { lat: 37.7626, lng: 30.5537 },
        radius: 0.3
      },
      { 
        name: "Kocaeli", 
        center: { lat: 40.7654, lng: 29.9408 },
        radius: 0.3
      },
      { 
        name: "Tekirdağ", 
        center: { lat: 40.9781, lng: 27.5126 },
        radius: 0.3
      }
    ];
    
    let closestCity = null;
    let minDistance = Number.MAX_VALUE;
    
    for (const city of cities) {
      const distance = Math.sqrt(
        Math.pow(lat - city.center.lat, 2) + 
        Math.pow(lng - city.center.lng, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }
    
    console.log(`No exact match. Closest city: ${closestCity?.name}, distance: ${minDistance.toFixed(4)}`);
    
    if (lat >= 40.0 && lat <= 42.0 && lng >= 25.0 && lng <= 30.0 && minDistance > 0.5) {
      return { name: "Marmara Denizi", country: "Türkiye", city: "Marmara Bölgesi" };
    } else if (lat >= 38.0 && lat <= 40.5 && lng >= 25.0 && lng <= 27.5 && minDistance > 0.5) {
      return { name: "Ege Denizi", country: "Türkiye", city: "Ege Bölgesi" };
    } else if (lat >= 35.5 && lat <= 38.0 && lng >= 27.0 && lng <= 33.0 && minDistance > 0.5) {
      return { name: "Akdeniz", country: "Türkiye", city: "Akdeniz Bölgesi" };
    } else if (lat >= 41.0 && lat <= 43.0 && lng >= 30.0 && lng <= 35.0 && minDistance > 0.5) {
      return { name: "Karadeniz", country: "Türkiye", city: "Karadeniz Bölgesi" };
    }
    
    return { 
      name: `${closestCity.name} Çevresi`, 
      country: "Türkiye", 
      city: closestCity.name 
    };
  };

  const fetchFishData = async () => {
    if (analizType === 'tarih' && !startDate && !endDate) {
      alert('Lütfen en az bir tarih seçin');
      return;
    }
    
    setLoading(true);
    try {
      if (!auth.currentUser) {
        alert('Oturum açmanız gerekmektedir.');
        setLoading(false);
        return;
      }

      let q = collection(db, 'fish_entries');
      let constraints = [];
      
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

      q = constraints.length > 0 
        ? query(q, ...constraints, orderBy('timestamp', 'desc'))
        : query(q, orderBy('timestamp', 'desc'));

      const querySnapshot = await getDocs(q);
      let records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp ? new Date(doc.data().timestamp.seconds * 1000).toLocaleDateString() : 'Tarih yok'
      })).filter(record => record.locationLatitude && record.locationLongitude);

      // Eğer lokasyon seçilmişse, sadece o şehirdeki kayıtları filtrele
      if ((analizType === 'lokasyon' || analizType === 'yore') && selectedLocation) {
        const selectedCity = determineRegion(selectedLocation.latitude, selectedLocation.longitude).city;
        if (selectedCity !== "Bilinmiyor") {
          records = records.filter(record => {
            const recordCity = determineRegion(record.locationLatitude, record.locationLongitude).city;
            return recordCity === selectedCity;
          });
        }
      }

      console.log(`${records.length} kayıt bulundu.`);
      setFishData(records);

      if (analizType === 'yore' || (analizType === 'lokasyon' && viewMode === 'bolge')) {
        groupDataByRegion(records);
      } else {
        setShowRegionList(false);
        setSelectedRegion(null);
      }

      if (records.length > 0) {
        setShowReport(true);
        
        setTimeout(() => {
          if (mapRef.current && records.length > 0) {
            const coordinates = records.map(record => ({
              latitude: record.locationLatitude,
              longitude: record.locationLongitude
            }));
            
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          }
        }, 500);
      } else {
        setShowReport(true);
        Alert.alert(
          "Bilgi", 
          "Seçilen bölgede kayıt bulunamadı.",
          [{ text: "Tamam" }]
        );
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Veriler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleShowReport = () => {
    fetchFishData();
  };

  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
    
    console.log("Selected region:", region);
    console.log("Available regions:", Object.keys(regionGroupedData));
    
    const filteredData = regionGroupedData[region] || [];
    console.log("Filtered data for region:", region, "count:", filteredData.length);

    if (analizType === 'lokasyon' && viewMode === 'bolge') {
      setFishData(filteredData);
      setViewMode('harita');
    } else {
      setFishData(filteredData);
    }
    
    if (filteredData.length > 0) {
      setTimeout(() => {
        if (mapRef.current) {
          const coordinates = filteredData.map(record => ({
            latitude: record.locationLatitude,
            longitude: record.locationLongitude
          }));
          
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          }, console.log("Map coordinates updated"));
        } else {
          console.log("Map reference not available");
        }
      }, 500);
    } else {
      console.log("No data to display for region:", region);
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    if (typeof timestamp === 'object' && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  const handleMarkerPress = (coordinate) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>Fish Analiz</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.section}>
          <Text style={styles.label}>Analiz Türü Seçin:</Text>
          <DropDownPicker
            open={open}
            value={analizType}
            items={items}
            setOpen={setOpen}
            setValue={setAnalizType}
            setItems={setItems}
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            dropDownContainerStyle={styles.dropdownContainer}
            placeholderStyle={styles.placeholderStyle}
            disabledStyle={styles.disabledItemStyle}
            placeholder="Rapor türü seçin"
            zIndex={3000}
            zIndexInverse={1000}
          />
        </View>
        {analizType === 'tarih' && (
          <View style={styles.section}>
            <Text style={styles.label}>Tarih Aralığı:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateButtonText}>{startDate ? startDate.toLocaleDateString() : 'Başlangıç Tarihi'}</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 10 }}>-</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateButtonText}>{endDate ? endDate.toLocaleDateString() : 'Bitiş Tarihi'}</Text>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </View>
        )}
        {analizType === 'lokasyon' && (
          <View style={styles.section}>
            <Text style={styles.label}>Görüntüleme Şekli:</Text>
            <View style={styles.viewModeContainer}>
              <TouchableOpacity 
                style={[
                  styles.viewModeButton, 
                  viewMode === 'harita' && styles.viewModeButtonActive
                ]}
                onPress={() => {
                  setViewMode('harita');
                  setShowRegionList(false);
                  setSelectedRegion(null);
                  setShowLocationPicker(true);
                }}
              >
                <Text style={[
                  styles.viewModeText, 
                  viewMode === 'harita' && styles.viewModeTextActive
                ]}>
                  Harita
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.viewModeButton, 
                  viewMode === 'bolge' && styles.viewModeButtonActive
                ]}
                onPress={() => {
                  setViewMode('bolge');
                  setShowLocationPicker(true);
                  if (fishData.length > 0) {
                    groupDataByRegion(fishData);
                  }
                }}
              >
                <Text style={[
                  styles.viewModeText, 
                  viewMode === 'bolge' && styles.viewModeTextActive
                ]}>
                  Bölge
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {((analizType === 'lokasyon' && showLocationPicker) || analizType === 'yore') && (
          <View style={styles.section}>
            <Text style={styles.label}>Lokasyon Seçin:</Text>
            <Text style={styles.infoText}>
              (İsteğe bağlı - Seçmezseniz tüm kayıtlar gösterilir)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TouchableOpacity style={styles.locationButton} onPress={handleSelectLocation}>
                <Text style={styles.locationButtonText}>
                  {selectedLocation ? 'Lokasyon Seçildi' : 'Haritadan Lokasyon Seç'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Tarih Filtresi (Opsiyonel):</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateButtonText}>{startDate ? startDate.toLocaleDateString() : 'Başlangıç Tarihi'}</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 10 }}>-</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateButtonText}>{endDate ? endDate.toLocaleDateString() : 'Bitiş Tarihi'}</Text>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </View>
        )}
        <View style={styles.section}>
          <ModernButton 
            label={loading ? "Yükleniyor..." : "Raporu Göster"} 
            onPress={handleShowReport} 
            style={[styles.customButton, { height: 40 }]}
            disabled={loading} 
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
          </View>
        )}

        {showReport && !loading && ((analizType === 'yore' && showRegionList) || (analizType === 'lokasyon' && viewMode === 'bolge' && showRegionList)) && (
          <View style={styles.regionListContainer}>
            <Text style={styles.sectionTitle}>
              {analizType === 'yore' 
                ? 'Şehirlere Göre Balık Kayıtları' 
                : 'Bölgelere Göre Balık Kayıtları'}
            </Text>
            {Object.keys(regionGroupedData).length > 0 ? (
              <FlatList
                data={Object.keys(regionGroupedData)}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.regionItem, 
                      selectedRegion === item && styles.selectedRegionItem
                    ]}
                    onPress={() => handleRegionSelect(item)}
                  >
                    <Text style={styles.regionName}>{item}</Text>
                    <Text style={styles.regionCount}>
                      {regionGroupedData[item].length} kayıt
                    </Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={styles.noDataText}>Bu bölgede kayıt bulunamadı</Text>
            )}
          </View>
        )}

        {showReport && !loading && (
          (analizType !== 'lokasyon' || (analizType === 'lokasyon' && viewMode === 'harita') || selectedRegion) && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialMapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {fishData
              .filter(record => {
                return true;
              })
              .map((record) => (
              <Marker
                key={record.id}
                coordinate={{
                  latitude: record.locationLatitude,
                  longitude: record.locationLongitude,
                }}
                onPress={() => handleMarkerPress({
                  latitude: record.locationLatitude,
                  longitude: record.locationLongitude,
                })}
              >
                <Callout>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{record.species || 'Tür Bilinmiyor'}</Text>
                    <Text style={styles.calloutText}>Tarih: {formatDateTime(record.timestamp)}</Text>
                    <Text style={styles.calloutText}>Ağırlık: {record.weight || 'Bilinmiyor'} kg</Text>
                    <Text style={styles.calloutText}>Boy: {record.length || 'Bilinmiyor'} cm</Text>
                    <Text style={styles.calloutText}>Şehir: {determineRegion(record.locationLatitude, record.locationLongitude).city}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 60,
    left: 20,
    zIndex: 999,
  },
  backText: {
    color: '#007AFF',
    fontSize: 18,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dropdown: {
    backgroundColor: 'white',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderTopWidth: 0,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  placeholderStyle: {
    color: 'gray',
    fontSize: 14,
  },
  disabledItemStyle: {
    opacity: 0.5,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
  },
  customButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  map: {
    flex: 1,
    marginTop: 20,
  },
  calloutContainer: {
    width: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 14,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 14,
  },
  regionListContainer: {
    maxHeight: 250,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  regionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
    borderRadius: 4,
    marginBottom: 5,
  },
  selectedRegionItem: {
    backgroundColor: '#e6f2ff',
    borderLeftColor: '#007AFF',
    borderLeftWidth: 3,
  },
  regionName: {
    fontSize: 14,
  },
  regionCount: {
    fontSize: 13,
    color: '#666',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginHorizontal: 5,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewModeText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  viewModeTextActive: {
    color: 'white',
  },
  noDataText: {
    padding: 10,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
}); 