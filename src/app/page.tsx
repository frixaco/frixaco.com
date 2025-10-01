import { Activity } from "@/components/activity";
import { getActivity } from "@/lib/get-activity";
import { Suspense } from "react";

export const experimental_ppr = true;

const FallbackActivity = () => {
  return <span className="text-cyber-red animate-pulse">...</span>;
};

export default async function Page() {
  const initial = await getActivity();

  return (
    <div className="flex flex-col gap-10 text-cyber-grey">
      <section className="flex flex-col items-start justify-start gap-2">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-semibold text-xs text-cyber-bg-highlight">
            about
          </h3>

          <Suspense fallback={<FallbackActivity />}>
            <Activity initial={initial} />
          </Suspense>
        </div>

        <p className="">
          software engineer, love exploring and building cool stuff, interested
          in pretty much everything, breaking free from mediocrity
        </p>
      </section>

      <section className="flex flex-col items-start justify-start gap-2">
        <h3 className="font-semibold text-xs text-cyber-bg-highlight">
          projects
        </h3>
        <div></div>
      </section>

      <section className="flex flex-col items-start justify-start gap-2">
        <h3 className="font-semibold text-xs text-cyber-bg-highlight">
          experience
        </h3>
        <div></div>
      </section>
    </div>
  );
}
