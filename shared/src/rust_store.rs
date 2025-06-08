use crate::{Song, Storage};

use sled::Db;
use std::error::Error;

#[derive(Clone, Debug)]
pub struct RustStorage {
    pub db: Db,
}

#[cfg_attr(feature = "wasm", async_trait::async_trait(?Send))]
#[cfg_attr(feature = "rust", async_trait::async_trait)]
impl Storage for RustStorage {
    async fn new_with_path(path: &str) -> Result<Self, Box<dyn Error>> {
        let pformat = format!("../db/{}", path);
        println!("zomg path:{}", pformat);
        let path = std::env::current_dir()?;
        println!("The current directory is {}", path.display());
        Ok(Self {
            db: sled::open(pformat)?,
        })
    }

    async fn store_song(&self, song: Song) -> Result<(), Box<dyn Error>> {
        println!("zomg gonna store_song!");
        let key = song.id.as_bytes();
        let val = serde_json::to_vec(&song)?;
        self.db.insert(key, val)?;
        Ok(())
    }

    async fn get_all_songs(&self) -> Result<Vec<Song>, Box<dyn Error>> {
        println!("ZOMG GONNA get_all_songs!");
        let songs = self
            .db
            .iter()
            .filter_map(|e| e.ok())
            .filter_map(|(_, v)| serde_json::from_slice(&v).ok())
            .collect();
        // println!("zomg have songz {}", songs.len());
        Ok(songs)
    }
}
