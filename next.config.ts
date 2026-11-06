import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdf-parse (pdfjs-dist) dynamically imports its worker script by a
  // relative path at runtime. Bundling it into the Server Action chunk
  // breaks that resolution ("Cannot find module '...pdf.worker.mjs'"),
  // which made every real PDF upload silently fail text extraction.
  // Keeping it external makes Node `require` it normally instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
