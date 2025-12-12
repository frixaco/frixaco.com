import { ReactNode } from "react";

interface SectionProps {
  title: string;
  children: ReactNode;
  as?: "h2" | "h3";
}

export function Section({ title, children, as: Heading = "h2" }: SectionProps) {
  return (
    <section className="flex flex-col items-stretch justify-start gap-6">
      <Heading className="text-cyber-fg text-center font-semibold">
        {title}
      </Heading>
      {children}
    </section>
  );
}

export function SectionDivider() {
  return (
    <span className="bg-cyber-bg-alt/60 h-0.5 w-full rounded-full" />
  );
}
