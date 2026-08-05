import 'dotenv/config';

export default {
  expo: {
    name: "CampuServ",
    slug: "mobile",
    scheme: "campuserv",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/logo-transparent.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.knust.campuserv"
    },
    android: {
      package: "com.knust.campuserv",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/android-icon-foreground.png",
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
      "@react-native-community/datetimepicker",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow CampuServ to access your location to track service requests and provider locations.",
          "locationWhenInUsePermission": "Allow CampuServ to access your location to search for nearby tasks and update job tracking."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow CampuServ to access your photos to select listings pictures, upload profile avatars, and send chat images.",
          "cameraPermission": "Allow CampuServ to access your camera to capture provider verification IDs, profile pictures, and listings photos."
        }
      ]
    ]
  }
};
