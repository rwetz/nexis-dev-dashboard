// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Nexis                               ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝

import { cn } from "@/lib/utils";

/** Dev Dashboard mark — Nexis-family tile with three repo rows + status dots
 * (clean / dirty / ahead). Tile recolors via currentColor; the row bars punch
 * through in var(--background) so the mark reads in both light and dark. */
export function DevDashLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-12", className)}
      aria-label="Dev Dashboard"
    >
      <rect width="48" height="48" rx="12" fill="currentColor" className="text-foreground" />
      <circle cx="13" cy="15" r="3" fill="#34D399" />
      <rect x="20" y="12.5" width="17" height="5" rx="2.5" fill="var(--background)" />
      <circle cx="13" cy="24" r="3" fill="#FBBF24" />
      <rect x="20" y="21.5" width="12" height="5" rx="2.5" fill="var(--background)" />
      <circle cx="13" cy="33" r="3" fill="#38BDF8" />
      <rect x="20" y="30.5" width="15" height="5" rx="2.5" fill="var(--background)" />
    </svg>
  );
}

export function NexisLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-12", className)}
      aria-label="Nexis"
    >
      <rect width="48" height="48" rx="12" fill="currentColor" className="text-foreground" />
      {/* Terminal prompt cursor — left bar */}
      <rect x="10" y="10" width="4" height="28" rx="2" fill="white" />
      {/* Diagonal slash — N shape */}
      <path
        d="M14 10 L34 38"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Right bar */}
      <rect x="34" y="10" width="4" height="28" rx="2" fill="white" />
    </svg>
  );
}
