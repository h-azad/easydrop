import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@easydrop/shared-types", "@easydrop/transfer", "@easydrop/webrtc"]
};

export default nextConfig;
