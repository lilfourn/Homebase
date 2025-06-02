/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  webpack: (config, { dev, isServer }) => {
    // Disable source maps in production
    if (!dev && !isServer) {
      config.devtool = false;
    }
    
    // Prevent webpack from trying to resolve source map files
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Ignore source map warnings
    config.ignoreWarnings = [
      {
        module: /lucide-react/,
        message: /Failed to parse source map/,
      },
      {
        module: /react-big-calendar/,
        message: /Failed to parse source map/,
      },
    ];

    return config;
  },
};

export default nextConfig;
