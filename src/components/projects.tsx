"use client";

import { shouldIgnoreKey } from "@/lib/hotkeys";
import { useEffect } from "react";

const projects = [
  {
    id: 1,
    key: "1",
    title: "Anitrack",
    url: "https://github.com/frixaco/anitrack",
    tags: ["letui", "typescript", "rust"],
    description:
      "Simple TUI to help me watch anime in 4k without extra steps, built with my TUI library - letui",
  },
  {
    id: 2,
    key: "2",
    title: "AItetsu",
    url: "https://github.com/frixaco/aitetsu",
    tags: ["tauri", "typescript", "rust"],
    description:
      "High performance infinite canvas note-taking and AI chat app (web, desktop) focused on learning/exploration",
  },
  {
    id: 3,
    key: "3",
    title: "LeTUI",
    url: "https://github.com/frixaco/letui",
    tags: ["rust", "typescript", "bun"],
    description:
      "High-performance (<8ms latency) TUI library written from scratch that uses component and signals approaches",
  },
  {
    id: 4,
    key: "4",
    title: "WhatMeDoin",
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
        <div className="group flex flex-col gap-2" key={project.id}>
          <a
            href={project.url}
            target="_blank"
            aria-keyshortcuts={project.key}
            title={`${project.title} (${project.key})`}
          >
            <div className="flex items-center justify-start gap-6 md:justify-center">
              <h3 className="w-fit font-semibold hover:underline">
                {project.title}
              </h3>
              {/* <span className="bg-cyber-bg-alt h-0.5 w-12 rounded-full"></span> */}
            </div>
          </a>

          <p className="">{project.description}</p>

          <div className="flex gap-3 font-mono text-xs">
            {project.tags.map((tag) => (
              <span key={tag} className="">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
