/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 정적 사이트로 빌드(out/) — Firebase Hosting·Vercel 양쪽에서 그대로 서빙된다.
  // 이 앱은 클라이언트에서 Firebase(로그인·데이터)를 직접 쓰므로 서버(SSR)가 필요 없다.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
