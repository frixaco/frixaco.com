import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import rehypePrettyCode from "rehype-pretty-code";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  cacheComponents: true,
};

const withMDX = createMDX({
  options: {
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: "vitesse-dark",
          keepBackground: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
