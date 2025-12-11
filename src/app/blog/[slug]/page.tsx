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
    <div className="prose-invert prose-img:mx-auto prose-h1:text-center prose-headings:pb-4 prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-a:hover:text-pink-500 prose-a:underline py-12">
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
