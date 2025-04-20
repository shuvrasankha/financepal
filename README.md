# FinancePal

FinancePal is a cross-platform personal finance tracker built with [Expo](https://expo.dev) and React Native.

## Features
- Track daily and monthly expenses
- Analyze spending by category and over time
- Manage lending and borrowing with contacts
- App lock with biometrics/PIN (Android & iOS)
- Modern UI with bottom navigation
- Firebase authentication and data storage

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the app**
   ```bash
   npx expo start
   ```
   - For a custom app icon and lock features, use a development build:
     ```bash
     npx expo run:android
     npx expo run:ios
     ```
3. **Build for production**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## Project Structure
- `app/` — Main app code (screens, components)
- `assets/` — Images, icons, fonts
- `styles/` — Style files
- `firebase.js` — Firebase config
- `constants/` — App-wide constants

## Customization
- **App Icon:** Place your icon at `assets/images/icon.png` (1024x1024 PNG).
- **Adaptive Icon (Android):** `assets/images/adaptive-icon.png`
- **Splash Screen:** `assets/images/splash-icon.png`

## Notes
- App lock uses Expo LocalAuthentication and AsyncStorage.
- Custom icons and splash screens only appear in standalone/dev builds, not in Expo Go.
- For contact selection, the app requests device contact permissions.

## Learn More
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)