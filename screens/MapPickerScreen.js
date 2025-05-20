// screens/MapPickerScreen.js

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';

const GOOGLE_API_KEY = 'AIzaSyB3g-VKzYtLglviF-VYFOsc63RPyzy_VFA';

export default function MapPickerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const onLocationSelected = route.params?.onLocationSelected;

  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [initialRegion, setInitialRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum erişimi verilmedi.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const regionData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setInitialRegion(regionData);
      setCurrentLocation(regionData);
    })();
  }, []);

  const handleSelectLocation = (event) => {
    try {
      if (event && event.nativeEvent && event.nativeEvent.coordinate) {
        const coords = event.nativeEvent.coordinate;
        setSelectedLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        
        // Haritayı seçilen konuma odakla
        if (mapRef.current && mapRef.current.animateToRegion) {
          mapRef.current.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 500);
        }
      }
    } catch (error) {
      console.error('Konum seçme hatası:', error);
    }
  };

  const handleSearch = async (text) => {
    setAddress(text);
    if (text.length < 3) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_API_KEY}&input=${text}&language=tr&components=country:tr`
      );
      const data = await res.json();
      if (data.status === 'OK') {
        setSuggestions(data.predictions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    }
  };

  const handleSuggestionPress = async (placeId) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_API_KEY}&place_id=${placeId}`
      );
      const data = await res.json();
      
      if (data.status === 'OK' && data.result && data.result.geometry && data.result.geometry.location) {
        const { lat, lng } = data.result.geometry.location;
        
        // Güvenlik kontrolü
        if (typeof lat === 'number' && typeof lng === 'number') {
          const newRegion = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          
          // Önce state'i güncelleyelim
          setSelectedLocation({
            latitude: lat,
            longitude: lng,
          });
          
          setSuggestions([]);
          setAddress(data.result.formatted_address || '');
          
          // Harita animasyonu
          if (mapRef.current && mapRef.current.animateToRegion) {
            setTimeout(() => {
              mapRef.current.animateToRegion(newRegion, 1000);
            }, 100);
          }
        }
      } else {
        throw new Error('Geçersiz konum bilgisi');
      }
    } catch (err) {
      console.error('Yer detayı alınamadı:', err);
    }
  };

  const handleConfirm = () => {
    try {
      if (selectedLocation && 
          typeof selectedLocation.latitude === 'number' && 
          typeof selectedLocation.longitude === 'number') {
        if (typeof onLocationSelected === 'function') {
          onLocationSelected(selectedLocation);
          navigation.goBack();
        } else {
          console.error('onLocationSelected is not a function');
          Alert.alert('Hata', 'Konum seçme işlevi çalışmıyor. Lütfen tekrar deneyin.');
        }
      } else {
        Alert.alert('Uyarı', 'Lütfen haritadan bir konum seçin.');
      }
    } catch (error) {
      console.error('Konum onaylama hatası:', error);
      Alert.alert('Hata', 'Konum seçim işlemi sırasında bir hata oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.searchLabel}>Lokasyon Ara</Text>
      <TextInput
        style={styles.input}
        placeholder="Adres girin..."
        value={address}
        onChangeText={handleSearch}
      />
      {suggestions.length > 0 && (
        <FlatList
          style={styles.suggestionList}
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(item.place_id)}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      {initialRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          onPress={handleSelectLocation}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          toolbarEnabled={false}
        >
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
              }}
              title="Bulunduğun Konum"
              pinColor="blue"
              tracksViewChanges={false}
            />
          )}
          {selectedLocation && (
            <Marker 
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude
              }}
              tracksViewChanges={false}
            />
          )}
        </MapView>
      )}
      <View style={styles.buttonContainer}>
        <Button 
          title="Konumu Onayla" 
          onPress={handleConfirm} 
          disabled={!selectedLocation}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    color: '#333',
  },
  input: {
    padding: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginHorizontal: 10,
    marginTop: 5,
    backgroundColor: '#fff',
    zIndex: 999,
    elevation: 3,
  },
  suggestionList: {
    maxHeight: 200,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    zIndex: 999,
    elevation: 3,
  },
  suggestionItem: {
    padding: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    backgroundColor: '#fafafa',
  },
  map: { flex: 1 },
  buttonContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
});