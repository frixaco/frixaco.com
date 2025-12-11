"use client";

import { cn } from "@/lib/utils";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ModeToggle() {
  const { setTheme, theme = "system" } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  if (!mounted) {
    return null;
  }

  const translateClass = {
    light: "-translate-y-[56px]",
    dark: "-translate-y-[28px]",
    system: "translate-y-0",
  }[theme];

  return (
    <div className="relative size-8">
      <div
        className={cn(
          "group bg-cyber-bg-alt absolute top-0 left-0 z-10 size-8 cursor-pointer overflow-hidden rounded-md p-1.5 transition-all duration-300 ease-out hover:h-[92px]",
          isOpen && "h-[92px]"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
      <div
        className={cn(
          "absolute top-1.5 left-1.5 flex h-[76px] w-5 flex-col items-center gap-2 transition-transform duration-300 ease-out will-change-transform group-hover:translate-y-0",
          translateClass,
          isOpen && "translate-y-0"
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
    </div>
  );
}
