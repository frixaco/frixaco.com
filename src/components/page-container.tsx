import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div
      className={cn("text-cyber-fg/80 flex flex-col gap-8 py-12", className)}
    >
      {children}
    </div>
  );
}
