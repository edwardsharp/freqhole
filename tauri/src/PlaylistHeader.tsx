import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

import { createSignal, createEffect, Show, onCleanup } from "solid-js";
import { useSongs } from "./context";
import { getPlaylist, Playlist, updatePlaylist } from "./db";

import "./PlaylistHeader.css";
import { useImageBlobUrl } from "./useImageBlob";

export function PlaylistHeader() {
  const { filter, playlistId } = useSongs();
  const [playlist, setPlaylist] = createSignal<Playlist | null>();
  const [name, setName] = createSignal("");
  const [editingName, setEditingName] = createSignal(false);
  const [description, setDescription] = createSignal("");
  const [editingDescription, setEditingDescription] = createSignal(false);

  const [imageData, setImageData] = createSignal<Uint8Array | null>(null);
  const imageUrl = useImageBlobUrl(imageData);

  async function handleFileChange(e: Event) {
    e.stopPropagation();
    try {
      const file_path = await open({
        multiple: false,
        directory: false,
      });
      console.log(file_path);
      if (!file_path) return;

      const buf = await readFile(file_path);

      updatePlaylist({
        id: parseInt(`${playlistId()}`),
        image_blob: buf,
      });
      setImageData(buf);
    } catch (e) {
      console.log(
        "caught error trying to open file? maybe not tauri? trying another option...",
      );
    }

    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      file.arrayBuffer().then((buffer) => {
        updatePlaylist({
          id: parseInt(`${playlistId()}`),
          image_blob: new Uint8Array(buffer),
        });

        setImageData(new Uint8Array(buffer));
      });
    }
  }

  function done() {
    updatePlaylist({
      id: parseInt(`${playlistId()}`),
      name: name(),
      description: description(),
    });
    setEditingName(false);
    setEditingDescription(false);
    destroyClickAwayListener();
  }

  function destroyClickAwayListener() {
    window.removeEventListener("click", done);
  }
  function setupWindowClickAwayListener() {
    destroyClickAwayListener();
    window.addEventListener("click", done);
  }

  // not quite sure the diff between createEfect and onMount 🤔
  createEffect(async () => {
    const p = await getPlaylist(playlistId());
    setPlaylist(p);
    setName(p?.name || "");
    setDescription(p?.description || "");
    setImageData(p?.image_blob || null);
  });

  onCleanup(() => {
    setPlaylist(null);
    setEditingName(false);
    setEditingDescription(false);
    setName("");
    setDescription("");
    destroyClickAwayListener();
  });

  return (
    <Show when={filter() === "playlist" && playlist()}>
      <div
        id="playlist-header"
        style={{
          "background-image": imageUrl() ? `url(${imageUrl()})` : "none",
          "background-size": "cover",
        }}
        onDblClick={handleFileChange}
      >
        <div>
          <div
            id="playlist-name"
            class={`${editingName() ? " editing" : ""}`}
            contentEditable={editingName()}
            onInput={(e) =>
              e.target.textContent && setName(e.target.textContent)
            }
            onClick={(e) => e.stopPropagation()}
            onDblClick={(e) => {
              e.stopPropagation();
              setEditingName(true);
              setupWindowClickAwayListener();
            }}
            onKeyPress={(e) => {
              // i guess trying to avoid `\n` in the name? 🤷
              if (e.key === "Enter" || e.key === "Escape") {
                done();
                return;
              }
            }}
          >
            {playlist()?.name}
          </div>

          <div
            id="playlist-description"
            class={`${editingDescription() ? " editing" : ""}`}
            contentEditable={editingDescription()}
            onInput={(e) =>
              e.target.textContent && setDescription(e.target.textContent)
            }
            onClick={(e) => e.stopPropagation()}
            onDblClick={(e) => {
              e.stopPropagation();
              setEditingDescription(true);
              setupWindowClickAwayListener();
            }}
            onKeyPress={(e) => {
              if (e.key === "Escape") {
                done();
                return;
              }
            }}
          >
            {playlist()?.description}
            {!playlist()?.description && (
              <span class="hover-help">double click to add a description.</span>
            )}
          </div>
        </div>

        <div class="grow">&nbsp;</div>
        <div class="menu" onClick={handleFileChange}>
          <div class="normal">&nbsp;</div>
          <div class="hover">change image</div>
        </div>

        {!readFile && (
          <input type="file" accept="image/*" onChange={handleFileChange} />
        )}
      </div>
    </Show>
  );
}
