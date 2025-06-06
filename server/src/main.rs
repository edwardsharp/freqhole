use shared::rust_store::RustStorage;
use shared::Storage;
use warp::Filter;

#[tokio::main]
async fn main() {
    // let store = RustStorage::new().await.expect("could not open db");
    let store = RustStorage::new().await.expect("could not open db");

    let store_filter = warp::any().map(move || store.clone());

    let route = warp::path("songs")
        .and(store_filter)
        .and_then(|store: RustStorage| async move {
            let songs = store.get_all_songs().await.unwrap_or_default();
            Ok::<_, warp::Rejection>(warp::reply::json(&songs))
        });

    println!("Serving indexed songs on http://localhost:3030/songs");
    warp::serve(route).run(([127, 0, 0, 1], 3030)).await;
}
