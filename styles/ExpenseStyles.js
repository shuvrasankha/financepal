// ExpenseStyles.js
import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

export const CATEGORY_COLORS = {
  Food: Theme.colors.success,         // Green
  Transport: Theme.colors.info,       // Blue
  Shopping: Theme.colors.warning,     // Amber
  Entertainment: '#8b5cf6',           // Purple
  Bills: Theme.colors.error,          // Red
  Healthcare: '#06b6d4',              // Cyan
  Education: '#ec4899',               // Pink
  Travel: '#f97316',                  // Orange
  Groceries: '#10b981',               // Emerald
  Others: Theme.colors.medium,        // Gray
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
  },
  header: {
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.fontSizes.xxxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.dark,
    marginBottom: Theme.spacing.sm,
  },
  subTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semiBold,
    color: Theme.colors.medium,
  },
  expensesTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    marginVertical: Theme.spacing.md,
    color: Theme.colors.dark,
    marginLeft: Theme.spacing.md,
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.sm,
    marginBottom: Theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: Theme.spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  label: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.medium,
    color: Theme.colors.medium,
    marginLeft: Theme.spacing.sm,
  },
  input: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.light,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.dark,
  },
  inputText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.dark,
  },
  button: {
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
  },
  updateButton: {
    backgroundColor: Theme.colors.success,
  },
  cancelButton: {
    backgroundColor: Theme.colors.lighter,
    marginTop: Theme.spacing.sm + 4,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: Theme.colors.white,
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semiBold,
  },
  cancelButtonText: {
    color: Theme.colors.error,
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semiBold,
  },
  expenseListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  viewDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  viewDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewDateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  expenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 16,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expenseHeaderRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontWeight: '500',
    fontSize: 12,
    color: '#ffffff',
  },
  expenseDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  noteText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#6366f1',
    padding: 8,
    borderRadius:  8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg - 4,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xs,
  },
  modalTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.dark,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    paddingVertical: Theme.spacing.sm + 6,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm + 2,
    marginBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
  },
  selectedCategory: {
    backgroundColor: Theme.colors.primary,
  },
  categoryItemText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.medium,
  },
  selectedCategoryText: {
    color: Theme.colors.white,
    fontWeight: Theme.typography.fontWeights.semiBold,
  },
  placeholderText: {
    color: Theme.colors.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  noExpensesContainer: {
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Theme.spacing.sm + 4,
    height: 160,
    marginHorizontal: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  noExpensesText: {
    color: Theme.colors.medium,
    fontSize: Theme.typography.fontSizes.md,
    marginTop: Theme.spacing.sm + 4,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.lighter,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
    padding: Theme.spacing.xs,
    marginHorizontal: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: Theme.spacing.sm + 4,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm + 2,
  },
  activeViewToggleButton: {
    backgroundColor: Theme.colors.white,
    ...Theme.shadows.sm,
  },
  viewToggleText: {
    fontWeight: Theme.typography.fontWeights.medium,
    color: Theme.colors.medium,
  },
  activeViewToggleText: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeights.semiBold,
  },
  expensesList: {
    marginBottom: Theme.spacing.lg,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Theme.spacing.md,
    marginHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  monthNavigationButton: {
    padding: Theme.spacing.sm,
  },
  currentMonth: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semiBold,
    color: Theme.colors.dark,
  },
  summaryCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginVertical: Theme.spacing.sm + 4,
    ...Theme.shadows.sm,
    elevation: 2,
    marginLeft: Theme.spacing.md,
    marginRight: Theme.spacing.md,
  },
  summaryTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.dark,
    marginBottom: Theme.spacing.sm + 4,
  },
  summaryTotal: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.primary,
    marginBottom: Theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.light,
    marginVertical: Theme.spacing.md,
  },
  categorySummaryTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semiBold,
    color: Theme.colors.medium,
    marginBottom: Theme.spacing.sm + 4,
  },
  categorySummaryContainer: {
    marginTop: Theme.spacing.sm,
  },
  categorySummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.lighter,
  },
  categorySummaryName: {
    fontSize: Theme.typography.fontSizes.md - 1,
    color: Theme.colors.medium,
  },
  categorySummaryAmount: {
    fontSize: Theme.typography.fontSizes.md - 1,
    fontWeight: Theme.typography.fontWeights.semiBold,
    color: Theme.colors.dark,
  },
});

export default styles;