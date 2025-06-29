import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Header title="Scan Receipt" />
      <View style={styles.cameraBox}>
        <Ionicons name="camera" size={64} color={COLORS.muted} />
        <Text style={styles.placeholder}>Camera Preview</Text>
      </View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Scan Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  cameraBox: {
    height: 300,
    backgroundColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginVertical: 30,
  },
  placeholder: { color: COLORS.muted, marginTop: 10 },
  button: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
