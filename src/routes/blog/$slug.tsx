import { createFileRoute } from '@tanstack/react-router'

export type PostMetadata = {
  title: string
  date: string
  description: string
}

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    // TODO: Find a fully-typed and cleaner way to import and render MDX
    const posts = import.meta.glob<any>('../../content/*.mdx', {
      eager: true,
      import: 'default',
    })
    const post = posts[`../../content/${params.slug}.mdx`]
    return { post }
  },
  component: PostComponent,
})

function PostComponent() {
  const { post } = Route.useLoaderData()
  const Content = post
  return (
    <div className="prose-invert prose-img:mx-auto prose-headings:pb-4 prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-a:hover:text-pink-500 prose-a:underline">
      <Content />
    </div>
  )
}
