import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@clickhouse/client",
    "@google/adk",
    "@google/genai",
    "apify-client",
    "googleapis"
  ]
};

export default nextConfig;
