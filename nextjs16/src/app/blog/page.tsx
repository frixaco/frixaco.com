import path from "path";
import { readdirSync } from "fs";
import Link from "next/link";

export type PostMetadata = {
  title: string;
  date: string;
  description: string;
};

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
    <div className="text-cyber-grey flex flex-col gap-8 pt-6 pb-8">
      {posts.map((post, i) => (
        <Link href={`/blog/${post.slug}`} key={i}>
          <article className="group relative flex cursor-pointer flex-col gap-2 text-sm md:flex-row md:gap-12">
            <div className="flex flex-1 flex-col justify-between gap-1">
              <h3 className="text-cyber-fg group-hover:border-b-cyber-grey line-clamp-1 w-fit truncate border-b border-b-transparent">
                {post.title}
              </h3>
              <p className="">{post.description}</p>
            </div>

            <div className="flex flex-col gap-1 md:items-end">
              <span className="text-xs text-nowrap">{post.date}</span>
              <span className="text-xs text-nowrap">
                255 words | 1 min read
              </span>
            </div>

            {/* <div className="absolute top-0 bottom-0 -left-4 w-0.5 scale-y-0 group-hover:scale-y-100 origin-center group-hover:delay-100 transition-transform duration-300 bg-cyber-grey"></div> */}
            {/* <span className="absolute left-0 bottom-0 -translate-x-5/6 -translate-y-1 -rotate-90 text-cyber-grey text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:delay-100"> */}
            {/*   255 */}
            {/* </span> */}
          </article>
        </Link>
      ))}
    </div>
  );
}
