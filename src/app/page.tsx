import { Activity } from "@/components/activity";
import { getActivity } from "@/lib/get-activity";
import { Suspense } from "react";

export const experimental_ppr = true;

const FallbackActivity = () => {
  return <span className="">...</span>;
};

export default async function Page() {
  const initial = await getActivity();

  return (
    <div className="flex flex-col gap-10 text-cyber-grey">
      <section className="flex flex-col items-stretch justify-start gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs text-cyber-fg">about</h3>

          <Suspense fallback={<FallbackActivity />}>
            <Activity initial={initial} />
          </Suspense>
        </div>

        <p className="">
          software engineer, love exploring and building cool stuff, interested
          in pretty much everything, breaking free from mediocrity
        </p>
      </section>

      <section className="flex flex-col items-stretch justify-start gap-4">
        <h3 className="font-semibold text-xs text-cyber-fg">projects</h3>
        <div></div>
      </section>

      <section className="flex flex-col items-stretch justify-start gap-4">
        <h3 className="font-semibold text-xs text-cyber-fg">experience</h3>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://vbrato.com" target="_blank">
                VBRATO
              </a>
            </h4>
            <span className="text-sm">May, 2023 - Present</span>
          </div>

          <p className="text-sm">
            Building an all‑in‑one platform for music industry pros to
            collaborate and monetize. Full‑stack work on everything from
            scalable AWS microservices to realtime messaging and mobile playback
            features.
            {/* Building all-in-one platform for music industry people to */}
            {/* collaborate and monetize their work. Worked on every single */}
            {/* techinical aspect of the product and currently continuing to do */}
            {/* fully full-stack work. */}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://geoalert.io" target="_blank">
                GeoAlert
              </a>
            </h4>
            <span className="text-sm">Dec 2022 - Jun 2023</span>
          </div>

          <p className="text-sm">
            Delivering AI‑powered geospatial insights through clean, intuitive
            UIs. Built the frontend for Keycloak‑based authentication and a
            multi‑account dashboard with advanced monitoring tools.
            {/* Designing and developing intuitive UIs to bring AI-powered */}
            {/* geospatial insights from satellite imagery to end users. Building */}
            {/* authentication with Keycloak and developing a multi-account */}
            {/* dashboard with advanced monitoring features on the frontend. */}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://livereach.com" target="_blank">
                Livereach
              </a>
            </h4>
            <span className="text-sm">Nov 2021 - Apr 2023</span>
          </div>

          <p className="text-sm">
            Worked on complex feature‑rich social media aggregation platform.
            Led Angular → React migration, built lightweight state management
            for embeddable apps, and boosted quality with E2E testing and style
            standardization.
            {/* Worked on a large-scale performant social media aggregator web */}
            {/* platform. Lead Angular to React migration without breaking anything */}
            {/* for end users. Designed small custom state management to optimize */}
            {/* embeddable web app, improved code quality across multiple projects */}
            {/* and covered everything with E2E tests. */}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-cyber-fg hover:underline">
              <a href="https://www.instagram.com/moishlem" target="_blank">
                Moishlem
              </a>
            </h4>
            <span className="text-sm">Aug 2020 - Oct 2021</span>
          </div>

          <p className="text-sm">
            Built payments and subscription systems for a sports insurance
            platform. Developed an internal admin dashboard and re‑architected
            PostgreSQL to support multiple backends.
            {/* Developed core payment data systems powering a subscription‑based */}
            {/* sport insurance platform. Built internal admin dashboard and */}
            {/* re-architected the database to efficiently support multiple */}
            {/* backends. */}
          </p>
        </div>
      </section>
    </div>
  );
}
