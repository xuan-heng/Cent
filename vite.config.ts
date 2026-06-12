import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { buildSync } from "esbuild";
import Info from "unplugin-info/vite";
import { defineConfig, type PluginOption } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import { createHtmlPlugin } from "vite-plugin-html";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

// ========== 顶层静态构建 plugins ==========
const shouldAnalyze = process.env.ANALYZE === "true";

// 如果需要 mode 相关的 env，可以在这里手动加载
// 注意：Cloudflare Pages 构建时 process.env 中会有对应的环境变量
const VITE_GTAG_SCRIPT = process.env.VITE_GTAG_SCRIPT || "";

const plugins: PluginOption[] = [
    Info(),
    createHtmlPlugin({
        inject: {
            data: {
                VITE_GTAG_SCRIPT,
                injectPresetScript: buildSync({
                    entryPoints: ["src/inline/load-preset.ts"],
                    bundle: true,
                    minify: true,
                    write: false,
                    format: "iife",
                }).outputFiles[0].text,
            },
        },
    }),
    react(),
    svgr(),
    tailwindcss(),
    VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["favicon.ico", "apple-touch-icon.png"],
        manifest: {
            name: "Cent - 日计",
            short_name: "Cent",
            description: "Accounting your life - 记录每一天",
            theme_color: "#ffffff",
            icons: [
                { src: "icon.png", sizes: "192x192", type: "image/png" },
                { src: "icon.png", sizes: "512x512", type: "image/png" },
            ],
            protocol_handlers: [
                {
                    protocol: "cent-accounting",
                    url: "/add-bills?text=%s",
                    client_mode: "focus-existing",
                } as any,
            ],
            launch_handler: {
                client_mode: ["navigate-existing", "auto"],
            },
        },
    }),
];

if (shouldAnalyze) {
    plugins.push(analyzer());
}

// ========== 简化的 defineConfig ==========
export default defineConfig({
    plugins,  // ← 直接引用，不是函数返回
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes("zod")) return "zod";
                    if (id.includes("@dnd-kit")) return "dndkit";
                    if (id.includes("echarts")) return "echarts";
                    if (id.includes("react-day-picker")) return "reactDayPicker";
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": resolve("./src"),
        },
    },
    worker: {
        format: "es",
    },
    server: {
        proxy: {
            "/google-api": {
                target: "https://generativelanguage.googleapis.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/google-api/, ""),
            },
        },
    },
});