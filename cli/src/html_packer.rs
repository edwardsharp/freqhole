use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

use base64::{engine::general_purpose, Engine as _};

pub fn html_packer<P: AsRef<Path>>(paths: &[P], output_html: &str) -> anyhow::Result<()> {
    let mut blobs = String::new();

    for (i, path) in paths.iter().enumerate() {
        let bytes = fs::read(path)?;
        let b64 = general_purpose::STANDARD.encode(&bytes);
        let mime = mime_guess::from_path(path).first_or_octet_stream();

        blobs.push_str(&format!(
            "window.audioBlobs[\"{}\"] = {{ mime: \"{}\", base64: \"{}\" }};\n",
            i, mime, b64
        ));
    }

    let html = format!(
        r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FREQHOLE</title>
  <style>
  html, body {{
    background: black;
    color: white;
  }}
  *:hover {{
    color: magenta;
  }}
  </style>
</head>
<body>
  <h1>FREQHOLE</h1>
  <h2 id="loading">loading...</h2>
  <div id="list"></div>

  <script>
    window.audioBlobs = {{}};

    {blobs}

    // setup some audio playerz with the huge blobz
    Object.entries(window.audioBlobs).forEach(([key, {{ mime, base64 }}]) => {{
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const blob = new Blob([bytes], {{ type: mime }});
      const url = URL.createObjectURL(blob);

      const el = document.createElement("div");
      el.innerHTML = `
        <p>Audio ${{key}}</p>
        <audio controls src="${{url}}"></audio>
      `;
      document.getElementById("list").appendChild(el);
      document.getElementById("loading").style.display = "none";
    }});
  </script>
</body>
</html>"#
    );

    let mut out = File::create(output_html)?;
    out.write_all(html.as_bytes())?;

    Ok(())
}
