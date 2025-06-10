import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import fs from "fs";
import path from "path";

const DEMO_MP3_PATH = "./public/freqhole.mp3";
const DEMO_TITLE = "FREQHOLE DEMO";

function inlineHtmlTemplate(): import("vite").Plugin {
  return {
    name: "generate-inline-html",
    generateBundle(_, bundle) {
      const jsAsset = Object.values(bundle).find(
        (file) => file.type === "chunk" && file.fileName.endsWith(".js"),
      );

      if (!jsAsset || jsAsset.type !== "chunk") {
        console.error("JS asset not found");
        return;
      }

      const templateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>freqhole webcomponent</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
  </style>
</head>
<body>
  <my-component name="\${title}"></my-component>

  <script type="module">
${jsAsset.code}
  </script>

  <script>
    const config = fetch("freqhole.player.config.json")
      .then((r) => r.json)
      .then((config) => console.log(config));
    const audioBlobStr = "\${audioBlob}";
    const binary = atob(audioBlobStr); // decode base64
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.controls = true;
    document.body.appendChild(audio);
  </script>
</body>
</html>
      `.trim();

      this.emitFile({
        type: "asset",
        fileName: "index.template.html",
        source: templateHtml,
      });

      // If demo file exists, embed it
      let demoAudioBase64 = "";
      try {
        const audioBytes = fs.readFileSync(path.resolve(DEMO_MP3_PATH));
        demoAudioBase64 = audioBytes.toString("base64");
      } catch (err) {
        console.warn(`⚠️ Could not read demo MP3 file at ${DEMO_MP3_PATH}`);
      }

      const finalHtml = templateHtml
        .replace("${title}", DEMO_TITLE)
        .replace("${audioBlob}", demoAudioBase64);

      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: finalHtml,
      });

      console.log("✅ Emitted: index.template.html and index.html");
    },
  };
}

export default defineConfig({
  plugins: [solid(), inlineHtmlTemplate()],
  build: {
    outDir: "dist-wc",
    target: "esnext",
    minify: true, //"terser"
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "./src/web-components/main.ts",
      },
    },
  },
});
