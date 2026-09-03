import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type StickyRailProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function StickyRail({ children, className = "", ...props }: StickyRailProps) {
  return (
    <aside
      className={clsx(
        "smart-sticky-rail min-[901px]:sticky min-[901px]:top-[calc(var(--header-h)+var(--s5))] min-[901px]:self-start min-[901px]:max-h-[calc(100vh-var(--header-h)-var(--s5))] min-[901px]:overflow-x-hidden min-[901px]:overflow-y-auto min-[901px]:overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}
