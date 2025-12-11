"use client";

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

export function Experience() {
  return (
    <>
      {experience.map((exp) => (
        <div key={exp.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              <span className="bg-cyber-bg-alt h-0.5 w-12 rounded-full"></span>
              <h4 className="text-cyber-fg hover:underline">
                <a href={exp.url} target="_blank">
                  {exp.company}
                </a>
              </h4>
            </div>

            <span className="">{exp.period}</span>
          </div>

          <p className="">{exp.description}</p>
        </div>
      ))}
    </>
  );
}
