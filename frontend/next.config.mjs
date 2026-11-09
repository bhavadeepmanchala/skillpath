/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/analyze",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/results",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/policymaker",
        destination: "/login",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
