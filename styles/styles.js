import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flex: 1,
  },
  heading: {
    fontSize: 24,
    marginBottom: 24,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 16,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  dateButton: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#555',
  },
  dailyExpensesSection: {
    marginTop: 30,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 10,
    marginTop: 24,
  },
  dailyHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  expenseCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  expenseText: {
    fontSize: 14,
    color: '#333',
  },
});
