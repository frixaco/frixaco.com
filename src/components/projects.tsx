"use client";

import { shouldIgnoreKey } from "@/lib/hotkeys";
import { useEffect } from "react";

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
      "High performance infinite canvas note-taking and AI chat app (web, desktop) focused on learning/exploration",
  },
  {
    id: 3,
    key: "3",
    title: "letui",
    url: "https://github.com/frixaco/letui",
    tags: ["rust", "typescript", "bun"],
    description:
      "High-performance (<8ms latency) TUI library written from scratch that uses component and signals approaches",
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

export function Projects() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreKey(e)) return;

      const url = projectKeyMap.get(e.key);
      if (url) {
        window.open(url, "_blank");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {projects.map((project) => (
        <a
          key={project.id}
          href={project.url}
          target="_blank"
          className="group flex cursor-pointer flex-col gap-2"
          aria-keyshortcuts={project.key}
          title={`${project.title} (${project.key})`}
        >
          <div className="flex items-center justify-center gap-6">
            <h4 className="w-fit font-semibold hover:underline">
              {project.title} <span className="">[{project.key}]</span>
            </h4>
            {/* <span className="bg-cyber-bg-alt h-0.5 w-12 rounded-full"></span> */}
          </div>

          <p className="">{project.description}</p>

          <div className="flex gap-1 text-xs">
            {project.tags.map((tag) => (
              <span key={tag} className="rounded-sm border px-1">
                {tag}
              </span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}
