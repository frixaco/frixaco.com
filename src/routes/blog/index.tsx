import { Link, createFileRoute } from '@tanstack/react-router'

export type PostMetadata = {
  title: string
  date: string
  description: string
}

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    const files = import.meta.glob<PostMetadata>('../../content/*.mdx', {
      eager: true,
      import: 'metadata',
    })

    const posts = Object.entries(files).map(([fileName, metadata]) => {
      return {
        slug: fileName.replace(/\.mdx$/, '').replace('../../content/', ''),
        ...metadata,
      }
    })

    posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    return { posts }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { posts } = Route.useLoaderData()
  return (
    <div className="text-cyber-grey flex flex-col gap-8 pt-6 pb-8">
      {posts.map((post, i) => (
        <Link to="/blog/$slug" params={{ slug: post.slug }} key={i}>
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
  )
}
