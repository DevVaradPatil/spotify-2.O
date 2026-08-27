"use client";

import { BsPauseFill, BsPlayFill } from "react-icons/bs";
import { useCallback, useEffect, useState } from "react";
// @ts-ignore - use-sound ships no types for its default export
import useSound from "use-sound";

import { Song } from "@/types";
import MediaItem from "./MediaItem";
import LikeButton from "./LikeButton";
import { AiFillStepBackward, AiFillStepForward } from "react-icons/ai";
import { HiSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import Slider from "./Slider";
import usePlayer from "@/hooks/usePlayer";
import AddToPlaylist from "./AddToPlaylist";

interface PlayerContentProps {
  song: Song;
  songUrl: string;
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

const PlayerContent: React.FC<PlayerContentProps> = ({ song, songUrl }) => {
  // Selectors, not the whole store: a volume change should not re-render
  // anything that only cares about the active track.
  const ids = usePlayer((state) => state.ids);
  const activeId = usePlayer((state) => state.activeId);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const volume = usePlayer((state) => state.volume);
  const setId = usePlayer((state) => state.setId);
  const setIsPlaying = usePlayer((state) => state.setIsPlaying);
  const setVolume = usePlayer((state) => state.setVolume);

  // Local, not global — these tick twice a second and nothing outside this
  // component reads them.
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const Icon = isPlaying ? BsPauseFill : BsPlayFill;
  const VolumeIcon = volume === 0 ? HiSpeakerXMark : HiSpeakerWave;

  const onPlayNext = useCallback(() => {
    if (ids.length === 0) return;
    const currentIndex = ids.findIndex((id) => id === activeId);
    const nextSong = ids[currentIndex + 1];
    setId(nextSong ?? ids[0]);
  }, [ids, activeId, setId]);

  const onPlayPrevious = useCallback(() => {
    if (ids.length === 0) return;
    const currentIndex = ids.findIndex((id) => id === activeId);
    const previousSong = ids[currentIndex - 1];
    setId(previousSong ?? ids[ids.length - 1]);
  }, [ids, activeId, setId]);

  const [play, { pause, sound }] = useSound(songUrl, {
    volume,
    onplay: () => setIsPlaying(true),
    onend: () => {
      setIsPlaying(false);
      onPlayNext();
    },
    onpause: () => setIsPlaying(false),
    format: ["mp3"],
  });

  useEffect(() => {
    if (sound) setDuration(sound.duration() ?? 0);
  }, [sound]);

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

  const handlePlay = () => {
    if (!isPlaying) {
      play();
    } else {
      pause();
    }
  };

  const toggleMute = () => setVolume(volume === 0 ? 1 : 0);

  const seekTo = (newPosition: number) => {
    if (!sound || !Number.isFinite(newPosition)) return;
    const clamped = Math.min(Math.max(newPosition, 0), duration || 0);
    sound.seek(clamped);
    setPosition(clamped);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    seekTo((clickX / progressBar.clientWidth) * duration);
  };

  // Keyboard seeking, so the progress bar is not mouse-only.
  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekTo(position + 5);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekTo(position - 5);
    } else if (e.key === "Home") {
      e.preventDefault();
      seekTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seekTo(duration);
    }
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const ProgressBar = ({ className }: { className?: string }) => (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={Math.floor(position)}
      aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
      onClick={handleProgressBarClick}
      onKeyDown={handleProgressKeyDown}
      className={`bg-neutral-300 h-1 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${className ?? ""}`}
    >
      <div
        className="bg-green-500 h-1 rounded-lg"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );

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
          onClick={onPlayPrevious}
          aria-label="Previous track"
          className="text-neutral-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
        >
          <AiFillStepBackward size={26} aria-hidden="true" />
        </button>
        <button
          onClick={handlePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <Icon size={30} className="text-black" aria-hidden="true" />
        </button>
        <button
          onClick={onPlayNext}
          aria-label="Next track"
          className="text-neutral-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
        >
          <AiFillStepForward size={26} aria-hidden="true" />
        </button>
      </div>

      {/* Desktop transport */}
      <div className="hidden h-full md:flex gap-y-2 flex-col justify-center items-center w-full max-w-[722px] gap-x-6">
        <div className="flex justify-center items-center gap-x-6">
          <button
            onClick={onPlayPrevious}
            aria-label="Previous track"
            className="text-neutral-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
          >
            <AiFillStepBackward size={30} aria-hidden="true" />
          </button>
          <button
            onClick={handlePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <Icon size={30} className="text-black" aria-hidden="true" />
          </button>
          <button
            onClick={onPlayNext}
            aria-label="Next track"
            className="text-neutral-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
          >
            <AiFillStepForward size={30} aria-hidden="true" />
          </button>
        </div>
        <div className="hidden md:flex w-full justify-center items-center gap-x-3">
          <p className="text-sm text-neutral-300 w-10">{formatTime(position)}</p>
          <div className="w-full">
            <ProgressBar />
          </div>
          <p className="text-sm text-neutral-300 w-10">{formatTime(duration)}</p>
        </div>
      </div>

      <div className="hidden md:flex w-full items-center justify-end pr-2">
        <AddToPlaylist songId={activeId} />
        <div className="flex items-center gap-x-2 w-[120px]">
          <button
            onClick={toggleMute}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
          >
            <VolumeIcon className="cursor-pointer" size={34} aria-hidden="true" />
          </button>
          <Slider value={volume} onChange={(value) => setVolume(value)} />
        </div>
      </div>

      <div className="flex md:hidden w-full justify-center items-center absolute bottom-0 left-0">
        <div className="w-full">
          <ProgressBar />
        </div>
      </div>
    </div>
  );
};

export default PlayerContent;
