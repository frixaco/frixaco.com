import { Experience } from "@/components/experience";
import { PageContainer } from "@/components/page-container";
import { Projects } from "@/components/projects";
import { Section, SectionDivider } from "@/components/section";
import { Socials } from "@/components/socials";
import Link from "next/link";

export default async function Page() {
  return (
    <PageContainer>
      <Section title="About">
        <div className="flex flex-col gap-2">
          <p className="">
            Software Engineer, love exploring and building cool stuff,
            interested in pretty much everything, breaking free from mediocrity
          </p>
        </div>

        <Socials />
      </Section>

      <SectionDivider />

      <Section title="Projects">
        <Projects />
      </Section>

      <SectionDivider />

      <Section title="Work">
        <Experience />

        <span className="hover:text-cyber-fg hover:underline">
          <Link
            href="/SDE_RESUME_RUSTAM_ASHURMATOV_v1.pdf"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            PDF
          </Link>
        </span>
      </Section>
    </PageContainer>
  );
}
