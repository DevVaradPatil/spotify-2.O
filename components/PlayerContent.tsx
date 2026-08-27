"use client";

import { BsPauseFill, BsPlayFill } from "react-icons/bs";
import { useCallback, useEffect, useState } from "react";
// @ts-ignore - use-sound ships no types for its default export
import useSound from "use-sound";

import { Song } from "@/types";
import MediaItem from "./MediaItem";
import LikeButton from "./LikeButton";
import { AiFillStepBackward, AiFillStepForward } from "react-icons/ai";
import { BsShuffle, BsRepeat, BsRepeat1 } from "react-icons/bs";
import { MdQueueMusic } from "react-icons/md";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import Slider from "./Slider";
import usePlayer from "@/hooks/usePlayer";
import AddToPlaylist from "./AddToPlaylist";

interface PlayerContentProps {
  song: Song;
  songUrl: string;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(
    2,
    "0"
  )}`;
}

interface ProgressBarProps {
  position: number;
  duration: number;
  onSeekClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSeekKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Module scope, not inside PlayerContent: a component declared in a render
 * body is a new type on every render, so React remounts it and its DOM each
 * time rather than updating it.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  position,
  duration,
  onSeekClick,
  onSeekKeyDown,
}) => (
  <div
    role="slider"
    tabIndex={0}
    aria-label="Seek"
    aria-valuemin={0}
    aria-valuemax={Math.floor(duration)}
    aria-valuenow={Math.floor(position)}
    aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
    onClick={onSeekClick}
    onKeyDown={onSeekKeyDown}
    className="bg-neutral-300 h-1 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
  >
    <div
      className="bg-accent h-1 rounded-lg"
      style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
    />
  </div>
);

const PlayerContent: React.FC<PlayerContentProps> = ({
  song,
  songUrl,
  isQueueOpen,
  onToggleQueue,
}) => {
  // Selectors, not the whole store: a volume change should not re-render
  // anything that only cares about the active track.
  const activeId = usePlayer((state) => state.activeId);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const volume = usePlayer((state) => state.volume);
  const isShuffled = usePlayer((state) => state.isShuffled);
  const repeat = usePlayer((state) => state.repeat);
  const setIsPlaying = usePlayer((state) => state.setIsPlaying);
  const setVolume = usePlayer((state) => state.setVolume);
  const playNext = usePlayer((state) => state.playNext);
  const playPrevious = usePlayer((state) => state.playPrevious);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);

  // Local, not global — these tick twice a second and nothing outside this
  // component reads them.
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const Icon = isPlaying ? BsPauseFill : BsPlayFill;
  const VolumeIcon = volume === 0 ? HiSpeakerXMark : HiSpeakerWave;

  // Explicit press: advances even under repeat-one, so the user is never
  // trapped on one track.
  const onPlayNext = useCallback(() => playNext(true), [playNext]);
  const onPlayPrevious = useCallback(() => playPrevious(), [playPrevious]);

  const [play, { pause, sound }] = useSound(songUrl, {
    volume,
    onload: function (this: { duration: () => number }) {
      setDuration(this.duration?.() ?? 0);
    },
    onplay: () => setIsPlaying(true),
    onend: () => {
      setIsPlaying(false);
      // Not explicit — repeat-one should replay this track.
      playNext(false);
    },
    onpause: () => setIsPlaying(false),
    format: ["mp3"],
  });

  useEffect(() => {
    if (!sound) return;
    const positionInterval = setInterval(() => {
      setPosition(sound.seek() ?? 0);
    }, 500);
    return () => clearInterval(positionInterval);
  }, [sound]);

  useEffect(() => {
    sound?.play();
    return () => {
      sound?.unload();
    };
  }, [sound]);

  const handlePlay = useCallback(() => {
    if (!isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, play, pause]);

  const toggleMute = useCallback(
    () => setVolume(volume === 0 ? 1 : 0),
    [volume, setVolume]
  );

  const seekTo = useCallback(
    (newPosition: number) => {
      if (!sound || !Number.isFinite(newPosition)) return;
      const clamped = Math.min(Math.max(newPosition, 0), duration || 0);
      sound.seek(clamped);
      setPosition(clamped);
    },
    [sound, duration]
  );

  const seekBy = useCallback(
    (delta: number) => seekTo((sound?.seek() ?? position) + delta),
    [seekTo, sound, position]
  );

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    seekTo((clickX / progressBar.clientWidth) * duration);
  };

  // Keyboard seeking, so the progress bar is not mouse-only.
  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekBy(5);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekBy(-5);
    } else if (e.key === "Home") {
      e.preventDefault();
      seekTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seekTo(duration);
    }
  };

  // UX-12 — global shortcuts. Ignored while focus is in a text field or a
  // contentEditable, so typing a search query or a chat message is unaffected.
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-5);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "n":
        case "N":
          e.preventDefault();
          onPlayNext();
          break;
        case "p":
        case "P":
          e.preventDefault();
          onPlayPrevious();
          break;
        case "s":
        case "S":
          e.preventDefault();
          toggleShuffle();
          break;
        case "r":
        case "R":
          e.preventDefault();
          cycleRepeat();
          break;
        case "q":
        case "Q":
          e.preventDefault();
          onToggleQueue();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handlePlay,
    seekBy,
    toggleMute,
    onPlayNext,
    onPlayPrevious,
    toggleShuffle,
    cycleRepeat,
    onToggleQueue,
  ]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 h-full">
      <div className="flex w-full justify-start">
        <div className="flex items-center gap-x-4 z-10">
          <MediaItem data={song} inPlayer index={0} />
          <LikeButton songId={song.id} />
        </div>
      </div>

      {/* Mobile controls */}
      <div className="flex md:hidden col-auto w-full justify-end items-center gap-x-1">
        <AddToPlaylist songId={activeId} />
        <button
          onClick={toggleMute}
          aria-label={volume === 0 ? "Unmute" : "Mute"}
          className="text-content-muted hover:text-white transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <VolumeIcon size={24} aria-hidden="true" />
        </button>
        <button
          onClick={onPlayPrevious}
          aria-label="Previous track"
          title="Previous track (P)"
          className="text-neutral-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          <AiFillStepBackward size={26} aria-hidden="true" />
        </button>
        <button
          onClick={handlePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon size={30} className="text-black" aria-hidden="true" />
        </button>
        <button
          onClick={onPlayNext}
          aria-label="Next track"
          title="Next track (N)"
          className="text-neutral-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
        >
          <AiFillStepForward size={26} aria-hidden="true" />
        </button>
      </div>

      {/* Desktop transport */}
      <div className="hidden h-full md:flex gap-y-2 flex-col justify-center items-center w-full max-w-[722px] gap-x-6">
        <div className="flex justify-center items-center gap-x-6">
          <button
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={isShuffled}
            title="Shuffle (S)"
            className={`transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isShuffled ? "text-accent" : "text-content-muted hover:text-white"
            }`}
          >
            <BsShuffle size={20} aria-hidden="true" />
          </button>
          <button
            onClick={onPlayPrevious}
            aria-label="Previous track"
            className="text-content-muted hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <AiFillStepBackward size={30} aria-hidden="true" />
          </button>
          <button
            onClick={handlePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title="Play/pause (Space)"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <Icon size={30} className="text-black" aria-hidden="true" />
          </button>
          <button
            onClick={onPlayNext}
            aria-label="Next track"
            title="Next track (N)"
            className="text-content-muted hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <AiFillStepForward size={30} aria-hidden="true" />
          </button>
          <button
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            title={`Repeat: ${repeat} (R)`}
            className={`transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              repeat === "off" ? "text-content-muted hover:text-white" : "text-accent"
            }`}
          >
            {repeat === "one" ? (
              <BsRepeat1 size={20} aria-hidden="true" />
            ) : (
              <BsRepeat size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="hidden md:flex w-full justify-center items-center gap-x-3">
          <p className="text-sm text-neutral-300 w-10">{formatTime(position)}</p>
          <div className="w-full">
            <ProgressBar
              position={position}
              duration={duration}
              onSeekClick={handleProgressBarClick}
              onSeekKeyDown={handleProgressKeyDown}
            />
          </div>
          <p className="text-sm text-neutral-300 w-10">{formatTime(duration)}</p>
        </div>
      </div>

      <div className="hidden md:flex w-full items-center justify-end pr-2 gap-x-1">
        <button
          onClick={onToggleQueue}
          aria-label="Queue"
          aria-pressed={isQueueOpen}
          title="Queue (Q)"
          className={`transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            isQueueOpen ? "text-accent" : "text-content-muted hover:text-white"
          }`}
        >
          <MdQueueMusic size={26} aria-hidden="true" />
        </button>
        <AddToPlaylist songId={activeId} />
        <div className="flex items-center gap-x-2 w-[120px]">
          <button
            onClick={toggleMute}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
          >
            <VolumeIcon className="cursor-pointer" size={34} aria-hidden="true" />
          </button>
          <Slider value={volume} onChange={(value) => setVolume(value)} />
        </div>
      </div>

      <div className="flex md:hidden w-full justify-center items-center absolute bottom-0 left-0">
        <div className="w-full">
          <ProgressBar
            position={position}
            duration={duration}
            onSeekClick={handleProgressBarClick}
            onSeekKeyDown={handleProgressKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerContent;
