// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Nexis                               ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝

import { cn } from "@/lib/utils";

/** Dev Dashboard mark — interlocking add/delete knot on a squircle tile.
 * Self-contained palette (dark tile, red/green gradients), so unlike the
 * previous mark it does not recolor with the theme; it reads the same in
 * light and dark. `defs` ids are `dd-`-prefixed because inline SVG ids are
 * document-global — keep them unique if you add another inline mark. */
export function DevDashLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-12", className)}
      aria-label="Dev Dashboard"
    >
      <defs>
        <linearGradient id="dd-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e1e24" />
          <stop offset="100%" stopColor="#121216" />
        </linearGradient>

        <linearGradient id="dd-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="100%" stopColor="#c92a2a" />
        </linearGradient>

        <linearGradient id="dd-green-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#69db7c" />
          <stop offset="100%" stopColor="#2b8a3e" />
        </linearGradient>

        <pattern id="dd-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.03"
          />
        </pattern>

        <filter id="dd-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="5"
            floodColor="#000000"
            floodOpacity="0.75"
          />
        </filter>

        {/* Wedges above and below the centre — clipping a second copy of the
            red pill to these produces the over-under weave. */}
        <clipPath id="dd-overlap-clip">
          <path d="M -150 -150 L 150 -150 L 0 0 Z M -150 150 L 150 150 L 0 0 Z" />
        </clipPath>
      </defs>

      {/* App-icon squircle base */}
      <rect
        x="12"
        y="12"
        width="232"
        height="232"
        rx="52"
        fill="url(#dd-bg-grad)"
        stroke="#2d2d34"
        strokeWidth="2"
      />
      <rect x="12" y="12" width="232" height="232" rx="52" fill="url(#dd-grid)" />

      <g transform="translate(128, 128)">
        <g transform="scale(0.9)">
          <g filter="url(#dd-shadow)">
            {/* Red pill (deletions) */}
            <g transform="rotate(-45)">
              <rect
                x="-36"
                y="-80"
                width="72"
                height="160"
                rx="36"
                fill="none"
                stroke="url(#dd-red-grad)"
                strokeWidth="24"
              />
            </g>

            {/* Green pill (additions) */}
            <g transform="rotate(45)">
              <rect
                x="-36"
                y="-80"
                width="72"
                height="160"
                rx="36"
                fill="none"
                stroke="url(#dd-green-grad)"
                strokeWidth="24"
              />
            </g>

            {/* Clipped red pill — generates the over-under weave */}
            <g clipPath="url(#dd-overlap-clip)">
              <g transform="rotate(-45)">
                <rect
                  x="-36"
                  y="-80"
                  width="72"
                  height="160"
                  rx="36"
                  fill="none"
                  stroke="url(#dd-red-grad)"
                  strokeWidth="24"
                />
              </g>
            </g>
          </g>

          {/* Addition marks, inside the green loops */}
          <g
            transform="rotate(45)"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M -10 -44 L 10 -44 M 0 -54 L 0 -34" />
            <path d="M -10 44 L 10 44 M 0 34 L 0 54" />
          </g>

          {/* Deletion marks, inside the red loops */}
          <g
            transform="rotate(-45)"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M -10 -44 L 10 -44" />
            <path d="M -10 44 L 10 44" />
          </g>

          {/* Central repo hub */}
          <circle cx="0" cy="0" r="14" fill="#1e1e24" stroke="#ffffff" strokeWidth="4" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
      </g>
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
