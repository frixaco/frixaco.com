import { Activity } from "@/components/activity";
import { getActivity } from "@/lib/get-activity";
import { Suspense } from "react";

const projects = [
  {
    id: 1,
    title: "anitrack",
    tags: ["letui", "typescript", "rust"],
    description:
      "Simple TUI to help me watch anime in 4k without extra steps, built with my TUI library - letui",
  },
  {
    id: 2,
    title: "aitetsu",
    tags: ["tauri", "typescript", "rust"],
    description:
      "High performance infinite canvas note-taking and AI chat web and desktop app",
  },
  {
    id: 3,
    title: "letui",
    tags: ["rust", "typescript", "bun"],
    description: "Component-based TUI library written from scratch",
  },
  {
    id: 4,
    title: "whatmedoin",
    tags: ["rust", "typescript", "bun"],
    description:
      "Personal activity tracker for macOS, Windows and browser, tracks open tabs and programs",
  },
];

const experience = [
  {
    id: 1,
    company: "VBRATO",
    url: "https://vbrato.com",
    period: "May, 2023 - Present",
    description:
      "Building an all‑in‑one platform for music industry people to collaborate and monetize their work. Full‑stack work on everything from scalable AWS microservices to leading Next.js web platform and helping out on mobile.",
  },
  {
    id: 2,
    company: "GeoAlert",
    url: "https://geoalert.io",
    period: "Dec 2022 - Jun 2023",
    description:
      "Built the frontend for Keycloak‑based authentication and a multi‑account dashboard with advanced monitoring tools. Bunch of maintenance and bug fixing.",
  },
  {
    id: 3,
    company: "Livereach",
    url: "https://livereach.com",
    period: "Nov 2021 - Jan 2023",
    description:
      "Led Angular → React migration, built lightweight state management for embeddable apps, and boosted quality with E2E testing and style standardization across projects.",
  },
  {
    id: 4,
    company: "Moishlem",
    url: "https://www.instagram.com/moishlem",
    period: "Aug 2020 - Oct 2021",
    description:
      "Built payments and subscription systems for a sports insurance platform. Developed an internal admin dashboard and re‑architected PostgreSQL database schema to support multiple backends.",
  },
  {
    id: 5,
    company: "Hitide",
    url: undefined,
    period: "Dec 2020 - Feb 2021",
    description:
      "Automated product, order and payment workflows, saving hundreds of hours of manual work",
  },
];

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
    <div className="text-cyber-grey flex flex-col gap-8 pt-6 pb-8">
      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-cyber-fg font-semibold">about</h3>

          <Suspense fallback={<FallbackActivity />}>
            <ActivityWrapper />
          </Suspense>
        </div>

        <p className="">
          software engineer, love exploring and building cool stuff, interested
          in pretty much everything, breaking free from mediocrity
        </p>
      </section>

      <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <h3 className="text-cyber-fg font-semibold">projects</h3>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group flex cursor-pointer flex-col gap-2"
            >
              <h4 className="text-cyber-fg group-hover:border-b-cyber-grey w-fit border-b border-b-transparent">
                {project.title}
              </h4>
              <p className="">{project.description}</p>
              <div className="text-cyber-grey flex gap-1 text-xs">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-cyber-bg-highlight rounded-md px-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>

      <section className="flex flex-col items-stretch justify-start gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-cyber-fg font-semibold">experience</h3>

          <span className="text-cyber-grey hover:text-cyber-fg font-semibold hover:underline">
            <a href="/SDE_RESUME_RUSTAM_ASHURMATOV_v1.pdf" target="_blank">
              PDF
            </a>
          </span>
        </div>

        {experience.map((exp) => (
          <div key={exp.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-cyber-fg hover:underline">
                <a href={exp.url} target="_blank">
                  {exp.company}
                </a>
              </h4>
              <span className="">{exp.period}</span>
            </div>

            <p className="">{exp.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
