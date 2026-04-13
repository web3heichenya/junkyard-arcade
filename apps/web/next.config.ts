import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keeps bundle sizes down by ensuring server-first defaults.
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config) => {
    // RainbowKit/Wagmi bring optional deps for React Native & pretty logging.
    // Provide local stubs to keep builds clean and browser-focused.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'src/shims/async-storage.ts'
      ),
      'pino-pretty': path.resolve(__dirname, 'src/shims/pino-pretty.ts'),
    };
    return config;
  },
};

export default nextConfig;
