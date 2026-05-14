import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-[#a7d8d0] bg-[#eef9f6] text-[#2DBA91]",
        neutral: "border-[#B6D9D1] bg-white text-[#5F777C]",
        amber: "border-[#ead7a5] bg-[#fff8e8] text-[#a16207]",
        danger: "border-[#f3b6a5] bg-[#fff1ec] text-[#c2410c]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
