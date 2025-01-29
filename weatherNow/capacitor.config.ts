import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aprunet.weathernow',
  appName: 'WeatherNow!',
  webDir: 'www',
  
  // Configuration serveur
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  
  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000
    }
  }
};

export default config;
