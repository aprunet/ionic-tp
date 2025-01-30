import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aprunet.weathernow',
  appName: 'WeatherNow!',
  webDir: 'www',
  
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000
    },
    CapacitorPermissions: {
      permissions: ["android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"]
    }
  }
};

export default config;
