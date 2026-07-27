import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // A forced reload on the browser's "online" event can land exactly while a
  // user is mid-navigation (e.g. right after login) and bounce them back.
  // Our own ConnectionStatus indicator + TanStack Query refetching cover the
  // "back online" case without a disruptive full-page reload.
  reloadOnOnline: false,
});

export default withSerwist(nextConfig);
