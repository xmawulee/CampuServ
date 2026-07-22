import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;

// Dynamically resolve development host IP from Expo's Metro server URL
let devApiUrl = extra?.apiBaseUrl as string | undefined;
let devWsUrl = extra?.wsBaseUrl as string | undefined;

if (__DEV__) {
  // Only override with the host IP if we aren't explicitly using an active tunnel (ngrok / localtunnel / cloudflare)
  const isTunnel = devApiUrl?.includes('ngrok') || devApiUrl?.includes('loca.lt') || devApiUrl?.includes('trycloudflare.com');
  if (!isTunnel) {
    // hostUri is typically "192.168.x.x:8081"
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp) {
        devApiUrl = `http://${hostIp}:8080`;
        devWsUrl = `ws://${hostIp}:8080/ws/chats`;
      }
    }
  }
}

const ENV = {
  googleMapsApiKey: extra?.googleMapsApiKey as string | undefined,
  apiBaseUrl: devApiUrl,
  paystackPublicKey: extra?.paystackPublicKey as string | undefined,
  appEnv: (extra?.appEnv ?? 'development') as 'development' | 'staging' | 'production',
  wsBaseUrl: devWsUrl,
};

// Validate at startup — crash fast if critical config is missing
const REQUIRED_KEYS: (keyof typeof ENV)[] = [
  'googleMapsApiKey',
  'apiBaseUrl',
  'wsBaseUrl',
];

REQUIRED_KEYS.forEach((key) => {
  if (!ENV[key]) {
    console.error(
      `[ENV] MISSING REQUIRED CONFIG: "${key}" is undefined. ` +
      `Check mobile/.env and mobile/app.config.js extra block.`
    );
  }
});

export default ENV;
