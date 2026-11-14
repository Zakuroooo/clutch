import type { MetadataRoute } from "next";

/** Lets Clutch be added to the Home Screen, which iPhone needs before it allows notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clutch",
    short_name: "Clutch",
    description: "A second screen for casual sports fans. Replay of a real match, running as live.",
    start_url: "/",
    display: "standalone",
    background_color: "#080a10",
    theme_color: "#080a10",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
