import * as React from "react";

import { cn } from "@/lib/utils";

function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-[#e6eeec]", className)} role="separator" {...props} />;
}

export { Separator };
