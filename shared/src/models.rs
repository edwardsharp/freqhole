use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub song_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UIState {
    pub current_song_id: Option<String>,
    pub is_playing: bool,
    pub queue: Vec<String>,
}
