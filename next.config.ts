import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  devIndicators: false,
};

export default nextConfig;
