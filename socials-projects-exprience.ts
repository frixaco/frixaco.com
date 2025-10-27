function shouldIgnoreKey(e: KeyboardEvent): boolean {
  const target = e.target as Element | null;

  const isEditable =
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]',
      ) || (target as HTMLElement).isContentEditable,
    );

  return (
    isEditable ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey ||
    e.isComposing ||
    e.repeat
  );
}

const socials = [
  {
    id: 1,
    key: "g",
    name: "[g]ithub",
    url: "https://github.com/frixaco",
  },
  {
    id: 2,
    key: "t",
    name: "[t]elegram",
    url: "https://t.me/frixaco",
  },
  {
    id: 3,
    key: "l",
    name: "[l]inkedin",
    url: "https://linkedin.com/in/frixaco",
  },
  {
    id: 4,
    key: "x",
    name: "[x]",
    url: "https://x.com/frixaco",
  },
  {
    id: 5,
    key: "d",
    name: "[d]iscord",
    url: "https://discordapp.com/users/497957331112427540",
  },
  {
    id: 6,
    key: "e",
    name: "[e]mail",
    url: "mailto:rr.ashurmatov.21@gmail.com",
  },
];
const socialKeyMap = new Map(socials.map((s) => [s.key, s.url]));

const handleSocialShortcuts = (e: KeyboardEvent) => {
  if (shouldIgnoreKey(e)) return;

  const url = socialKeyMap.get(e.key.toLowerCase());
  if (url) {
    window.open(url, "_blank");
  }
};

document.addEventListener("keydown", handleSocialShortcuts);

const projects = [
  {
    id: 1,
    key: "1",
    title: "anitrack",
    url: "https://github.com/frixaco/anitrack",
    tags: ["letui", "typescript", "rust"],
    description:
      "Simple TUI to help me watch anime in 4k without extra steps, built with my TUI library - letui",
  },
  {
    id: 2,
    key: "2",
    title: "aitetsu",
    url: "https://github.com/frixaco/aitetsu",
    tags: ["tauri", "typescript", "rust"],
    description:
      "High performance infinite canvas note-taking and AI chat web and desktop app",
  },
  {
    id: 3,
    key: "3",
    title: "letui",
    url: "https://github.com/frixaco/letui",
    tags: ["rust", "typescript", "bun"],
    description: "Component-based TUI library written from scratch",
  },
  {
    id: 4,
    key: "4",
    title: "whatmedoin",
    url: "https://github.com/frixaco/whatmedoin",
    tags: ["rust", "typescript", "bun"],
    description:
      "Personal activity tracker for macOS, Windows and browser, tracks open tabs and programs",
  },
];

const projectKeyMap = new Map(projects.map((p) => [p.key, p.url]));

const handleProjectsShortcuts = (e: KeyboardEvent) => {
  if (shouldIgnoreKey(e)) return;

  const url = projectKeyMap.get(e.key);
  if (url) {
    window.open(url, "_blank");
  }
};

document.addEventListener("keydown", handleProjectsShortcuts);

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
