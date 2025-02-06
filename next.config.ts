import type { NextConfig } from "next";

interface WebpackConfigValue {
  resolve?: {
    fallback?: Record<string, boolean | string>;
  };
  optimization?: {
    minimize?: boolean;
    minimizer?: unknown[];
  };
  module?: {
    rules?: Array<{
      test?: RegExp;
      use?: Array<{
        loader: string;
        options?: Record<string, unknown>;
      }>;
      [key: string]: unknown;
    }>;
  };
}

const nextConfig: NextConfig = {
  images: {
    domains: ['assets.coingecko.com', 'coin-images.coingecko.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/coins/images/**',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/coins/images/**',
      }
    ],
  },
  webpack: (config: WebpackConfigValue) => {
    if (!config.resolve) {
      config.resolve = {};
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };

    if (!config.module) {
      config.module = { rules: [] };
    }

    config.module.rules?.push({
      test: /\.js$/,
      use: [{
        loader: 'string-replace-loader',
        options: {
          search: /[\u0080-\uffff]/g,
          replace: (match: string) => '\\u' + match.charCodeAt(0).toString(16).padStart(4, '0')
        }
      }]
    });

    return config;
  },
  experimental: {
    optimizePackageImports: ['@web3modal/ethereum', '@web3modal/react']
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''
  }
};

export default nextConfig;
