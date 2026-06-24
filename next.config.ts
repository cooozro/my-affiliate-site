/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 빌드 중 타입 에러가 발생해도 무시하고 진행합니다.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig