import { createSignal, For, Show } from "solid-js";
import { useFlyoutMenu } from "./FlyoutMenuProvider";
import "./FlyoutMenu.css";

export function FlyoutMenu() {
  const { isOpen, items, anchor, close, isFocused, setIsFocused } =
    useFlyoutMenu();

  const [playlistName, setPlaylistName] = createSignal("");

  return (
    <Show when={isOpen()}>
      <div
        class="flyout"
        style={{
          top: `${anchor().y}px`,
          left: `${anchor().x}px`,
        }}
        onMouseLeave={close}
      >
        <div class="input">
          <input
            type="text"
            placeholder="new playlist name"
            style={{ "max-width": "200px" }}
            value={playlistName()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              close();
            }}
            onInput={(e) => setPlaylistName(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                items()[0].onClick(playlistName());
                setPlaylistName("");
                close();
              }
              if (event.key === "Escape") {
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <Show when={!isFocused()}>
          <div class="items">
            <For each={items()}>
              {(item, idx) =>
                idx() !== 0 && (
                  <div
                    class="item"
                    onClick={() => {
                      item.onClick();
                      close();
                    }}
                  >
                    {item.label}
                  </div>
                )
              }
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
