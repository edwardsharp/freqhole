use shared::rust_store::RustStorage;
use shared::Storage;

use std::{convert::Infallible, path::Path, path::PathBuf};
use tokio::fs;
use tokio::fs::File;
use tokio_util::io::ReaderStream;
use warp::{cors, http::Response, hyper::Body, Filter, Reply};

#[tokio::main]
async fn main() {
    let store = RustStorage::new().await.expect("could not open db");
    let store_filter = warp::any().map(move || store.clone());
    let cors = cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "POST", "OPTIONS"]) // Add methods you need
        .allow_headers(vec!["Content-Type"]); // Optional: allow custom headers

    let index = warp::path("songs")
        // .and(warp::path::end()) // <--- restrict to exact path
        .and(store_filter.clone())
        .and_then(|store: RustStorage| async move {
            let songs = store.get_all_songs().await.unwrap_or_default();
            Ok::<_, warp::Rejection>(warp::reply::json(&songs))
        })
        .with(&cors);

    // Route: GET /song-file/:id
    let song_file_route = warp::path!("song" / String)
        .and(store_filter.clone())
        .and_then(|id: String, store: RustStorage| async move { get_song_file(id, store).await })
        .with(&cors);

    // let static_files = warp::fs::dir("../pwa/").with(&cors);
    let static_dir = "../pwa";

    let static_files = warp::path::tail().and_then(move |tail: warp::path::Tail| {
        let path = PathBuf::from(format!("{}/{}", static_dir, tail.as_str()));
        async move {
            if !path.exists() {
                return Ok::<_, Infallible>(
                    warp::reply::with_status("Not Found", warp::http::StatusCode::NOT_FOUND)
                        .into_response(),
                );
            }

            match fs::read(&path).await {
                Ok(contents) => {
                    let mime = if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                        match ext {
                            "json" => "application/json",
                            "js" => "application/javascript",
                            "css" => "text/css",
                            "html" => "text/html",
                            "svg" => "image/svg+xml",
                            "ico" => "image/x-icon",
                            _ => "application/octet-stream",
                            // _ => mime_guess::from_path(&path)
                            //     .first_or_octet_stream()
                            //     .as_ref(),
                        }
                    } else {
                        "application/octet-stream"
                    };

                    println!("zomg path:{} mime:{}", &tail.as_str(), &mime);

                    Ok(Response::builder()
                        .header("Content-Type", mime)
                        .body(Body::from(contents))
                        .unwrap()
                        .into_response())
                }
                Err(_) => Ok(warp::reply::with_status(
                    "Internal Server Error",
                    warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                )
                .into_response()),
            }
        }
    });

    let routes = index.or(song_file_route).or(static_files);

    println!("Serving indexed songs on http://localhost:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}

async fn get_song_file(id: String, store: RustStorage) -> Result<impl warp::Reply, Infallible> {
    let songs = match store.get_all_songs().await {
        Ok(songs) => songs,
        Err(_) => {
            return Ok(warp::reply::with_status(
                "db err",
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            )
            .into_response())
        }
    };

    if let Some(song) = songs.into_iter().find(|s| s.id == id) {
        let path = Path::new(&song.path);
        match File::open(path).await {
            Ok(file) => {
                let stream = ReaderStream::new(file);
                let body = warp::hyper::Body::wrap_stream(stream);

                let mime = mime_guess::from_path(path).first_or_octet_stream();

                Ok(Response::builder()
                    .header("Content-Type", mime.as_ref())
                    .body(body)
                    .unwrap())
            }
            Err(_) => {
                let resp =
                    warp::reply::with_status("File not found", warp::http::StatusCode::NOT_FOUND);
                Ok(resp.into_response())
            }
        }
    } else {
        let resp = warp::reply::with_status("File not found", warp::http::StatusCode::NOT_FOUND);
        Ok(resp.into_response())
    }
}
