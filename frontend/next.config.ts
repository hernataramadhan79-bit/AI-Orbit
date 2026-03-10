import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // BACKEND_URL (tanpa NEXT_PUBLIC_) dibaca saat runtime oleh Next.js server
        // JANGAN pakai NEXT_PUBLIC_ untuk backend URL karena ia di-bake saat build time
        destination: `${(process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
