import Link from "next/link";

import { Artist } from "@/types";

interface ArtistRowProps {
  artists: Artist[];
}

/**
 * Artists have no artwork yet — the backfill derives them from the `author`
 * text column, which carries no image. An initial on a gradient reads better
 * than a broken image or a generic placeholder repeated a dozen times.
 */
const ArtistRow: React.FC<ArtistRowProps> = ({ artists }) => {
  if (artists.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-4">
      {artists.map((artist) => (
        <li key={artist.id}>
          <Link
            href={`/artist/${artist.slug}`}
            className="group flex flex-col items-center gap-y-2 rounded-md bg-neutral-400/5 p-3 transition hover:bg-neutral-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue-500 text-2xl font-bold text-black"
              aria-hidden="true"
            >
              {artist.name.charAt(0).toUpperCase()}
            </span>
            <span className="w-full truncate text-center text-sm font-medium text-content">
              {artist.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default ArtistRow;
