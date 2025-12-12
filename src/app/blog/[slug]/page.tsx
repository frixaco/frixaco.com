import { readdirSync } from "fs";
import path from "path";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { default: Post } = await import(`@/content/${slug}.mdx`);

  return (
    <div className="prose-headings:pb-4 prose-headings:font-bold prose-h1:text-center prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-a:text-cyber-pink prose-a:underline prose-a:hover:text-cyber-magenta mx-auto max-w-4xl py-12">
      <Post />
    </div>
  );
}

export function generateStaticParams() {
  const dir = path.join(process.cwd(), "src", "content");
  const files = readdirSync(dir);

  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({ slug: file.replace(/\.mdx$/, "") }));
}

// export const dynamicParams = false;
