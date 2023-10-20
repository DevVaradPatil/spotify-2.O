"use client"
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Playlist, Song } from '@/types';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import toast from 'react-hot-toast';
import PlaylistContent from './components/PlaylistContent';


const PlaylistPage = () => {
  const { id } = useParams();
  const supabaseClient = useSupabaseClient();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [imagepath, setImagepath] = useState('/images/playlist.png');
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (!id) {
      return; // Return early if id is not available
    }
    const fetchPlaylist = async () => {
      try {
        const { data, error } = await supabaseClient.from('playlists').select('*').eq('id', id);
        if (error) {
          toast.error(error.message);
        } else if (data) {
          setPlaylist(data[0]);
        }
      } catch (error) {
        toast.error('Playlist Not Found');
      }
    };

    fetchPlaylist(); // Always call the fetch function unconditionally
  }, [id, supabaseClient]);

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDesc(playlist.desc);
      const { data: imageData } = supabaseClient.storage.from('images').getPublicUrl(playlist.image_path);
      setImagepath(imageData.publicUrl)

      const fetchSongs = async() => {
        try {
          const { data, error } = await supabaseClient.from('songs').select('*').in('id', playlist!.song_ids);
          if (error) {
            console.error('Error fetching songs:', error);
          } else {
            setSongs(data);
          }
        } catch (error) {
          console.error('Error fetching songs:', error);
        }
      }

      fetchSongs();
    }
  }, [playlist, supabaseClient]);

  if (!id) {
    return <div>Loading...</div>;
  }
    
  return (
    <div className="bg-neutral-900 rounded-lg h-full w-full overflow-hidden overflow-y-auto">
      <Header>
        <div className="mt-20">
          <div className="flex flex-col md:flex-row items-center gap-x-5">
            <div className="relative h-32 w-32 lg:h-44 lg:w-44 rounded-md overflow-hidden">
              <Image fill src={imagepath} alt="Playlist" className="object-cover" />
            </div>
            <div className="flex flex-col gap-y-2 mt-4 md:mt-0">
              <p className="hidden md:block font-semibold text-md">Playlist</p>
              <h1 className="text-white text-center md:text-left text-4xl sm:text-5xl lg:text-7xl font-bold">
                {name}
              </h1>
              <p className='text-neutral-400 w-full text-center md:text-left text-regular'>
                {desc}
              </p>
            </div>
          </div>
        </div>
      </Header>
      
      <PlaylistContent songs={songs} />
     
    </div>
  );
};

export default PlaylistPage;
