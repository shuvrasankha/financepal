import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 16,
    color: '#555',
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#222',
  },
  negative: {
    color: '#ff4d4f',
  },
  navSection: {
    marginTop: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navLabel: {
    fontSize: 16,
    marginLeft: 12,
    color: '#007bff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  yearSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yearSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  yearOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedYearOption: {
    backgroundColor: '#6366f1',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  selectedYearOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cardActions: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8ff',
    padding: 8,
    borderRadius: 8,
  },
  cardButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
});