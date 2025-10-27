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

  const translateClass = {
    light: "translate-x-0",
    dark: "translate-x-[28px]",
    system: "translate-x-[56px]",
  }[theme];

  return (
    <div
      className={cn(
        "group bg-cyber-bg-alt relative size-8 cursor-pointer overflow-hidden rounded-md p-1.5 transition-all duration-300 ease-out hover:w-[92px]"
      )}
    >
      <div
        className={cn(
          "absolute top-1.5 right-1.5 flex h-5 w-[76px] items-center gap-2 transition-transform duration-300 ease-out will-change-transform group-hover:translate-x-0",
          translateClass
        )}
      >
        <button
          className="hover:animate-wiggle text-cyber-grey hover:text-cyber-fg inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full leading-none"
          onClick={() => setTheme("system")}
        >
          <MonitorIcon className="block size-5" />
        </button>
        <button
          className="text-cyber-grey hover:text-cyber-blue inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full leading-none"
          onClick={() => setTheme("dark")}
        >
          <MoonIcon className="block size-5 origin-center -rotate-90 transition-transform duration-200 ease-out hover:rotate-0" />
        </button>
        <button
          className="text-cyber-grey hover:text-cyber-orange inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full leading-none"
          onClick={() => setTheme("light")}
        >
          <SunIcon className="block size-5 origin-center rotate-90 transition-transform duration-200 ease-out hover:rotate-0" />
        </button>
      </div>
    </div>
  );
}
