/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@cursor/sdk"],
  // Keep automation scripts out of the app bundle graph
  outputFileTracingExcludes: {
    "*": ["./node_modules/@cursor/**"],
  },
};

module.exports = nextConfig;
