"use client";

/** A pulsing placeholder block. */
export function Skeleton({
  className = "",
  rounded = "rounded-md",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`${rounded} animate-pulse bg-bg-elev2 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Skeleton className="h-9 w-9" rounded="rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-1/3" />
      </div>
    </div>
  );
}
