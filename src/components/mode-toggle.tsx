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
        "group bg-cyber-bg-alt absolute right-0 flex h-8 w-8 cursor-pointer flex-row-reverse items-center gap-1.5 overflow-hidden rounded-full p-1.5 transition-all duration-300 ease-out group-hover:justify-center hover:w-[81px]",
        {
          "justify-start": theme === "light",
          "justify-center": theme === "dark",
          "justify-end": theme === "system",
        }
      )}
    >
      <button
        className={cn(
          "text-cyber-grey hover:text-cyber-orange size-fit scale-100 rotate-90 cursor-pointer rounded-full duration-200 ease-out hover:scale-105 hover:rotate-0",
          {
            // "scale-0 group-hover:scale-100": theme !== "light",
          }
        )}
        onClick={() => setTheme("light")}
      >
        <SunIcon size="19.2" />
      </button>
      <button
        className={cn(
          "text-cyber-grey hover:text-cyber-blue size-fit scale-100 -rotate-90 cursor-pointer rounded-full duration-200 ease-out hover:scale-105 hover:rotate-0",
          {
            // "scale-0 group-hover:scale-100": theme !== "dark",
          }
        )}
        onClick={() => setTheme("dark")}
      >
        <MoonIcon size="19.2" />
      </button>
      <button
        className={cn(
          "hover:animate-wiggle text-cyber-grey hover:text-cyber-fg size-fit scale-100 cursor-pointer rounded-full transition-all duration-200 ease-out hover:scale-105",
          {
            // "scale-0 group-hover:scale-100 duration-400": theme !== "system",
          }
        )}
        onClick={() => setTheme("system")}
      >
        <MonitorIcon size="19.2" />
      </button>
    </div>
  );
}
