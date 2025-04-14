import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import { Platform } from 'react-native';

const Expense = () => {
  const CATEGORIES = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
    'Education',
    'Others',
  ];

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Authenticated user:', user.uid);
        setUserId(user.uid);
        fetchExpenses();
      } else {
        console.log('No user is signed in. Redirecting to login...');
        navigation.replace('Login');
        setUserId(null);
        setExpenses([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchExpenses();
    }
  }, [date, userId]);

  const fetchExpenses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('User is not authenticated. Cannot fetch expenses.');
        return;
      }

      const selectedDateStr = date.toISOString().split('T')[0];
      console.log('Fetching expenses for date:', selectedDateStr);

      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('userId', '==', currentUser.uid),
        where('date', '==', selectedDateStr)
      );

      const querySnapshot = await getDocs(q);
      const expenseData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('Fetched expenses:', expenseData);
      setExpenses(expenseData);
    } catch (error) {
      console.error('Error fetching expenses:', error.message);
      Alert.alert('Error', 'Failed to fetch expenses. Please try again.');
    }
  };

  const addExpense = async () => {
    if (!userId) {
      Alert.alert('Error', 'User is not authenticated.');
      return;
    }

    if (!amount || !category) {
      Alert.alert('Error', 'Amount and category are required.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'expenses'), {
        amount: amountNum,
        category,
        note,
        userId,
        date: date.toISOString().split('T')[0],
      });

      console.log('Document written with ID: ', docRef.id);

      const newExpense = {
        id: docRef.id,
        amount: amountNum,
        category,
        note,
        userId,
        date: date.toISOString().split('T')[0],
      };

      setExpenses((prev) => [newExpense, ...prev]);
      setAmount('');
      setCategory('');
      setNote('');
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    }
  };

  const confirmDelete = async (id) => {
    console.log('Deleting expense with ID:', id);
    try {
      await deleteDoc(doc(db, 'expenses', id));
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      Alert.alert('Deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14213d" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add New Expense</Text>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Text style={styles.rupee}>₹</Text>
            <Text style={styles.label}>Amount</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter amount in INR"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="pricetag" size={16} />
            <Text style={styles.label}>Category</Text>
          </View>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.categoryText, !category && styles.placeholderText]}>
              {category || 'Select a category'}
            </Text>
          </TouchableOpacity>

          <Modal
            visible={showCategoryModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCategoryModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <ScrollView>
                  {CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.categoryItem,
                        category === item && styles.selectedCategory,
                      ]}
                      onPress={() => {
                        setCategory(item);
                        setShowCategoryModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryItemText,
                          category === item && styles.selectedCategoryText,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCategoryModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="calendar" size={16} />
            <Text style={styles.label}>Date</Text>
          </View>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <TextInput
                style={styles.input}
                value={date.toLocaleDateString()}
                editable={false}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                const newDate = prompt(
                  'Enter date (YYYY-MM-DD):',
                  date.toISOString().split('T')[0]
                );
                if (newDate) {
                  const parsedDate = new Date(newDate);
                  if (!isNaN(parsedDate)) {
                    setDate(parsedDate);
                    fetchExpenses();
                  } else {
                    Alert.alert(
                      'Invalid Date',
                      'Please enter a valid date in YYYY-MM-DD format.'
                    );
                  }
                }
              }}
            >
              <TextInput
                style={styles.input}
                value={date.toLocaleDateString()}
                editable={false}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="create" size={16} />
            <Text style={styles.label}>Note</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Optional note"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={addExpense}>
          <Text style={styles.buttonText}>Save Expense</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>
        {date.toDateString() === new Date().toDateString()
          ? "Today's Expenses"
          : `Expenses for ${date.toLocaleDateString()}`}
      </Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.expenseContainer}>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseAmount}>₹{item.amount}</Text>
              {item.category && <Text style={styles.categoryText}>{item.category}</Text>}
              {item.note && <Text style={styles.noteText}>{item.note}</Text>}
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleUpdate(item)}
              >
                <Ionicons name="pencil-outline" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#14213d',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  rupee: {
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#14213d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseContent: {
    flex: 1,
    marginRight: 12,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14213d',
    marginRight: 8,
  },
  expenseCategory: {
    fontSize: 14,
    color: '#666',
  },
  expenseNote: {
    fontSize: 12,
    color: '#999',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    overflow: 'hidden',
    width: 36,
    height: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  deleteButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  expenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 16,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e2746',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 12,
    color: '#999999',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#1890ff',
    padding: 8,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ff4d4f',
    padding: 8,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14213d',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: '#14213d',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedCategoryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#999',
  },
});

export default Expense;