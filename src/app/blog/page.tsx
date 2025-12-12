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
      {posts.map((post, i) => (
        <Link href={`/blog/${post.slug}`} key={i}>
          <article className="group relative flex cursor-pointer flex-col gap-2 text-sm sm:flex-row sm:gap-4 md:gap-12">
            <div className="flex flex-row justify-between pt-0.5 sm:flex-col sm:gap-1 sm:self-start md:items-end">
              <span className="text-xs text-nowrap">
                {formatDate(post.date)}
              </span>
              {/* <div className="flex text-xs"> */}
              {/*   <span className="hidden text-nowrap sm:inline"> */}
              {/*     255 words&nbsp;·&nbsp; */}
              {/*   </span> */}
              {/*   <span className="text-nowrap">1 min read</span> */}
              {/* </div> */}
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <h3 className="text-cyber-fg line-clamp-1 w-fit truncate font-semibold hover:underline">
                {post.title}
              </h3>
              <p className="hidden sm:block">{post.description}</p>
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
