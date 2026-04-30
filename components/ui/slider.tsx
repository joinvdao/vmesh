import * as React from "react";

import { cn } from "@/lib/utils";

export type SliderProps = React.InputHTMLAttributes<HTMLInputElement>;

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(({ className, ...props }, ref) => {
  return <input ref={ref} type="range" className={cn("accent-[#2f9b93]", className)} {...props} />;
});
Slider.displayName = "Slider";

export { Slider };
