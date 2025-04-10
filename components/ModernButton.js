// components/ModernButton.js

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function ModernButton({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0288d1', // Deniz mavisi, göz alıcı
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  label: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
