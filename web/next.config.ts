import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old prototype URLs that people may have bookmarked.
  async redirects() {
    return [
      { source: "/overview", destination: "/home", permanent: false },
      { source: "/inventory", destination: "/home", permanent: false },
      { source: "/compliance-plan/:path*", destination: "/home", permanent: false },
    ];
  },
};

export default nextConfig;
