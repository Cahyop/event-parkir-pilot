import { cn } from "@/lib/utils";

interface TabIconProps {
  className?: string;
  active?: boolean;
}

export function CheckInIcon({ className, active }: TabIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      {active ? (
        <path d="M10 17l5-5-5-5M15 12H3" stroke="#fff" strokeOpacity="0" />
      ) : null}
      <path d="M3 12h12m-5-5 5 5-5 5" />
    </svg>
  );
}

export function CheckOutIcon({ className }: TabIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM16 14v6M13 17h6" />
    </svg>
  );
}

export function ReportIcon({ className }: TabIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      aria-hidden
    >
      <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
    </svg>
  );
}
