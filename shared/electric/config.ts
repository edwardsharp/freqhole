const config = {
  "vite.config.ts": {
    defineConfig: {
      optimizeDeps: {
        exclude: ["@electric-sql/pglite"],
      },
      worker: {
        format: "es",
      },
    },
  },
  "package.json": {
    dependencies: {
      "@electric-sql/pglite": "^0.3.3",
      "@electric-sql/pglite-sync": "^0.3.6",
      "@electric-sql/pglite-repl": "^0.2.21",
    },
  },
};

export default config;
