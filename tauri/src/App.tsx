import { onMount, createSignal } from "solid-js";

// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import SongList from "./SongList";
import { initSeedSongs } from "./db";
import { SideBar } from "./Sidebar";
import { Controls } from "./Controls";
import { FreqholeProvider } from "./context";
import { FlyoutMenuProvider } from "./FlyoutMenuProvider";
import { FlyoutMenu } from "./FlyoutMenu";
import { PlaylistHeader } from "./PlaylistHeader";

function App() {
  const [loading, setLoading] = createSignal(true);

  // const [greetMsg, setGreetMsg] = createSignal("");
  // const [name, setName] = createSignal("");

  onMount(async () => {
    await initSeedSongs();
    setLoading(false);
  });

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name: name() }));
  // }

  return (
    <FreqholeProvider>
      <FlyoutMenuProvider>
        {!loading() ? (
          <div id="freqhole">
            <SideBar />
            <main>
              <PlaylistHeader />
              <SongList />
              <Controls />
            </main>
            <FlyoutMenu />
          </div>
        ) : (
          <h1>loading...</h1>
        )}
      </FlyoutMenuProvider>
    </FreqholeProvider>
  );
}

export default App;
