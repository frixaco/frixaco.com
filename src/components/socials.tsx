"use client";

import { shouldIgnoreKey } from "@/lib/hotkeys";
import { useEffect } from "react";

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
        document.open(url, "_blank", "noopener,noreferrer");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-6">
      {socials.map((social) => (
        <a
          key={social.id}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-cyber-fg"
          aria-keyshortcuts={social.key}
          title={`${social.name} (${social.key})`}
        >
          {social.name}
        </a>
      ))}
    </div>
  );
}
