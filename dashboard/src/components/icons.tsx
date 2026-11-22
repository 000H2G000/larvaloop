import type { SVGProps } from "react";

/** Small stroke icon set (24px grid, currentColor). */
const PATHS = {
  overview: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  telemetry: "M22 12h-4l-3 9L9 3l-3 9H2",
  alerts: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  vision: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  trays: "M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  devices: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M9 9h6v6H9z",
  experiments: "M10 2v7.3L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9.3V2M8.5 2h7M7 16h10",
  formulas: "M12 22V12M12 12C12 7 8 4 4 4c0 5 3 8 8 8M12 12c0-5 4-8 8-8 0 5-3 8-8 8",
  feeding: "M3 11h18M5 11a7 7 0 0 0 14 0M12 4v3M8 5l1 2.5M16 5l-1 2.5",
  observations: "M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1M8 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2M9 13l2 2 4-4",
  analytics: "M3 3v18h18M7 16V11M12 16V7M17 16v-3",
  arrow: "M5 12h14M13 6l6 6-6 6",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 16v-4M12 8h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-4", ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** Logo: an acorn whose cap curls into a loop. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M9 13.5c0-3.6 3.1-6 7-6s7 2.4 7 6z" fill="var(--surface)" />
      <path d="M10.2 13.5h11.6c0 6-2.6 10.5-5.8 10.5s-5.8-4.5-5.8-10.5z" fill="var(--surface)" opacity=".75" />
      <path d="M16 7.5c0-2 1.4-3.2 3.2-3.2" stroke="var(--surface)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
