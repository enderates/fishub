// screens/FishListScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { db } from '../firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigation, useIsFocused } from '@react-navigation/native';

export default function FishListScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) fetchEntries();
  }, [isFocused]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'fish_entries'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(list);
    } catch (err) {
      Alert.alert('Hata', 'Veriler alınamadı.');
    }
    setLoading(false);
  };

  const confirmDelete = (id) => {
    Alert.alert(
      'Veri Silinsin mi?',
      'Bu kaydı silmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => handleDelete(id),
        },
      ]
    );
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'fish_entries', id));
      Alert.alert('Başarılı', 'Kayıt silindi.');
      fetchEntries();
    } catch (error) {
      Alert.alert('Hata', 'Silme işlemi sırasında bir sorun oluştu.');
    }
  };

  const handleEdit = (item) => {
    navigation.navigate('FishEntryScreen', { editData: item });
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemBox}>
      {item.photoURL && (
        <Image 
          source={{ uri: item.photoURL }} 
          style={styles.photo}
          resizeMode="cover"
        />
      )}
      <Text style={styles.itemText}>{item.speciesLabel} - {item.weight}gr</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
          <Text style={styles.editText}>Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.actionBtn}>
          <Text style={styles.deleteText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balık Kayıtları</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  itemBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9'
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemText: { fontSize: 16 },
  actions: { flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  editText: { color: 'blue' },
  deleteText: { color: 'red' }
});
