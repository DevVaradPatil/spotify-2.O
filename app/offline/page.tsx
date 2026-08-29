import Box from "@/components/Box";

export const metadata = {
  title: "Offline · Spotify 2.O",
};

/**
 * Shown by the service worker when a navigation fails and nothing is cached.
 * Deliberately static and dependency-free so it can be pre-cached and rendered
 * with no network at all.
 */
const OfflinePage = () => (
  <Box className="h-full flex flex-col gap-y-4 items-center justify-center text-center px-6">
    <h1 className="text-2xl font-semibold text-content">You are offline</h1>
    <p className="max-w-sm text-content-muted">
      Spotify 2.O needs a connection to stream. Anything already cached by your browser
      will keep working once you are back online.
    </p>
  </Box>
);

export default OfflinePage;
