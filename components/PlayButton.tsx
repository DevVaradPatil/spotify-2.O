import React from "react";
import { FaPlay } from "react-icons/fa";

/**
 * Decorative only. Every call site renders this inside a control that already
 * handles activation (a card button or a Link), so making it a <button> gave
 * invalid nested-interactive markup and a duplicate tab stop.
 */
const PlayButton = () => {
  return (
    <span
      aria-hidden="true"
      className="transition opacity-0 rounded-full flex items-center bg-accent p-4 drop-shadow-md translate-y-1/4 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-hover:scale-105"
    >
      <FaPlay className="text-black" />
    </span>
  );
};

export default PlayButton;
