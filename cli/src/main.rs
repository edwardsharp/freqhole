use shared::rust_store::RustStorage;
use shared::{Song, Storage};
use uuid::Uuid;
use walkdir::WalkDir;

fn read_songs_from_dir(dir: &str) -> Vec<Song> {
    WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .filter(|e| {
            if let Some(ext) = e.path().extension() {
                matches!(
                    ext.to_str().unwrap_or("").to_lowercase().as_str(),
                    "mp3" | "ogg" | "wav"
                )
            } else {
                false
            }
        })
        .map(|entry| {
            let path = entry.path().to_string_lossy().to_string();
            let title = entry.file_name().to_string_lossy().to_string();
            Song {
                id: Uuid::new_v4().to_string(),
                title,
                path,
            }
        })
        .collect()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dir = std::env::args()
        .nth(1)
        .expect("Please provide a directory path");

    // let store = RustStorage::new()?;
    let store = RustStorage::new().await.expect("could not open db");

    let songs = read_songs_from_dir(&dir);
    for song in songs {
        store.store_song(song).await?;
    }

    println!("Indexed songs from {}", dir);
    Ok(())
}
