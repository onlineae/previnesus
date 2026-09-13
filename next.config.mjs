/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure experimental or standalone build if needed for capacitor
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
};

export default nextConfig;
