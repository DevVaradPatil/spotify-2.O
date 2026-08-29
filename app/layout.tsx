import { Analytics } from "@vercel/analytics/react";
import Sidebar from "@/components/Sidebar";
import "./globals.css";
import "./styles.css";
import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import SupabaseProvider from "@/providers/SupabaseProvider";
import UserProvider from "@/providers/UserProvider";
import ModalProvider from "@/providers/ModalProvider";
import ToasterProvider from "@/providers/ToasterProvider";
import { LikedSongsProvider } from "@/hooks/useLikedSongs";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import getSongsByUserId from "@/actions/getSongsByUserId";
import Player from "@/components/Player";
import getActiveProductsWithPrices from "@/actions/getActiveProductsWithPrices";
import { SpeedInsights } from "@vercel/speed-insights/next";

const font = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotify 2.O",
  description: "Listen to Music of Your Taste",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spotify 2.O",
  },
};

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  // The player is fixed to the bottom edge, so it needs the safe area on
  // notched devices when installed to the home screen.
  viewportFit: "cover",
};

// Per-user data — fetches the sidebar's per-user song list, so this must not be cached across visitors.
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userSongs = await getSongsByUserId();
  const products = await getActiveProductsWithPrices();
  return (
    <html lang="en">
      <body className={font.className}>
        <ToasterProvider />
        <SupabaseProvider>
          <UserProvider>
            <LikedSongsProvider>
              <ModalProvider products={products} />
              <Sidebar songs={userSongs}>{children}</Sidebar>
              <Player />
            </LikedSongsProvider>
          </UserProvider>
        </SupabaseProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
