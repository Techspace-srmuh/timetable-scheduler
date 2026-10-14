import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// next.config.ts is loaded as an ES module, where __dirname is not defined.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: projectRoot,
    rules: {
      // Only run Tailwind on the global stylesheet. Matching every "*.css"
      // also rewrote CSS Modules (e.g. page-header.module.css) into plain
      // global CSS, so their `styles.*` class names came back undefined.
      "globals.css": {
        condition: { not: "foreign" },
        loaders: [
          {
            loader: "@tailwindcss/turbopack",
            options: { base: projectRoot },
          },
        ],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
