import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.forcegraph.core',
  appName: 'Force Graph',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
