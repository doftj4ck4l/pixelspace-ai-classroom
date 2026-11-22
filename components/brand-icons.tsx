"use client";

import type { FC, SVGProps } from "react";

/**
 * Pixelspace brand marks — hand-drawn in the same 24px grid and rounded
 * stroke language as Material Symbols, so they sit next to the stock icons
 * without looking foreign. These are ours: a pencil drawing a spark for
 * New chat, a hub-and-spokes for the Hub, and a Pixi mascot glyph for Buddy.
 * Outline variants pair with the w300 Material icons; Fill variants mark the
 * active state, exactly like the stock pairs.
 */

type IconProps = SVGProps<SVGSVGElement>;

const Svg: FC<IconProps & { children: React.ReactNode }> = ({
  children,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

/** A pencil writing a four-point spark — the New chat mark. */
export const NewChatMark: FC<IconProps> = (props) => (
  <Svg {...props}>
    <path
      d="M4.6 19.4l.6-3.2L15.9 5.5a1.75 1.75 0 0 1 2.6 2.6L7.8 18.8l-3.2.6Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M14.4 7l2.6 2.6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M20.1 1.9c.3 1.5.6 2.1 2 2.6-1.4.5-1.7 1.1-2 2.6-.3-1.5-.6-2.1-2-2.6 1.4-.5 1.7-1.1 2-2.6Z"
      fill="currentColor"
    />
  </Svg>
);

/** A hub and its four spokes — the Hub mark. */
export const HubMark: FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="4.3" r="1.8" stroke="currentColor" strokeWidth="2" />
    <circle cx="19.7" cy="12" r="1.8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="19.7" r="1.8" stroke="currentColor" strokeWidth="2" />
    <circle cx="4.3" cy="12" r="1.8" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 9.5V6.1M14.5 12h3.4M12 14.5v3.4M9.5 12H6.1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

/** The same hub with its nodes filled — the active Hub state. */
export const HubMarkFill: FC<IconProps> = (props) => (
  <Svg {...props}>
    <path
      d="M12 9.5V6.1M14.5 12h3.4M12 14.5v3.4M9.5 12H6.1"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3.1" fill="currentColor" />
    <circle cx="12" cy="4.3" r="2.3" fill="currentColor" />
    <circle cx="19.7" cy="12" r="2.3" fill="currentColor" />
    <circle cx="12" cy="19.7" r="2.3" fill="currentColor" />
    <circle cx="4.3" cy="12" r="2.3" fill="currentColor" />
  </Svg>
);

/** Pixi's head, simplified to a glyph — the Buddy mark. */
export const PixiMark: FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect
      x="4.5"
      y="7.2"
      width="15"
      height="12"
      rx="5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 7.2V4.7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="3.6" r="1.15" fill="currentColor" />
    <circle cx="9.3" cy="13.1" r="1.25" fill="currentColor" />
    <circle cx="14.7" cy="13.1" r="1.25" fill="currentColor" />
    <path
      d="M10.5 16c.85.75 2.15.75 3 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

/** Pixi with a filled head — the active Buddy state (eyes knocked out). */
export const PixiMarkFill: FC<IconProps> = (props) => (
  <Svg {...props}>
    <path
      d="M12 7.2V4.7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="3.6" r="1.15" fill="currentColor" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M9.5 7.2h5a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5v-2a5 5 0 0 1 5-5Zm-.2 4.65a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5.4 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
    />
  </Svg>
);

/** A four-point spark, for AI accents. */
export const SparkMark: FC<IconProps> = (props) => (
  <Svg {...props}>
    <path
      d="M12 2.6c.6 4.4 1.4 6 5.7 6.9-4.3.9-5.1 2.5-5.7 6.9-.6-4.4-1.4-6-5.7-6.9 4.3-.9 5.1-2.5 5.7-6.9Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M18.4 15.1c.3 2 .7 2.7 2.6 3.1-1.9.4-2.3 1.1-2.6 3.1-.3-2-.7-2.7-2.6-3.1 1.9-.4 2.3-1.1 2.6-3.1Z"
      fill="currentColor"
    />
  </Svg>
);

/** The spark alone, filled. */
export const SparkMarkFill: FC<IconProps> = (props) => (
  <Svg {...props}>
    <path
      fill="currentColor"
      d="M12 2.6c.6 4.4 1.4 6 5.7 6.9-4.3.9-5.1 2.5-5.7 6.9-.6-4.4-1.4-6-5.7-6.9 4.3-.9 5.1-2.5 5.7-6.9Z"
    />
    <path
      fill="currentColor"
      d="M18.4 15.1c.3 2 .7 2.7 2.6 3.1-1.9.4-2.3 1.1-2.6 3.1-.3-2-.7-2.7-2.6-3.1 1.9-.4 2.3-1.1 2.6-3.1Z"
    />
  </Svg>
);
