/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 중에 ESLint 에러가 나도 무시하고 진행합니다.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig