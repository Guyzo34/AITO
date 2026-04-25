import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace TypeScript packages (npm workspaces)
  transpilePackages: ["@agents-marketing/types"],
};

export default nextConfig;