"use client";

import { cn } from "@/lib/utils";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ModeToggle() {
  const { setTheme, theme = "system" } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "group bg-cyber-bg-alt absolute right-0 flex h-8 w-8 cursor-pointer flex-row-reverse items-center gap-1.5 overflow-hidden rounded-md p-1.5 transition-all duration-300 ease-out hover:w-[86px]",
        {
          "justify-start": theme === "light",
          "justify-center": theme === "dark",
          "justify-end": theme === "system",
        }
      )}
    >
      <button
        className="text-cyber-grey hover:text-cyber-orange inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full leading-none"
        onClick={() => setTheme("light")}
      >
        <SunIcon className="block h-5 w-5 origin-center rotate-90 transition-transform duration-200 ease-out hover:rotate-0" />
      </button>
      <button
        className="text-cyber-grey hover:text-cyber-blue inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full leading-none"
        onClick={() => setTheme("dark")}
      >
        <MoonIcon className="block h-5 w-5 origin-center -rotate-90 transition-transform duration-200 ease-out hover:rotate-0" />
      </button>
      <button
        className="hover:animate-wiggle text-cyber-grey hover:text-cyber-fg inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full leading-none"
        onClick={() => setTheme("system")}
      >
        <MonitorIcon className="block h-5 w-5" />
      </button>
    </div>
  );
}
