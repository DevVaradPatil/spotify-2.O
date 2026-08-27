import { z } from "zod";

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3"];
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/**
 * Storage object keys used to interpolate raw user input:
 *   `song-${values.title}-${uniqid()}`
 * A title containing `/`, `..` or control characters landed straight in the
 * key. Keys are now slugified and prefixed with the owner's id so storage
 * policies can scope on the path.
 */
export const slugify = (input: string): string =>
  input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";

export const buildObjectKey = (
  userId: string,
  title: string,
  file: File
): string => {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5)
    : "bin";
  return `${userId}/${slugify(title)}-${crypto.randomUUID()}.${ext}`;
};

export const validateFile = (
  file: File | undefined,
  kind: "audio" | "image"
): string | null => {
  if (!file) return `Please choose ${kind === "audio" ? "an audio file" : "an image"}.`;

  const maxBytes = kind === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  const allowed = kind === "audio" ? ALLOWED_AUDIO_TYPES : ALLOWED_IMAGE_TYPES;

  if (file.size === 0) return "That file is empty.";
  if (file.size > maxBytes) {
    return `That ${kind} file is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  }
  if (!allowed.includes(file.type)) {
    return kind === "audio"
      ? "Only MP3 audio is supported."
      : "Cover art must be a JPEG, PNG, WebP or AVIF image.";
  }
  return null;
};

export const songFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  author: z.string().trim().min(1, "Author is required").max(120),
});

export const playlistFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  desc: z.string().trim().max(500).default(""),
});
