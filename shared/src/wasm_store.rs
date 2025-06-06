use idb::{Database, DatabaseEvent, Factory, IndexParams, TransactionMode};
use idb::{Error as IdbError, KeyPath, ObjectStoreParams};
use serde::{de::DeserializeOwned, Serialize};
use serde_wasm_bindgen;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::JsValue;

use crate::{Song, Storage};

use std::error::Error;
use std::rc::Rc;

#[derive(Debug)]
pub struct WasmStorage {
    pub db: Rc<Database>,
    song_store: CollectionStore<Song>,
}

async fn open_db(name: &str, version: u32) -> Result<Database, IdbError> {
    let factory = Factory::new()?;
    let mut open_request = factory.open(name, Some(version)).unwrap();

    open_request.on_upgrade_needed(|event| {
        let database = event.database().unwrap();

        // APPSTATE
        // no auto increment here, just a key/value store.
        let mut appstate_store_params = ObjectStoreParams::new();
        appstate_store_params.key_path(Some(KeyPath::new_single("key")));

        let appstate = database
            .create_object_store("appstate", appstate_store_params)
            .unwrap();
        let value_index = IndexParams::new();
        appstate
            .create_index("value", KeyPath::new_single("value"), Some(value_index))
            .unwrap();

        // the rest of the stores are more collection-like
        let mut uniq_index = IndexParams::new();
        uniq_index.unique(true);

        // SONGS

        let mut songs_store_params = ObjectStoreParams::new();
        songs_store_params.key_path(Some(KeyPath::new_single("id")));
        songs_store_params.auto_increment(true);
        let songs = database
            .create_object_store("songs", songs_store_params)
            .unwrap();
        songs
            .create_index(
                "title",
                KeyPath::new_single("title"),
                Some(uniq_index.clone()),
            )
            .unwrap();

        // PLAYLISTS
        let mut playlists_store_params = ObjectStoreParams::new();
        playlists_store_params.key_path(Some(KeyPath::new_single("id")));
        playlists_store_params.auto_increment(true);
        let playlists = database
            .create_object_store("playlists", playlists_store_params)
            .unwrap();

        playlists
            .create_index(
                "name",
                KeyPath::new_single("name"),
                Some(uniq_index.clone()),
            )
            .unwrap();
    });

    open_request.await
}

#[cfg_attr(feature = "wasm", async_trait::async_trait(?Send))]
#[cfg_attr(feature = "rust", async_trait::async_trait)]
impl Storage for WasmStorage {
    // async fn new_with_path(path: &str) -> Result<Self, Box<dyn Error>> {
    //     // Ok(Self {
    //     //     db: open_db(&path, 0),
    //     // })
    //     let db = open_db(path, 0).await?; // <- await the future here
    //     Ok(Self { db })
    // }
    async fn new_with_path(path: &str) -> Result<Self, Box<dyn Error>> {
        // let db = open_db(path, 0).await?;
        // Ok(Self {
        //     song_store: CollectionStore::new(db.clone(), "songs"),
        //     db,
        // })

        let db = Rc::new(open_db(path, 1).await?);
        Ok(Self {
            song_store: CollectionStore::new(db.clone(), "songs"),
            db,
        })
    }

    // async fn store_song(&self, song: Song) -> Result<(), Box<dyn Error>> {
    //     let key = song.id.as_bytes();
    //     let val = serde_json::to_vec(&song)?;
    //     self.db.insert(key, val)?;
    //     Ok(())
    // }
    async fn store_song(&self, song: Song) -> Result<(), Box<dyn Error>> {
        let key = song.id.as_str();
        self.song_store.put(key, &song).await?;
        // self.song_store.put(key, &song).await?;
        Ok(())
    }

    // async fn get_all_songs(&self) -> Result<Vec<Song>, Box<dyn Error>> {
    //     let songs = self
    //         .db
    //         .iter()
    //         .filter_map(|e| e.ok())
    //         .filter_map(|(_, v)| serde_json::from_slice(&v).ok())
    //         .collect();
    //     Ok(songs)
    // }
    async fn get_all_songs(&self) -> Result<Vec<Song>, Box<dyn Error>> {
        Ok(self.song_store.get_all().await?)
    }
}

#[derive(Debug)]
pub struct CollectionStore<T> {
    pub db: Rc<Database>,
    pub store_name: &'static str,
    _marker: std::marker::PhantomData<T>,
}

impl<T> CollectionStore<T>
where
    T: Serialize + DeserializeOwned,
{
    pub fn new(db: Rc<Database>, store_name: &'static str) -> Self {
        Self {
            db,
            store_name,
            _marker: std::marker::PhantomData,
        }
    }

    // #TODO: deal with _key arg...
    pub async fn put(&self, _key: &str, value: &T) -> Result<JsValue, IdbError> {
        let tx = self
            .db
            .transaction(&[self.store_name], TransactionMode::ReadWrite)?;
        let store = tx.object_store(self.store_name)?;

        // let js_value = serde_wasm_bindgen::to_value(value).map_err(|_| IdbError::Type)?;
        // store.add(key.into(), js_value)?;
        // tx.await

        // Prepare data to add
        // let employee = serde_json::json!({
        //     "name": "John Doe",
        //     "email": "john@example.com",
        // });

        let song = serde_json::json!(value);

        // Add data to object store
        let id = store
            .add(
                &song.serialize(&Serializer::json_compatible()).unwrap(),
                None,
            )
            .unwrap()
            .await?;

        // Commit the transaction
        tx.commit()?.await?;

        Ok(id)
        // Ok(())
    }

    pub async fn get_all(&self) -> Result<Vec<T>, IdbError> {
        let tx = self
            .db
            .transaction(&[self.store_name], TransactionMode::ReadOnly)?;
        let store = tx.object_store(self.store_name)?;
        let values = store.get_all(None, None)?.await?;
        let mut result = Vec::new();
        for val in values.iter() {
            let parsed: T = serde_wasm_bindgen::from_value(val.clone()).unwrap(); // todo avoid unwrap()

            // serde_wasm_bindgen::from_value(val.clone()).map_err(|_| IdbError::Type)?;

            result.push(parsed);
        }
        Ok(result)
    }
}

#[derive(Debug)]
pub struct KeyValStore {
    pub db: Database,
    pub store_name: &'static str,
}

impl KeyValStore {
    pub fn new(db: Database, store_name: &'static str) -> Self {
        Self { db, store_name }
    }

    pub async fn set<T: Serialize>(&self, key: &str, value: &T) -> Result<JsValue, idb::Error> {
        let tx = self
            .db
            .transaction(&[self.store_name], TransactionMode::ReadWrite)?;
        let store = tx.object_store(self.store_name)?;
        let js_value = serde_wasm_bindgen::to_value(value).unwrap();
        store.add(&JsValue::from(key), Some(&js_value))?;
        tx.commit()?.await?;

        Ok(JsValue::from(key))
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, IdbError> {
        let tx = self
            .db
            .transaction(&[self.store_name], TransactionMode::ReadOnly)?;
        let store = tx.object_store(self.store_name)?;
        let js_val = store.get(JsValue::from(key))?.await?;
        if let Some(val) = js_val {
            Ok(Some(
                // serde_wasm_bindgen::from_value(val).map_err(|_| IdbError::Type)?,
                serde_wasm_bindgen::from_value(val).unwrap(), // todo avoid unwrap()
            ))
        } else {
            Ok(None)
        }
    }
}
