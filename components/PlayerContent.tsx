"use client";

import { BsPauseFill, BsPlayFill } from "react-icons/bs";
import { useEffect } from "react";
// @ts-ignore
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

const PlayerContent: React.FC<PlayerContentProps> = ({ song, songUrl }) => {
  const player = usePlayer();
  const Icon = player.isPlaying ? BsPauseFill : BsPlayFill;
  const VolumeIcon = player.volume === 0 ? HiSpeakerXMark : HiSpeakerWave;
  const currentSongId = player.activeId;

  const onPlayNext = () => {
    if (player.ids.length === 0) {
      return;
    }

    const currentIndex = player.ids.findIndex((id) => id === player.activeId);
    const nextSong = player.ids[currentIndex + 1];

    if (!nextSong) {
      return player.setId(player.ids[0]);
    }

    player.setId(nextSong);
  };

  const onPlayPrevious = () => {
    if (player.ids.length === 0) {
      return;
    }

    const currentIndex = player.ids.findIndex((id) => id === player.activeId);
    const previousSong = player.ids[currentIndex - 1];

    if (!previousSong) {
      return player.setId(player.ids[player.ids.length - 1]);
    }

    player.setId(previousSong);
  };

  const [play, { pause, sound }] = useSound(songUrl, {
    volume: player.volume,
    onplay: () => player.setIsPlaying(true),
    onend: () => {
      player.setIsPlaying(false);
      onPlayNext();
    },
    onpause: () => player.setIsPlaying(false),
    format: ["mp3"],
  });

  // Update sound position and duration when the sound is ready
  useEffect(() => {
    if (sound) {
      player.setSoundDuration(sound.duration());
    }
  }, [sound]);

  // Periodically update sound position
  useEffect(() => {
    const updatePosition = () => {
      if (sound) {
        player.setSoundPosition(sound.seek());
      }
    };

    // Update position every 500 milliseconds (adjust the interval as needed)
    const positionInterval = setInterval(updatePosition, 500);

    return () => {
      clearInterval(positionInterval);
    };
  }, [sound]);

  useEffect(() => {
    sound?.play();
    return () => {
      sound?.unload();
    };
  }, [sound]);

  const handlePlay = () => {
    if (!player.isPlaying) {
      play();
    } else {
      pause();
    }
  };

  const toggleMute = () => {
    if (player.volume === 0) {
      player.setVolume(1);
    } else {
      player.setVolume(0);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sound) {
      const progressBar = e.currentTarget;
      const clickX = e.clientX - progressBar.getBoundingClientRect().left;
      const newPosition = (clickX / progressBar.clientWidth) * player.soundDuration;
      sound.seek(newPosition);
      player.setSoundPosition(newPosition);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 h-full">
      <div className="flex w-full justify-start">
        <div className="flex items-center gap-x-4 z-10">
          <MediaItem data={song} inPlayer index={0} />
          <LikeButton songId={song.id} />
        </div>
      </div>
      <div className="flex md:hidden col-auto w-full justify-end items-center">
      <AddToPlaylist songId={currentSongId}/>
        <div
          onClick={handlePlay}
          className="h-10 w-10 ml-1 flex items-center justify-center rounded-full bg-white p-1 cursor-pointer"
        >
          <Icon size={30} className="text-black" />
        </div>
      </div>

      <div className="hidden h-full md:flex gap-y-2 flex-col justify-center items-center w-full max-w-[722px] gap-x-6">
        <div className="flex justify-center items-center gap-x-6">
          <AiFillStepBackward
            onClick={onPlayPrevious}
            size={30}
            className="text-neutral-400 cursor-pointer hover:text-white transition"
          />
          <div
            onClick={handlePlay}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white p-1 cursor-pointer"
          >
            <Icon size={30} className="text-black" />
          </div>
          <AiFillStepForward
            onClick={onPlayNext}
            size={30}
            className="text-neutral-400 cursor-pointer hover:text-white transition"
          />
        </div>
        <div className="hidden md:flex w-full justify-center items-center gap-x-3">
          <p className="text-sm text-neutral-400 w-10">
            {formatTime(player.soundPosition)}
          </p>
          <div className="w-full">
            <div
              className="bg-neutral-300 h-1 rounded-lg cursor-pointer"
              onClick={handleProgressBarClick}
            >
              <div
                className="bg-green-500 h-1 rounded-lg"
                style={{ width: `${(player.soundPosition / player.soundDuration) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="text-sm text-neutral-400 w-10">
            {formatTime(player.soundDuration)}
          </p>
        </div>
      </div>

      <div className="hidden md:flex w-full items-center justify-end pr-2">
        <AddToPlaylist songId={currentSongId}/>
        <div className="flex items-center gap-x-2 w-[120px]">
          <VolumeIcon
            onClick={toggleMute}
            className=" cursor-pointer"
            size={34}
          />
          <Slider value={player.volume} onChange={(value) => player.setVolume(value)} />
        </div>
      </div>
      <div className="flex md:hidden w-full justify-center items-center absolute bottom-0 left-0">
        <div className="w-full">
          <div
            className="bg-neutral-300 h-1 rounded-lg"
            onClick={handleProgressBarClick}
          >
            <div
              className="bg-green-500 h-1 rounded-lg"
              style={{ width: `${(player.soundPosition / player.soundDuration) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default PlayerContent;
