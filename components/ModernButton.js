// components/ModernButton.js

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

export default function ModernButton({ label, onPress, style, disabled }) {
  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={onPress}
      disabled={disabled}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0288d1', // Deniz mavisi, göz alıcı
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    width: 120, // Sabit genişlik
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  label: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
