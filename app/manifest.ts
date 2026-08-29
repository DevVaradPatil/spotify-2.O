import type { MetadataRoute } from "next";

/**
 * Web app manifest, generated rather than a static file so the values stay in
 * one place with the rest of the app metadata.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spotify 2.O",
    short_name: "Spotify 2.O",
    description: "Listen to music of your taste",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#22c55e",
    orientation: "portrait-primary",
    categories: ["music", "entertainment"],
    icons: [
      {
        src: "/images/music.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/music.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
