import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "jsdom",
        environmentOptions: { jsdom: { url: "http://localhost:3000" } },
        setupFiles: ["./src/test/setup.ts"],
        clearMocks: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["src/lib/**/*.ts", "src/hooks/**/*.ts", "src/components/**/*.tsx"],
            exclude: ["src/lib/server-db.ts"],
        },
    },
});
