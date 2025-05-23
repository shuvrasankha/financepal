import { StyleSheet } from 'react-native';
import Theme from '../constants/Theme';

export const colors = {
  primary: Theme.colors.primary,
  background: Theme.colors.white,
  text: Theme.colors.dark,
  textLight: Theme.colors.medium,
  border: Theme.colors.light,
  error: Theme.colors.error,
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: Theme.spacing.xl + Theme.spacing.sm,
    alignItems: 'center',
  },
  logo: {
    fontSize: 40,
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.typography.fontSizes.xxxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: colors.text,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: colors.textLight,
    textAlign: 'center',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  inputHalf: {
    width: '48%',
  },
  inputContainer: {
    marginBottom: Theme.spacing.md,
  },
  inputLabel: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.medium,
    color: colors.text,
    marginBottom: Theme.spacing.sm,
  },
  input: {
    ...Theme.common.input,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  button: {
    ...Theme.common.button.primary,
    marginTop: Theme.spacing.lg,
  },
  buttonText: {
    color: colors.background,
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semiBold,
  },
  footer: {
    marginTop: Theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textLight,
    fontSize: Theme.typography.fontSizes.md - 1,
  },
  linkText: {
    color: colors.primary,
    fontWeight: Theme.typography.fontWeights.semiBold,
    marginTop: Theme.spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: Theme.typography.fontSizes.xs + 1,
    marginTop: Theme.spacing.xs + 2,
    marginLeft: Theme.spacing.xs,
  },
  successModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  successModalContent: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    width: 60,
    height: 60,
    backgroundColor: Theme.colors.success,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  successTitle: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.dark,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.medium,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: Theme.colors.success,
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    width: '100%',
  },
  successButtonText: {
    color: Theme.colors.white,
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semiBold,
    textAlign: 'center',
  },
});