mod file_walker;
mod html_packer;

use argh::FromArgs;
use serde_json::{self, Value};
use shared::rust_store::RustStorage;
use shared::{Song, Storage};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use crate::file_walker::SongFile;

/// freqhole cli – for scanning, packing, and generating tasty audio blobz.
#[derive(FromArgs, Debug)]
struct Args {
    /// run the scanner
    #[argh(switch, short = 's')]
    scan: bool,

    /// run as daemon
    #[argh(switch, short = 'd')]
    daemon: bool,

    /// load indexeddb dump
    #[argh(switch)]
    idb: bool,

    /// output playlist template
    #[argh(switch, short = 'p')]
    packer: bool,

    /// generate from template
    #[argh(switch, short = 't')]
    gen_from_template: bool,

    /// optional directory argument
    #[argh(positional)]
    dir: Option<String>,
    // /// title for generated HTML
    // #[argh(option)]
    // title: Option<String>,

    // /// path to audio file
    // #[argh(option)]
    // audio: Option<String>,
}

// #TOOD: avoid the dotdot paths and just setup in the home dir
// like ~/.freqhole/
pub const CHECKPOINT_FILE: &str = "../freqhole-scan-checkpoint.json";
pub const OUTPUT_FILE: &str = "../freqhole-scan-files.json";
pub const PACKER_FILE: &str = "../freqhole-packer.txt";
pub const PACKER_OUT: &str = "../freqhole-packer.html";

fn load_songs_from_file<P: AsRef<Path>>(path: P) -> anyhow::Result<Vec<SongFile>> {
    let file_content = std::fs::read_to_string(path)?;
    let songs: Vec<SongFile> = serde_json::from_str(&file_content)?;
    Ok(songs)
}

fn packer(file_list: &str, output_html: &str) -> anyhow::Result<()> {
    let file = std::fs::File::open(file_list)?;
    let reader = BufReader::new(file);

    // Collect non-empty, trimmed paths into a Vec<PathBuf>
    let paths: Vec<PathBuf> = reader
        .lines()
        .filter_map(Result::ok)
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .collect();

    if paths.is_empty() {
        anyhow::bail!("No valid paths found in the file.");
    }

    html_packer::html_packer(&paths, output_html)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Args = argh::from_env();

    if args.scan {
        println!("Scanning files...");

        if let Some(dir) = &args.dir {
            println!("Using directory: {}", dir);

            if args.daemon {
                // this will go foreverrrrrr
                println!("STARTING FILE SCAN DAEMON (ctrl + c to exit)");
                let base_path = PathBuf::from(&dir);
                file_walker::loop_walk(base_path.clone()).await?;
            } else {
                println!("START!");
                let base_path = PathBuf::from(&dir);
                file_walker::walk(base_path.clone()).await?;
            }
        }
    }

    if args.idb {
        println!("GONNA LOAD IDB FROM JSON");
        let store = RustStorage::new().await.expect("could not open db");
        println!("before load_songs_from_file");
        let songs = load_songs_from_file(OUTPUT_FILE)?;
        println!("okay we have songz:{}", songs.len());
        for song in songs {
            println!("A SONG keyz{:?}", &song.metadata.tags.keys());
            fn value_to_u64(val: &Value) -> Option<u64> {
                match val {
                    Value::Number(n) => n.as_u64(),
                    Value::String(s) => s.parse::<u64>().ok(),
                    _ => None,
                }
            }

            let seconds =
                value_to_u64(song.metadata.properties.get("duration").unwrap()).unwrap_or(0);

            if let Some(dir) = &args.dir {
                println!("Using directory: {}", dir);

                let base_path = dir.clone();

                let new_song = Song {
                    // song,
                    id: song.id,
                    path: song.path.clone(),
                    base_path: base_path.into(),
                    title: song
                        .metadata
                        .tags
                        .get("TrackTitle")
                        .map(|s| s.to_string())
                        .unwrap_or(song.path.clone()),
                    album: song
                        .metadata
                        .tags
                        .get("AlbumTitle")
                        .map(|s| s.to_string())
                        .unwrap_or_default(),
                    artist: song
                        .metadata
                        .tags
                        .get("TrackArtist")
                        .map(|s| s.to_string())
                        .unwrap_or_default(),
                    seconds: seconds,
                };
                println!("okay so new_song:{:?}", new_song.clone());

                store.store_song(new_song.clone()).await?;
            }
        }
    }

    if args.packer {
        println!(
            "packer will try to use: {} and output to: {}",
            PACKER_FILE, PACKER_OUT
        );
        packer(PACKER_FILE, PACKER_OUT)?;
        println!("done!");
    }

    if args.gen_from_template {
        println!("Generating from template...");
        html_packer::blob_template(
            "FREQHOLE FROM RUST CLI DEMO",
            "../tauri/public/freqhole.mp3",
            "../tauri/dist-wc/index.template.html",
            "../tauri/dist-wc/from-rust-cli-demo.html",
        )
        .unwrap();
    }

    // if let Some(audio_path) = &args.audio {
    //     println!("Audio path provided: {}", audio_path);
    // }

    println!("byeeeee!");
    Ok(())
}
