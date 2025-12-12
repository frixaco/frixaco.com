"use client";

import { shouldIgnoreKey } from "@/lib/hotkeys";
import { useEffect } from "react";
import { LinkIcon, MoveUpRightIcon } from "lucide-react";

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

export function Socials() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreKey(e)) return;

      const url = socialKeyMap.get(e.key.toLowerCase());
      if (url) {
        window.open(url, "_blank");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-start gap-6 md:gap-8">
      {socials.map((social) => (
        <a
          key={social.id}
          href={social.url}
          target="_blank"
          className="hover:text-cyber-fg group flex items-center hover:underline"
          aria-keyshortcuts={social.key}
          title={`${social.name} (${social.key})`}
        >
          <span>{social.name}</span>{" "}
          <MoveUpRightIcon className="mt-0.5 size-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      ))}
    </div>
  );
}
