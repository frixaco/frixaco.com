"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Activity({ initial }: { initial: string }) {
  const [activity, setActivity] = useState(initial);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("/api/activity");
      const data = await response.json();
      setActivity(data.activity);
    }, 10 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  let isBroken = activity.startsWith("oops");

  return (
    <div className="flex items-center gap-2 hover:animate-pulse">
      <span className="">now: </span>
      <button
        className={cn({
          "underline hover:text-cyber-pink cursor-pointer": isBroken,
        })}
        onClick={async () => {
          if (!isBroken) return;
          await fetch("/api/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message:
                "whatmedoin API returned un-tracked activity. Update frixaco.com to handle it.",
            }),
          });
        }}
      >
        {activity}
      </button>
    </div>
  );
}
