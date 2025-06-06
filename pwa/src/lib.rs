use shared::wasm_store::WasmStorage;
use shared::{Song, Storage};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub async fn start() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();
    WasmStorage::new()
        .await
        .map_err(|e| JsValue::from_str(&format!("DB error: {}", e)))?;

    Ok(())
}

#[wasm_bindgen]
pub async fn save_sample_song(song_val: JsValue) -> Result<(), JsValue> {
    let song: Song = serde_wasm_bindgen::from_value(song_val)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;

    let store = WasmStorage::new()
        .await
        .map_err(|e| JsValue::from_str(&format!("DB error: {}", e)))?;

    store
        .store_song(song)
        .await
        .map_err(|e| JsValue::from_str(&format!("Store error: {}", e)))
}

#[wasm_bindgen]
pub async fn get_all_songs() -> Result<JsValue, JsValue> {
    let store = WasmStorage::new()
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let songs = store
        .get_all_songs()
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&songs).map_err(|e| JsValue::from_str(&e.to_string()))
}
