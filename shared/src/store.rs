use crate::models::*;

use std::error::Error;

#[cfg_attr(feature = "wasm", async_trait::async_trait(?Send))]
#[cfg_attr(feature = "rust", async_trait::async_trait)]
pub trait Storage {
    async fn new() -> Result<Self, Box<dyn Error>>
    where
        Self: Sized,
    {
        Self::new_with_path("library").await
    }

    async fn new_with_path(path: &str) -> Result<Self, Box<dyn Error>>
    where
        Self: Sized;

    async fn store_song(&self, song: Song) -> Result<(), Box<dyn Error>>;
    async fn get_all_songs(&self) -> Result<Vec<Song>, Box<dyn Error>>;
}
