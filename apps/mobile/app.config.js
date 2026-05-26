/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'SalonePlate',
    slug: 'saloneplate',
    version: '1.0.0',
    sdkVersion: '54.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'saloneplate',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#071A2F',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'sl.saloneplate.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#071A2F',
      },
      package: 'sl.saloneplate.app',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#D4AF37',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
