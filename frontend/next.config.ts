import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // BACKEND_URL (tanpa NEXT_PUBLIC_) dibaca saat runtime oleh Next.js server
        // JANGAN pakai NEXT_PUBLIC_ untuk backend URL karena ia di-bake saat build time
        destination: `${(process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
