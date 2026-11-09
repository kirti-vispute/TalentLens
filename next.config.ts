import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdf-parse (pdfjs-dist) dynamically imports its worker script by a
  // relative path at runtime. Bundling it into the Server Action chunk
  // breaks that resolution ("Cannot find module '...pdf.worker.mjs'"),
  // which made every real PDF upload silently fail text extraction.
  // Keeping it external makes Node `require` it normally instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  // pdfjs-dist spawns its text-extraction worker by requiring
  // pdf.worker.mjs at runtime — a dynamic path Next's build-time file
  // tracer can't see, so it never got copied into the deployed
  // function ("Cannot find module '...pdf.worker.mjs'" in production).
  // Force it (and the rest of the legacy Node build) into every route's
  // trace explicitly.
  outputFileTracingIncludes: {
    "/*": ["node_modules/pdfjs-dist/legacy/build/**/*"],
  },
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
