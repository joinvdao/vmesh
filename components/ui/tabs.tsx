"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ children, className }: TabsProps) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-[8px] bg-[#eef5f3] p-1", className)} {...props} />;
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  activeValue: string;
}

function TabsTrigger({ value, activeValue, className, ...props }: TabsTriggerProps) {
  const active = value === activeValue;
  return (
    <button
      className={cn(
        "rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-white text-[#0f766e] shadow-sm" : "text-[#6a7885] hover:text-[#0f766e]",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-3", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
