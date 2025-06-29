import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ExpenseCard from '../components/ExpenseCard';
import Header from '../components/Header';
import { COLORS } from '../constants/colors';
import { API } from '../services/api';

export default function HomeScreen() {
  const [expenses, setExpenses] = useState([]);

  useFocusEffect(
  useCallback(() => {
    API.get('/expenses?userId=dummyuser123')
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error(err));
  }, [])
);


  return (
    <ScrollView style={styles.container}>
      <Header title="Home" />
      <View style={styles.content}>
        <Text style={styles.title}>Recent Expenses</Text>
        {expenses.map((item, index) => (
          <ExpenseCard key={index} item={item} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
});
