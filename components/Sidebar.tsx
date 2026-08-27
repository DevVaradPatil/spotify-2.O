"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { HiHome } from "react-icons/hi";
import { BiSearch } from "react-icons/bi";
import { MdLibraryMusic } from "react-icons/md";
import Box from "./Box";
import SidebarItem from "./SidebarItem";
import Library from "./Library";
import { Song } from "@/types";
import usePlayer from "@/hooks/usePlayer";
import { twMerge } from "tailwind-merge";
import { ImHeadphones } from "react-icons/im";

interface SidebarProps {
  children: React.ReactNode;
  songs: Song[];
}
const Sidebar: React.FC<SidebarProps> = ({ children, songs }) => {
  const pathname = usePathname();
  const activeId = usePlayer((state) => state.activeId);

  const routes = useMemo(
    () => [
      {
        icon: HiHome,
        label: "Home",
        active: pathname === "/",
        href: "/",
      },
      {
        icon: BiSearch,
        label: "Search",
        active: pathname === "/search",
        href: "/search",
      },
      {
        icon: MdLibraryMusic,
        label: "Explore All",
        active: pathname === "/all",
        href: "/all",
      },
      {
        icon: ImHeadphones,
        label: "Music Room",
        active: pathname === "/music-room",
        href: "/music-room",
      },
    ],
    [pathname]
  );

  return (
    <div
      className={twMerge(
        `
        flex h-full
    `,
        activeId && "h-[calc(100%-80px)]"
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>
      <aside
        aria-label="Library and navigation"
        className="hidden md:flex flex-col gap-y-2 bg-canvas h-full w-[300px] p-2"
      >
        <Box>
          <nav aria-label="Main" className="flex flex-col gap-y-4 px-5 py-4">
            {routes.map((item) => (
              <SidebarItem key={item.label} {...item} />
            ))}
          </nav>
        </Box>
        <Box className="overflow-y-auto h-full">
          <Library songs={songs} />
        </Box>
      </aside>
      <main
        id="main-content"
        tabIndex={-1}
        className="h-full flex-1 md:pr-2 overflow-y-auto md:py-2"
      >
        {children}
      </main>
    </div>
  );
};

export default Sidebar;
