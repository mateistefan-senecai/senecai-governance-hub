import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer reads its embedded fonts from disk at runtime
  // (src/lib/documents/render.tsx); make sure they ship with the functions
  // that generate PDFs (the documents page's server actions).
  outputFileTracingIncludes: {
    "/clients/**": ["./assets/fonts/**"],
  },
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
