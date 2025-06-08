import { For, Show } from "solid-js";
import { useFlyoutMenu } from "./FlyoutMenuProvider";
import "./FlyoutMenu.css";

export function FlyoutMenu() {
  const { isOpen, items, anchor, close } = useFlyoutMenu();

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
        <For each={items()}>
          {(item) => (
            <div
              class="item"
              onClick={() => {
                item.onClick();
                close();
              }}
            >
              {item.label}
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
