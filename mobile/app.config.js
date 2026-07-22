import 'dotenv/config';

export default {
  expo: {
    name: "CampusServ",
    slug: "campusserv-v2",
    scheme: "campusserv",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#E6E6E6"
    },
    assetBundlePatterns: ["**/*"],
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.knust.campusserv"
    },
    android: {
      package: "com.knust.campusserv",
      adaptiveIcon: {
        backgroundColor: "#E6E6E6",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "b0266316-e0b1-4a0e-8638-13b69bf75d2e"
      },
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      apiBaseUrl: process.env.API_BASE_URL,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
      appEnv: process.env.APP_ENV ?? 'development',
      wsBaseUrl: process.env.WS_BASE_URL,
    },
    owner: "alleeennnn",
    plugins: [
      "@react-native-community/datetimepicker"
    ]
  }
};
