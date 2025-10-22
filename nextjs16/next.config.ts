import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    cacheComponents: true,
    mdxRs: true,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
