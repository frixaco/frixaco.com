"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <div className="overflow-hidden flex items-center justify-start w-6 p-1 gap-1 group hover:w-[66px] bg-cyber-bg-alt transition-all ease-out rounded-full duration-300">
      <button
        // TODO: revert degree should be same as rotate degree
        className="size-fit rounded-full hover:animate-in hover:spin-in-90 ease-out duration-500 animate-out spin-out-90 cursor-pointer text-cyber-grey hover:text-cyber-orange hover:scale-105"
        onClick={() => setTheme("light")}
      >
        <SunIcon size="1rem" />
      </button>
      <button
        className="size-fit group-hover:animate-in ease-out scale-50 group-hover:scale-100 transition-transform duration-300 cursor-pointer text-cyber-grey hover:text-cyber-blue hover:scale-105"
        onClick={() => setTheme("dark")}
      >
        <MoonIcon size="1rem" />
      </button>
      <button
        className="size-fit group-hover:animate-in ease-out scale-50 group-hover:scale-100 transition-transform duration-300 delay-50 animate-out fade-out-15 cursor-pointer text-cyber-grey hover:text-cyber-fg hover:scale-105"
        onClick={() => setTheme("system")}
      >
        <MonitorIcon size="1rem" />
      </button>
    </div>
  );
}
