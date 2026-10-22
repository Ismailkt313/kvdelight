/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/webp"] },
  // Allows the sandbox preview host to load the dev overlay/HMR resources.
  allowedDevOrigins: ["*.e2b.app"],
};
export default nextConfig;
