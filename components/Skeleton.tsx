import { twMerge } from "tailwind-merge";

/**
 * Loading placeholders that match the shape of what is arriving.
 *
 * Every route previously rendered a single centred BounceLoader, which tells
 * the reader nothing about what is coming and causes a full layout shift when
 * the real content lands.
 *
 * The shimmer is decorative: it sits behind aria-hidden and the surrounding
 * container carries the status role, so a screen reader hears "Loading" once
 * rather than reading out a wall of empty boxes.
 */
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={twMerge(
      "relative overflow-hidden rounded-md bg-surface-raised",
      "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
      "after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent",
      className
    )}
  />
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col gap-y-3 rounded-md bg-neutral-400/5 p-3">
        <SkeletonBlock className="aspect-square w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="flex flex-col gap-y-3 w-full px-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-x-4 w-full">
        <SkeletonBlock className="h-12 w-12 shrink-0" />
        <div className="flex flex-1 flex-col gap-y-2">
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-3 w-1/5" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonHeader: React.FC = () => (
  <div className="p-6">
    <div className="mt-20 flex flex-col md:flex-row items-center gap-x-5">
      <SkeletonBlock className="h-32 w-32 lg:h-44 lg:w-44" />
      <div className="flex flex-col gap-y-3 mt-4 md:mt-0">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-12 w-64" />
      </div>
    </div>
  </div>
);

export const SkeletonPage: React.FC<{
  variant?: "grid" | "list";
  label?: string;
}> = ({ variant = "grid", label = "Loading" }) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="bg-surface rounded-lg h-full w-full overflow-hidden"
  >
    <span className="sr-only">{label}</span>
    <SkeletonHeader />
    <div className="px-4 md:px-6 pb-6">
      {variant === "grid" ? <SkeletonGrid /> : <SkeletonList />}
    </div>
  </div>
);
