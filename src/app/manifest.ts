import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home screen"): opens full-screen with
// the Footy Reacts icon and no browser bar. No offline support; the board is
// only worth anything live.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Footy Reacts",
    short_name: "Footy Reacts",
    description: "Every creator's take on every match, organised by fixture.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1ea",
    theme_color: "#d5202a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
