import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty'],
  output: 'standalone',
  reactStrictMode: true,
  webpack: (cfg) => {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.extensionAlias = {
      ...(cfg.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return cfg;
  },
};

export default config;
