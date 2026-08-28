"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { createClient } from "@/libs/supabase/server";
import { CACHE_TAGS } from "@/libs/cacheTags";

/**
 * Server Actions for every write the app performs.
 *
 * Mutations previously ran as inline Supabase calls from client components,
 * which meant validation lived only in the browser and could be skipped
 * entirely by anyone talking to PostgREST directly. RLS was the sole
 * protection. These actions re-check the session and re-validate the input on
 * the server, so the rules hold regardless of what the client does.
 *
 * File uploads deliberately stay client-side, going straight from the browser
 * to Supabase Storage. Routing a 20MB audio file through a Server Action would
 * push it through the serverless function body, which is capped well below
 * that on Vercel. Only the resulting metadata comes through here.
 */

export interface ActionError {
  error: string;
}

const failed = (message: string): ActionError => ({ error: message });

/** Resolves the caller's verified user, or an error to return. */
const requireUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null as null };
  return { supabase, user };
};

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export const toggleLike = async (
  songId: number
): Promise<{ liked: boolean } | ActionError> => {
  if (!Number.isInteger(songId)) return failed("Invalid song.");

  const { supabase, user } = await requireUser();
  if (!user) return failed("You must be signed in.");

  const { data: existing } = await supabase
    .from("liked_songs")
    .select("song_id")
    .eq("user_id", user.id)
    .eq("song_id", songId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("liked_songs")
      .delete()
      .eq("user_id", user.id)
      .eq("song_id", songId);
    if (error) return failed(error.message);
    return { liked: false };
  }

  const { error } = await supabase
    .from("liked_songs")
    .insert({ user_id: user.id, song_id: songId });
  if (error) return failed(error.message);
  return { liked: true };
};

// ---------------------------------------------------------------------------
// Playlist membership
// ---------------------------------------------------------------------------

export const togglePlaylistSong = async (
  playlistId: number,
  songId: number
): Promise<{ added: boolean } | ActionError> => {
  if (!Number.isInteger(playlistId) || !Number.isInteger(songId)) {
    return failed("Invalid playlist or song.");
  }

  const { supabase, user } = await requireUser();
  if (!user) return failed("You must be signed in.");

  // Ownership is checked here as well as by RLS. RLS would reject the write
  // anyway, but this returns a comprehensible message instead of a policy
  // violation.
  const { data: playlist } = await supabase
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!playlist) return failed("Playlist not found.");

  const { data: existing } = await supabase
    .from("playlist_songs")
    .select("song_id")
    .eq("playlist_id", playlistId)
    .eq("song_id", songId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("song_id", songId);
    if (error) return failed(error.message);
    return { added: false };
  }

  const { data: last } = await supabase
    .from("playlist_songs")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("playlist_songs").insert({
    playlist_id: playlistId,
    song_id: songId,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return failed(error.message);
  return { added: true };
};

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

const playlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  desc: z.string().trim().max(500).default(""),
  imagePath: z.string().trim().min(1),
});

export const createPlaylist = async (
  input: z.input<typeof playlistSchema>
): Promise<{ id: number } | ActionError> => {
  const parsed = playlistSchema.safeParse(input);
  if (!parsed.success) return failed(parsed.error.issues[0].message);

  const { supabase, user } = await requireUser();
  if (!user) return failed("You must be signed in.");

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      desc: parsed.data.desc,
      image_path: parsed.data.imagePath,
      song_ids: [],
    })
    .select("id")
    .single();

  if (error || !data) return failed(error?.message ?? "Could not create playlist.");
  return { id: data.id };
};

const songSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  author: z.string().trim().min(1, "Author is required").max(120),
  songPath: z.string().trim().min(1),
  imagePath: z.string().trim().min(1),
});

export const createSong = async (
  input: z.input<typeof songSchema>
): Promise<{ id: number } | ActionError> => {
  const parsed = songSchema.safeParse(input);
  if (!parsed.success) return failed(parsed.error.issues[0].message);

  const { supabase, user } = await requireUser();
  if (!user) return failed("You must be signed in.");

  const { data, error } = await supabase
    .from("songs")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      author: parsed.data.author,
      song_path: parsed.data.songPath,
      image_path: parsed.data.imagePath,
    })
    .select("id")
    .single();

  if (error || !data) return failed(error?.message ?? "Could not save song.");

  // The catalog is cached across every visitor, so the upload has to bust it.
  updateTag(CACHE_TAGS.songs);
  return { id: data.id };
};

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export const toggleFollow = async (
  artistId: number
): Promise<{ following: boolean } | ActionError> => {
  if (!Number.isInteger(artistId)) return failed("Invalid artist.");

  const { supabase, user } = await requireUser();
  if (!user) return failed("You must be signed in.");

  const { data: existing } = await supabase
    .from("follows")
    .select("artist_id")
    .eq("user_id", user.id)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("user_id", user.id)
      .eq("artist_id", artistId);
    if (error) return failed(error.message);
    return { following: false };
  }

  const { error } = await supabase
    .from("follows")
    .insert({ user_id: user.id, artist_id: artistId });
  if (error) return failed(error.message);
  return { following: true };
};
