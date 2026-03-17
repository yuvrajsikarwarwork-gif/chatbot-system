import path from "path";
import { fileURLToPath } from "url";

// Emulate __dirname in an ES module environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Forces Turbopack to use this specific folder as the project root
    root: __dirname,
  },
};

export default nextConfig;