/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    dirs: ['app', 'components', 'lib', 'tests'],
  },
  typescript: {
    // A type error fails the build. Gate G1 also catches it, but the build
    // must never be the looser of the two checks.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
