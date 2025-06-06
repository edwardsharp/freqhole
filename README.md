# freqhole

yet another web audio player


## 🔧 code structure overview

  shared/
    models.rs: shared types like Song, Playlist, UIState
    store.rs: storage trait with async methods
    rust_store.rs: storage implementation using sled
    wasm_store.rs: storage implementation with idb and wasm-bindgen
  cli/
    scans a directory, creates Song objects, and stores them using the Storage trait
  server/
    uses the same Storage trait to expose songs via a warp HTTP API

## 🔌 usage

### cli

`cargo run -p cli -- ./yr-music-dir`

### server

`cargo run -p server`

then access songs:

`curl http://localhost:3030/songs`

### wasm frontend pwa

`cargo install wasm-pack` once

```
cd pwa
./build.sh
```

then serve pwa/examples/index.html (e.g., via `python3 -m http.server` or whatever)
