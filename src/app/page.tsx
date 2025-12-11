import { Activity } from "@/components/activity";
import { Experience } from "@/components/experience";
import { Projects } from "@/components/projects";
import { Socials } from "@/components/socials";
import { getActivity } from "@/lib/get-activity";
import { Suspense } from "react";

const FallbackActivity = () => {
  return <span className="">...</span>;
};

async function ActivityWrapper() {
  const initial = await getActivity();

  return <Activity initial={initial} />;
}

export default async function Page() {
  return (
    <div className="text-cyber-fg/80 flex flex-col gap-8 py-12">
      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex flex-col items-center justify-between gap-2">
          <h3 className="text-cyber-fg font-semibold">about</h3>

          <Suspense fallback={<FallbackActivity />}>
            <ActivityWrapper />
          </Suspense>
        </div>

        <p className="">
          software engineer, love exploring and building cool stuff, interested
          in pretty much everything, breaking free from mediocrity
        </p>

        <Socials />
      </section>

      <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <h3 className="text-cyber-fg text-center font-semibold">projects</h3>

        <Projects />
      </section>

      <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-cyber-fg text-center font-semibold">
            experience
          </h3>

          <span className="hover:text-cyber-fg text-center font-semibold hover:underline">
            <a
              href="/SDE_RESUME_RUSTAM_ASHURMATOV_v1.pdf"
              target="_blank"
              className="underline"
            >
              View PDF
            </a>
          </span>
        </div>

        <Experience />
      </section>
    </div>
  );
}
