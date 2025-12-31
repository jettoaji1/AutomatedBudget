/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node:crypto'],
  },
};

module.exports = nextConfig;
