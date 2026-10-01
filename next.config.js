/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.pixabay.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", pathname: "/**" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@cursor/sdk"],
  // Keep heavy trees out of every serverless function bundle.
  // Public/admin post reads on Vercel use GitHub (posts-live / posts-admin),
  // so shipping content/posts into each function only burns Hobby Functions Storage.
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/@cursor/**",
      "./content/**",
      "./scripts/**",
      "./docs/**",
      "./data/**",
    ],
  },
};

module.exports = nextConfig;
