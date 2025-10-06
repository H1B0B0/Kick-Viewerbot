/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone for Docker deployment
  output: "standalone",

  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
