mod file_walker;
mod html_packer;

use serde_json::{self, Value};
use shared::rust_store::RustStorage;
use shared::{Song, Storage};
use std::io::{self, BufRead, BufReader};
use std::path::{Path, PathBuf};

use crate::file_walker::SongFile;

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

// fn packer<P: AsRef<Path>>(path: P) -> io::Result<()> {
//     let path = path.as_ref();

//     // Check if file exists
//     if !path.exists() {
//         eprintln!("Error: file does not exist: {}", path.display());
//         return Err(io::Error::new(io::ErrorKind::NotFound, "File not found"));
//     }

//     // Check if file is empty
//     let metadata = std::fs::metadata(path)?;
//     if metadata.len() == 0 {
//         eprintln!("Warning: file is empty: {}", path.display());
//         return Ok(());
//     }

//     // Open and read the file line-by-line
//     let file = std::fs::File::open(path)?;
//     let reader = std::io::BufReader::new(file);

//     // let linez = reader.lines().enumerate();
//     for (index, line_result) in reader.lines().enumerate() {
//         let line = line_result?; // propagate error
//         println!("Line {}: {}", index + 1, line);
//     }

//     // let file_content = std::fs::read_to_string(path)?;
//     let filez = reader.lines();
//     let files = vec![filez];
//     html_packer::html_packer(&files, "output.html");
//     println!("Done! Open output.html in your browser.");

//     Ok(())
// }

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut scan = false;
    let mut load_idb = false;
    let mut damon = false;
    let mut p = false;
    let mut dir: Option<String> = None;

    let mut args = std::env::args().skip(1); // skip the binary name

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "-s" => scan = true,
            "-d" => damon = true,
            "-idb" => load_idb = true,
            "-p" => p = true,
            _ if dir.is_none() => dir = Some(arg),
            _ => {
                eprintln!("onoz, dunno argument: {}", arg);
                std::process::exit(1);
            }
        }
    }

    if p {
        packer(PACKER_FILE, PACKER_OUT)?;
        println!("done!");
        // Ok(())
    }

    if scan || damon {
        // make sure dir is set!
        let dir = dir.clone().unwrap_or_else(|| {
            eprintln!("Error: Please provide a directory path");
            std::process::exit(1);
        });

        if damon {
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

    if load_idb {
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

            let base_path = dir.clone().unwrap_or("".into());

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

    println!("bye!");
    Ok(())
}
