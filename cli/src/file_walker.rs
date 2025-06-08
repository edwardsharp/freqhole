use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use lofty::file::TaggedFileExt;
use lofty::tag::ItemValue;
use lofty::{prelude::AudioFile, probe::Probe};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;
use std::{
    collections::VecDeque,
    fs,
    io::{self, Write},
    path::PathBuf,
    time::{Duration, Instant},
};
use tokio::io::AsyncReadExt;
use tokio::{fs::File, io::AsyncWriteExt, time::interval};
use walkdir::{DirEntry, WalkDir};

use crate::{CHECKPOINT_FILE, OUTPUT_FILE};

const MAX_BATCH: usize = 50;
const FLUSH_INTERVAL: Duration = Duration::from_secs(30);

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AudioMetadata {
    pub tags: HashMap<String, String>,
    pub properties: HashMap<String, serde_json::Value>,
    pub file: HashMap<String, serde_json::Value>,
}

async fn get_metadata(f: &str) -> anyhow::Result<AudioMetadata> {
    let path = Path::new(&f);

    let tagged_file = Probe::open(&path)?.read()?;

    let mut tags_map = HashMap::new();
    if let Some(tag) = tagged_file.primary_tag() {
        for item in tag.items() {
            let key = format!("{:?}", item.key());
            // let value = format!("{:?}", item.value());

            let value_str = match item.value() {
                ItemValue::Text(s) | ItemValue::Locator(s) => s.clone(),
                ItemValue::Binary(_) => "".into(),
                // ItemValue::Unsigned(n) => &n.to_string(),
                // ItemValue::Signed(n) => &n.to_string(),
                // ItemValue::Float(f) => &f.to_string(),
                // _ => "<unknown>".into(),
            };

            tags_map.insert(key, value_str);
        }
    }

    let props = tagged_file.properties();

    let mut props_map = HashMap::new();
    props_map.insert(
        "duration".to_string(),
        serde_json::json!(props.duration().as_secs()),
    );
    props_map.insert(
        "sample_rate".to_string(),
        serde_json::json!(props.sample_rate()),
    );
    props_map.insert("channels".to_string(), serde_json::json!(props.channels()));
    props_map.insert(
        "bitrate".to_string(),
        serde_json::json!(props.audio_bitrate()),
    );
    props_map.insert(
        "bit_depth".to_string(),
        serde_json::json!(props.bit_depth()),
    );

    let metadata = tokio::fs::metadata(&path).await?;
    let mut metadata_map = HashMap::new();

    if let Ok(modified) = metadata.modified() {
        metadata_map.insert("modified".to_string(), serde_json::json!(modified));
    }

    if let Ok(created) = metadata.created() {
        metadata_map.insert("created".to_string(), serde_json::json!(created));
    }

    metadata_map.insert("len_bytes".to_string(), serde_json::json!(metadata.len()));

    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            metadata_map.insert("ext".to_string(), serde_json::json!(ext_str));
        }
    }

    Ok(AudioMetadata {
        tags: tags_map,
        properties: props_map,
        file: metadata_map,
    })
}
// fn truncate_hash(full_hash: &str, length: usize) -> String {
//     full_hash[..length.min(full_hash.len())].to_string()
// }

pub async fn hash_file(path: &str) -> io::Result<String> {
    let mut file = File::open(path).await?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 4096];

    loop {
        let n = file.read(&mut buffer).await?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    let hash = hasher.finalize();
    // Ok(truncate_hash(&URL_SAFE_NO_PAD.encode(&hash), 12))
    Ok(URL_SAFE_NO_PAD.encode(&hash))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ScanCheckpoint {
    base_path: PathBuf,
    last_scanned: Option<PathBuf>,
}

impl ScanCheckpoint {
    fn load() -> Option<Self> {
        fs::read_to_string(CHECKPOINT_FILE)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    fn save(&self) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)?;
        fs::write(CHECKPOINT_FILE, json)
    }
}

fn stream_files(
    base_path: PathBuf,
    resume_from: Option<PathBuf>,
) -> impl Iterator<Item = DirEntry> {
    let mut entries: Vec<_> = WalkDir::new(&base_path)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| e.file_type().is_file())
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
        .collect();

    entries.sort_by_key(|e| e.path().to_path_buf());

    if let Some(resume_path) = resume_from {
        entries
            .into_iter()
            .skip_while(|e| e.path() <= resume_path.as_path())
            .collect::<Vec<_>>()
            .into_iter()
    } else {
        entries.into_iter()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SongFile {
    pub path: String,
    pub id: String,
    pub metadata: AudioMetadata,
    pub base_path: String,
}

async fn store_files(batch: &[DirEntry], base_path: PathBuf) -> anyhow::Result<()> {
    let mut items = Vec::new();

    for entry in batch {
        let path = entry.path();
        let id = hash_file(&path.to_string_lossy()).await?;
        let metadata = get_metadata(&path.to_string_lossy()).await?;

        items.push(SongFile {
            base_path: base_path.display().to_string(),
            path: path.display().to_string(),
            id,
            metadata,
        });
    }

    let json = serde_json::to_vec_pretty(&items)?;

    let mut f = File::create(OUTPUT_FILE).await?;
    f.write_all(&json).await?;

    print!("\rwrote {OUTPUT_FILE}");
    std::io::stdout().flush()?; // not async

    Ok(())
}

pub async fn walk(base_path: PathBuf) -> anyhow::Result<()> {
    let mut checkpoint = ScanCheckpoint::load().unwrap_or(ScanCheckpoint {
        base_path: base_path.clone(),
        last_scanned: None,
    });

    let mut batch = VecDeque::new();
    let mut last_flush = Instant::now();

    for entry in stream_files(base_path.clone(), checkpoint.last_scanned.clone()) {
        checkpoint.last_scanned = Some(entry.path().to_path_buf());
        batch.push_back(entry.clone());

        if batch.len() >= MAX_BATCH || last_flush.elapsed() > FLUSH_INTERVAL {
            store_files(&batch.make_contiguous(), base_path.clone()).await?;
            batch.clear();
            checkpoint.save()?;
            last_flush = Instant::now();

            let pathstr = entry.clone();
            // inside da loop
            print!("\rScanning: {}", pathstr.path().to_string_lossy());
            io::stdout().flush()?;
            // dunno if this is wokring :/
            // #TODO: deal wit it 🤔
        }
    }

    if !batch.is_empty() {
        store_files(&batch.make_contiguous(), base_path.clone()).await?;
        checkpoint.save()?;
    }

    let _ = std::fs::remove_file(CHECKPOINT_FILE);

    println!("\nScan complete.");

    Ok(())
}

pub async fn loop_walk(base: PathBuf) -> anyhow::Result<()> {
    let mut ticker = interval(Duration::from_secs(30));

    loop {
        ticker.tick().await;
        if let Err(err) = walk(base.clone()).await {
            eprintln!("Scan failed: {}", err);
        }
    }
}
