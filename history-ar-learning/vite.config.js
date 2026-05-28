import process from "node:process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const timelineConfigPath = path.resolve("public/ar-config/ar-timeline-config.json");

function arConfigWriterPlugin() {
  return {
    name: "ar-config-writer",
    configureServer(server) {
      server.middlewares.use("/ar-config/host-info", (req, res) => {
        const protocol = server.config.server.https ? "https" : "http";
        const port = server.config.server.port || server.httpServer?.address()?.port || 5173;
        const interfaces = os.networkInterfaces();
        const lanAddress = Object.values(interfaces)
          .flat()
          .find((item) => item && item.family === "IPv4" && !item.internal)?.address;
        const host = lanAddress || "localhost";
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          host,
          port,
          url: `${protocol}://${host}:${port}`,
          httpsUrl: `https://${host}:${port}`,
        }));
      });

      server.middlewares.use("/ar-config/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            fs.mkdirSync(path.dirname(timelineConfigPath), { recursive: true });
            fs.writeFileSync(timelineConfigPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: error.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), arConfigWriterPlugin(), process.env.npm_lifecycle_event === "dev:https" && basicSsl()].filter(Boolean),
  server: {
    host: "0.0.0.0",
    allowedHosts: ["floppy-foxes-mix.loca.lt"],
    watch: {
      ignored: ["**/public/ar-config/ar-timeline-config.json"],
    },
    fs: {
      allow: [process.cwd(), "D:/ghichep_monhoc/Ky2_nam3/CDKHMT"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
