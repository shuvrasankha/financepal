import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/LendingStyles'; // Assuming you have a separate styles file for Lending

export default function Lending() {
  const [form, setForm] = useState({
    amount: '',
    name: '',
    dateLent: new Date().toISOString().split('T')[0],
    dueDate: '',
    note: '',
    category: '',
    contact: '',
    repayment: '',
    repaymentDate: '',
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.amount || !form.name) {
      Alert.alert('Error', 'Amount and Name are required fields.');
      return;
    }
    console.log('Lending details submitted:', form);
    Alert.alert('Success', 'Lending details saved successfully!');
    // TODO: Add API call or state management logic
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Lending</Text>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="₹500.00"
            keyboardType="numeric"
            value={form.amount}
            onChangeText={(text) => handleChange('amount', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Person's Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Rohit Sharma"
            value={form.name}
            onChangeText={(text) => handleChange('name', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date Lent</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={form.dateLent}
            onChangeText={(text) => handleChange('dateLent', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={form.dueDate}
            onChangeText={(text) => handleChange('dueDate', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={styles.textarea}
            placeholder="For bike repair"
            multiline
            numberOfLines={4}
            value={form.note}
            onChangeText={(text) => handleChange('note', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Friend / Family / Work"
            value={form.category}
            onChangeText={(text) => handleChange('category', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            keyboardType="phone-pad"
            value={form.contact}
            onChangeText={(text) => handleChange('contact', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Repayment Amount (if paid)</Text>
          <TextInput
            style={styles.input}
            placeholder="₹200.00"
            keyboardType="numeric"
            value={form.repayment}
            onChangeText={(text) => handleChange('repayment', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Repayment Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={form.repaymentDate}
            onChangeText={(text) => handleChange('repaymentDate', text)}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
          <Text style={styles.saveButtonText}>Save Lending Details →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}