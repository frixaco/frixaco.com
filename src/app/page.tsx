import { Activity } from "@/components/activity";
import { getActivity } from "@/lib/get-activity";
import { Suspense } from "react";

export const experimental_ppr = true;

const FallbackActivity = () => {
  return <span className="">...</span>;
};

async function ActivityWrapper() {
  const initial = await getActivity();

  return <Activity initial={initial} />;
}

export default async function Page() {
  return (
    <div className="flex flex-col gap-8 text-cyber-grey">
      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-cyber-fg">about</h3>

          <Suspense fallback={<FallbackActivity />}>
            <ActivityWrapper />
          </Suspense>
        </div>

        <p className="">
          software engineer, love exploring and building cool stuff, interested
          in pretty much everything, breaking free from mediocrity
        </p>
      </section>

      <span className="w-full rounded-full h-0.5 bg-cyber-bg-alt"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <h3 className="font-semibold text-cyber-fg">projects</h3>

        <div className="grid grid-cols-2 grid-rows-2 gap-8">
          <div className="flex flex-col gap-2 cursor-pointer">
            <h4 className="text-cyber-fg">anitrack</h4>
            <p className="flex-1">
              Simple TUI to help me watch anime in 4k without extra steps, built
              with my TUI library - <b>letui</b>
            </p>
            <div className="flex gap-1 text-cyber-grey text-xs">
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                letui
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                typescript
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                rust
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 cursor-pointer">
            <h4 className="text-cyber-fg">aitetsu</h4>
            <p className="flex-1">
              High performance infinite canvas note-taking and AI chat web and
              desktop app
            </p>
            <div className="flex gap-1 text-cyber-grey text-xs">
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                tauri
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                typescript
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                rust
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 cursor-pointer">
            <h4 className="text-cyber-fg">letui</h4>
            <p className="flex-1">
              Component-based TUI library written from scratch
            </p>
            <div className="flex gap-1 text-cyber-grey text-xs">
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                rust
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                typescript
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">bun</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 cursor-pointer">
            <h4 className="text-cyber-fg">whatmedoin</h4>
            <p className="flex-1">
              Personal activity tracker for macOS, Windows and browser, tracks
              open tabs and programs
            </p>
            <div className="flex gap-1 text-cyber-grey text-xs">
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                rust
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">
                typescript
              </span>
              <span className="rounded-md px-1 bg-cyber-bg-highlight">bun</span>
            </div>
          </div>
        </div>
      </section>

      <span className="w-full rounded-full h-0.5 bg-cyber-bg-alt"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-cyber-fg">experience</h3>

          <span className="text-cyber-grey hover:text-cyber-fg hover:underline font-semibold">
            <a href="/SDE_RESUME_RUSTAM_ASHURMATOV_v1.pdf" target="_blank">
              PDF
            </a>
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://vbrato.com" target="_blank">
                VBRATO
              </a>
            </h4>
            <span className="">May, 2023 - Present</span>
          </div>

          <p className="">
            Building an all‑in‑one platform for music industry people to
            collaborate and monetize their work. Full‑stack work on everything
            from scalable AWS microservices to leading Next.js web platform and
            helping out on mobile.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://geoalert.io" target="_blank">
                GeoAlert
              </a>
            </h4>
            <span className="">Dec 2022 - Jun 2023</span>
          </div>

          <p className="">
            Built the frontend for Keycloak‑based authentication and a
            multi‑account dashboard with advanced monitoring tools. Bunch of
            maintenance and bug fixing.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://livereach.com" target="_blank">
                Livereach
              </a>
            </h4>
            <span className="">Nov 2021 - Jan 2023</span>
          </div>

          <p className="">
            Led Angular → React migration, built lightweight state management
            for embeddable apps, and boosted quality with E2E testing and style
            standardization across projects.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://www.instagram.com/moishlem" target="_blank">
                Moishlem
              </a>
            </h4>
            <span className="">Aug 2020 - Oct 2021</span>
          </div>

          <p className="">
            Built payments and subscription systems for a sports insurance
            platform. Developed an internal admin dashboard and re‑architected
            PostgreSQL database schema to support multiple backends.
          </p>
        </div>
      </section>
    </div>
  );
}
