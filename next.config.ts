import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploys build into a side directory (NEXT_DIST_DIR=.next-build) and then
  // swap it in, so the running server never serves pages against a half-built
  // .next — no unstyled/500 windows while a deploy is in flight.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default withAui(nextConfig);
