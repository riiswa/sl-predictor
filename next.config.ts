import type { NextConfig } from "next";

const nextConfig = {
    typescript: {
        // ⚠️ SKIP type checking during build
        ignoreBuildErrors: true,
    },
}

export default nextConfig;
