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
        "absolute right-0 overflow-hidden cursor-pointer flex flex-row-reverse items-center w-8 h-8 p-1.5 gap-1.5 group hover:w-[82px] bg-cyber-bg-alt transition-all ease-out rounded-full duration-300",
        {
          "justify-start": theme === "light",
          "justify-center": theme === "dark",
          "justify-end": theme === "system",
        }
      )}
    >
      <button
        className={cn(
          "size-fit rounded-full hover:rotate-0 ease-out duration-200 rotate-90 cursor-pointer text-cyber-grey hover:text-cyber-orange hover:scale-105 scale-100",
          {
            // "scale-0 group-hover:scale-100": theme !== "light",
          }
        )}
        onClick={() => setTheme("light")}
      >
        <SunIcon size="19" />
      </button>
      <button
        className={cn(
          "size-fit rounded-full hover:rotate-0 ease-out duration-200 -rotate-90 cursor-pointer text-cyber-grey hover:text-cyber-blue hover:scale-105 scale-100",
          {
            // "scale-0 group-hover:scale-100": theme !== "dark",
          }
        )}
        onClick={() => setTheme("dark")}
      >
        <MoonIcon size="19" />
      </button>
      <button
        className={cn(
          "size-fit rounded-full transition-all hover:animate-wiggle ease-out duration-200 cursor-pointer text-cyber-grey hover:text-cyber-fg hover:scale-105 scale-100",
          {
            // "scale-0 group-hover:scale-100 duration-400": theme !== "system",
          }
        )}
        onClick={() => setTheme("system")}
      >
        <MonitorIcon size="19" />
      </button>
    </div>
  );
}
