import type { ReactNode } from "react";
import type { IconName } from "../types";

const ICONS: Record<IconName, ReactNode> = {
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M7.5 15.5l4-4 3 3 5-6.5" />
    </>
  ),
  heart: (
    <path d="M20.8 5.9a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.1a5.4 5.4 0 1 0-7.7 7.7L12 22l8.8-8.4a5.4 5.4 0 0 0 0-7.7Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4.5A3 3 0 0 0 6.6 8a3 3 0 0 0-1.3 5.3A3.2 3.2 0 0 0 8 18.6a3 3 0 0 0 4 1.9V4.5Z" />
      <path d="M14.5 4.5A3 3 0 0 1 17.4 8a3 3 0 0 1 1.3 5.3 3.2 3.2 0 0 1-2.7 5.3 3 3 0 0 1-4 1.9V4.5Z" />
      <path d="M9 9h1.5M13.5 9H15M9 13.5h1.5M13.5 13.5H15" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3 7.8 7.5 9.5 4.5-1.7 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  rocket: (
    <>
      <path d="M13.5 4.5c2.9-2.3 6.6-2 6.6-2s.3 3.7-2 6.6l-4.3 5.4-6.3-6.3 6-3.7Z" />
      <circle cx="15.5" cy="8.5" r="1.5" />
      <path d="M8.5 15.5 5 19M7 12l-3 1 1 3M12 17l-1 3 3 1" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  wallet: (
    <>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-10Z" />
      <path d="M3.5 8.5h16" />
      <path d="M16 12h4.5v4H16a2 2 0 0 1 0-4Z" />
    </>
  ),
  piggybank: (
    <>
      <path d="M4 13.5c0-3.6 3.4-6.5 7.8-6.5 4.1 0 7.2 2.4 7.2 5.5 0 1.7-1 3.2-2.5 4.2V20h-3v-2h-4v2H6.5v-3.2A6.2 6.2 0 0 1 4 13.5Z" />
      <path d="M17.5 10.5 21 9v4l-2 .8" />
      <path d="M9 5.5 10 4h4l1 1.5" />
      <path d="M8 13h.01" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17.5 9 11l3.5 3.5L21 6" />
      <path d="M15.5 6H21v5.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h5a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H5V4.5Z" />
      <path d="M19 4.5h-5a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H19V4.5Z" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17.5h6" />
      <path d="M10 21h4" />
      <path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-.7.6-1 1.4-1 2.5h-5c0-1.1-.3-1.9-1-2.5Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
      <path d="M8 14h2M14 14h2M8 17.5h2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M5.5 9.8V20h13V9.8" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  car: (
    <>
      <path d="m5 12 1.5-4.5A2 2 0 0 1 8.4 6h7.2a2 2 0 0 1 1.9 1.5L19 12" />
      <path d="M4 12h16v5H4v-5Z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H4.5V8a3 3 0 0 0 3.5 3M16 5.5h3.5V8a3 3 0 0 1-3.5 3" />
      <path d="M12 12.5V17M8.5 20h7M10 17h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 3.5 5.6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.6-3.5-9S9.5 5.5 12 3Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-1.5A5.5 5.5 0 0 1 8 13h2a5.5 5.5 0 0 1 5.5 5.5V20" />
      <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M17 13a5 5 0 0 1 4.5 4.5V20" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 5.5h3M11 18.5h2" />
    </>
  ),
  star: (
    <path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.3-.9L12 3Z" />
  ),
  arrow: (
    <>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M4 7h16M4 7l-2 5a3 3 0 0 0 6 0L6 7M20 7l-2 5a3 3 0 0 0 6 0l-2-5" />
    </>
  ),
  bank: (
    <>
      <path d="m3 9 9-5 9 5" />
      <path d="M4 9h16v2H4V9ZM6 11v6M10 11v6M14 11v6M18 11v6" />
      <path d="M3.5 20h17" />
    </>
  ),
  graduation: (
    <>
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5" />
      <path d="M21.5 9v5" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M7 3v2M11 3v2M15 3v2" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12h18" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="3.5" />
      <path d="m10.5 12.5 8-8M16 4l4 4M14 6l2 2" />
    </>
  ),
  cloud: (
    <path d="M6.5 19A4.5 4.5 0 0 1 6 10a6 6 0 0 1 11.5-1A4 4 0 0 1 18 19H6.5Z" />
  ),
};

type IconProps = {
  name?: IconName;
  size: number;
  color?: string;
  strokeWidth?: number;
};

export const Icon = ({
  name = "spark",
  size,
  color = "currentColor",
  strokeWidth = 1.8,
}: IconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      {ICONS[name] ?? ICONS.spark}
    </svg>
  );
};
