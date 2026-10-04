/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  basePath: '/admin',
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
