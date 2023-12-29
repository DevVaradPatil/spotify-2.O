import { Analytics } from '@vercel/analytics/react';
import Sidebar from "@/components/Sidebar";
import "./globals.css";
import "./styles.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import SupabaseProvider from "@/providers/SupabaseProvider";
import UserProvider from "@/providers/UserProvider";
import ModalProvider from "@/providers/ModalProvider";
import ToasterProvider from "@/providers/ToasterProvider";
import getSongsByUserId from "@/actions/getSongsByUserId";
import Player from "@/components/Player";
import getActiveProductsWithPrices from "@/actions/getActiveProductsWithPrices";
import { SpeedInsights } from "@vercel/speed-insights/next"

const font = Figtree({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotify 2.O",
  description: "Listen to Music of Your Taste",
};

export const revalidate = 0;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userSongs = await getSongsByUserId();
  const products = await getActiveProductsWithPrices();
  return (
    <html lang="en">
      <body className={font.className}>
        <ToasterProvider />
        <SupabaseProvider>
          <UserProvider>
            <ModalProvider products={products}/>
              <Sidebar songs={userSongs}>{children}</Sidebar>
              <Player />
          </UserProvider>
        </SupabaseProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
