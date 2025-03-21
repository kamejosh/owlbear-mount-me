import { defineConfig } from "vite";
import { resolve } from "path";

declare var __dirname: string;
export default defineConfig({
    server: { host: "0.0.0.0", cors: true },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
            },
        },
    },
});
