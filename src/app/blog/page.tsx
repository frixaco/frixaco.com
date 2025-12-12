import path from "path";
import { readdirSync } from "fs";
import Link from "next/link";

export type PostMetadata = {
  title: string;
  date: string;
  description: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function Page() {
  const postsDir = path.join(process.cwd(), "src", "content");
  const files = readdirSync(postsDir);

  const posts: (PostMetadata & { slug: string })[] = await Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .map(async (file) => {
        const slug = file.replace(/\.mdx$/, "");
        const { metadata } = await import(`@/content/${slug}.mdx`);
        return { ...metadata, slug };
      })
  );
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex size-full min-h-screen flex-col gap-8 py-12">
      <h1 className="sr-only">Blog</h1>
      {posts.map((post) => (
        <Link href={`/blog/${post.slug}`} key={post.slug}>
          <article className="group relative flex cursor-pointer flex-col gap-2 sm:flex-row sm:gap-4 md:gap-12">
            <div className="flex flex-row justify-between pt-0.5 sm:flex-col sm:gap-1 sm:self-start md:items-end">
              <span className="text-nowrap">{formatDate(post.date)}</span>
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <h2 className="text-cyber-fg line-clamp-1 w-fit truncate font-semibold hover:underline">
                {post.title}
              </h2>
              <p className="line-clamp-2 sm:line-clamp-none">
                {post.description}
              </p>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
