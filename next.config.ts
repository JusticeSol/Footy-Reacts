import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve images as they are. YouTube's thumbnails are already compressed
    // JPEGs, and Vercel's optimizer counted every thumbnail at every srcset
    // width as a separate transformation: the Hobby plan's 5,000 a month went
    // in October, after which new thumbnails failed with 402.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "crests.football-data.org" },
    ],
  },
};

export default nextConfig;
