import { defineConfig, loadEnv } from "vite";
import { createVehicleApi } from "./server/vehicles.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const vehicleApi = createVehicleApi({ token: env.VEHICLE_API_TOKEN });
  return {
    optimizeDeps: { entries: ["index.html"] },
    plugins: [{
      name: "vehicle-api",
      configureServer(server) { server.middlewares.use("/api/vehicles", vehicleApi); },
      configurePreviewServer(server) { server.middlewares.use("/api/vehicles", vehicleApi); },
    }],
    server: { host: "127.0.0.1", port: 5173, strictPort: true,
      proxy: { "/api/demo": "http://127.0.0.1:3001" } },
  };
});
