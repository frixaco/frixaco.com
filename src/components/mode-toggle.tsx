"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <div className="absolute top-0 -left-8 overflow-hidden cursor-pointer flex flex-col items-center justify-start w-8 h-8 p-1.5 gap-1.5 group hover:h-[82px] bg-cyber-bg-alt transition-all ease-out rounded-full duration-300">
      <button
        className="size-fit rounded-full hover:animate-in hover:spin-in-90 ease-out duration-200 animate-out spin-out-90 cursor-pointer text-cyber-grey hover:text-cyber-orange hover:scale-105"
        onClick={() => setTheme("light")}
      >
        <SunIcon size="1.2rem" />
      </button>
      <button
        className="size-fit rounded-full hover:rotate-0 ease-out duration-200 -rotate-90 cursor-pointer text-cyber-grey hover:text-cyber-blue scale-0 hover:scale-105 group-hover:scale-100"
        onClick={() => setTheme("dark")}
      >
        <MoonIcon size="1.2rem" />
      </button>
      <button
        className="size-fit rounded-full transition-all hover:animate-wiggle ease-out duration-200 cursor-pointer text-cyber-grey hover:text-cyber-fg scale-0 hover:scale-105 group-hover:scale-100"
        onClick={() => setTheme("system")}
      >
        <MonitorIcon size="1.2rem" />
      </button>
    </div>
  );
}
