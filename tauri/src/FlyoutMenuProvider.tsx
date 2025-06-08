import { createSignal, createContext, useContext, JSX } from "solid-js";

type MenuItem = {
  label: string;
  onClick: () => void;
};

type Anchor = { x: number; y: number };

type FlyoutContextType = {
  open: (anchor: Anchor, items: MenuItem[]) => void;
  close: () => void;
  isOpen: () => boolean;
  items: () => MenuItem[];
  anchor: () => Anchor;
};

const FlyoutMenuContext = createContext<FlyoutContextType>();

export function FlyoutMenuProvider(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [items, setItems] = createSignal<MenuItem[]>([]);
  const [anchor, setAnchor] = createSignal<Anchor>({ x: 0, y: 0 });

  const open = (a: Anchor, i: MenuItem[]) => {
    const MENU_WIDTH = 200;
    const MENU_HEIGHT = 50; // or there aboutz
    const viewportWidth = window.innerWidth - 10;
    const viewportHeight = window.innerHeight - 10;

    let x = a.x;
    let y = a.y;

    if (x + MENU_WIDTH > viewportWidth) {
      x = viewportWidth - MENU_WIDTH; // 10px padding from edge
    }
    if (y + MENU_HEIGHT > viewportHeight) {
      y = viewportHeight - MENU_HEIGHT;
    }

    setAnchor({ x, y });
    // setAnchor(a);
    setItems(i);
    setIsOpen(true);
    console.log("OPEN YR FLY!!");
  };

  const close = () => setIsOpen(false);

  return (
    <FlyoutMenuContext.Provider value={{ open, close, isOpen, items, anchor }}>
      {props.children}
    </FlyoutMenuContext.Provider>
  );
}

export function useFlyoutMenu() {
  const ctx = useContext(FlyoutMenuContext);
  if (!ctx)
    throw new Error("useFlyoutMenu must be used within FlyoutMenuProvider");
  return ctx;
}
