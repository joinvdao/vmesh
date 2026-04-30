"use client";

import * as React from "react";

interface TooltipProviderProps {
  children: React.ReactNode;
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-[#dfe8e6] bg-white px-2 py-1 text-[11px] text-[#52616f] shadow-lg group-hover:block">
        {label}
      </span>
    </span>
  );
}

export { Tooltip, TooltipProvider };
