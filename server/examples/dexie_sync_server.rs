// so starting to port the dexie sync thing: https://github.com/dexie/Dexie.js/blob/master/samples/remote-sync/websocket/WebSocketSyncServer.js
use futures::{FutureExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use warp::ws::{Message, WebSocket};
use warp::Filter;

#[derive(Debug, Deserialize, Serialize)]
struct SyncMessage {
    #[serde(rename = "type")]
    msg_type: String,
    client_id: Option<String>,
    db_name: Option<String>,
    changes: Option<serde_json::Value>,
    base_revision: Option<u64>,
    partial: Option<bool>,
    request_id: Option<String>,
}

type Clients = Arc<Mutex<HashMap<String, mpsc::UnboundedSender<Message>>>>;

#[tokio::main]
async fn main() {
    let clients: Clients = Arc::new(Mutex::new(HashMap::new()));
    let clients_filter = warp::any().map(move || clients.clone());

    let ws_route =
        warp::path("ws")
            .and(warp::ws())
            .and(clients_filter)
            .map(|ws: warp::ws::Ws, clients| {
                ws.on_upgrade(move |socket| handle_connection(socket, clients))
            });

    warp::serve(ws_route).run(([127, 0, 0, 1], 3030)).await;
}

async fn handle_connection(ws: WebSocket, clients: Clients) {
    let (client_ws_sender, mut client_ws_rcv) = ws.split();
    let (tx, rx) = mpsc::unbounded_channel();
    let rx = tokio_stream::wrappers::UnboundedReceiverStream::new(rx);

    // Spawn a task to forward messages from the channel to the WebSocket
    tokio::task::spawn(rx.forward(client_ws_sender).map(|result| {
        if let Err(e) = result {
            eprintln!("WebSocket send error: {}", e);
        }
    }));

    // Handle incoming messages from the client
    while let Some(result) = client_ws_rcv.next().await {
        match result {
            Ok(msg) => {
                if msg.is_text() {
                    let msg_text = msg.to_str().unwrap();
                    match serde_json::from_str::<SyncMessage>(msg_text) {
                        Ok(sync_msg) => {
                            // Handle the sync message
                            println!("Received sync message: {:?}", sync_msg);
                            // Here, you would implement your logic to handle different message types
                        }
                        Err(e) => {
                            eprintln!("Failed to parse message: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("WebSocket error: {}", e);
                break;
            }
        }
    }
}
