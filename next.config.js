const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@resvg/resvg-js');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@resvg/resvg-js'],
  },
};

module.exports = nextConfig;
