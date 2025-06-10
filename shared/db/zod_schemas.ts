import { z } from "zod/v4";

// --- media_blobs ---
export const media_blobsSchema = z.object({
  id: z.string().uuid(),
  sha256: z.string(),
  size: z.bigint().optional(),
  mime: z.string().optional(),
  source_client_id: z.string().optional(),
  local_path: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
});
export type MediaBlob = z.infer<typeof media_blobsSchema>;

// --- songs ---
export const songsSchema = z.object({
  id: z.string().uuid(),
  blob_id: z.string().uuid(),
  title: z.string().optional(),
  artist: z.string().optional(),
  album: z.string().optional(),
  seconds: z.number().int().optional(),
  client_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
});
export type Song = z.infer<typeof songsSchema>;

// --- playlists ---
export const playlistsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  client_id: z.string().optional(),
  created_at: z.string().datetime({ offset: true }).optional(),
});
export type Playlist = z.infer<typeof playlistsSchema>;

// --- playlist_items ---
export const playlist_itemsSchema = z.object({
  playlist_id: z.string().uuid(),
  song_id: z.string().uuid(),
  position: z.number().int().optional(),
});
export type PlaylistItem = z.infer<typeof playlist_itemsSchema>;

// --- helper validators ---
export const validateMediaBlob = (input: unknown) =>
  media_blobsSchema.safeParse(input);
export const validateSong = (input: unknown) => songsSchema.safeParse(input);
export const validatePlaylist = (input: unknown) =>
  playlistsSchema.safeParse(input);
export const validatePlaylistItem = (input: unknown) =>
  playlist_itemsSchema.safeParse(input);
