import { Await, createFileRoute } from '@tanstack/react-router'
import { Activity } from '@/components/activity'
import { Experience } from '@/components/experience'
import { Projects } from '@/components/projects'
import { Socials } from '@/components/socials'
import { getActivity } from '@/lib/get-activity'

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => ({
    deferredActivity: getActivity(),
  }),
})

function App() {
  const { deferredActivity } = Route.useLoaderData()

  return (
    <div className="text-cyber-grey flex flex-col gap-8 pt-6 pb-8">
      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-cyber-fg font-semibold">about</h3>

          <Await
            promise={deferredActivity}
            fallback={<span className="">...</span>}
          >
            {(initial) => <Activity initial={initial} />}
          </Await>
        </div>

        <p className="">
          software engineer, love exploring and building cool stuff, interested
          in pretty much everything, breaking free from mediocrity
        </p>

        <Socials />
      </section>

      <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <h3 className="text-cyber-fg font-semibold">projects</h3>

        <Projects />
      </section>

      <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-cyber-fg font-semibold">experience</h3>

          <span className="text-cyber-grey hover:text-cyber-fg font-semibold hover:underline">
            <a
              href="/SDE_RESUME_RUSTAM_ASHURMATOV_v1.pdf"
              target="_blank"
              aria-label="Download resume as PDF"
            >
              PDF
            </a>
          </span>
        </div>

        <Experience />
      </section>
    </div>
  )
}
