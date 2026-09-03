import "dotenv/config";
import { createServer } from "node:http";
import { createApp, getAllowedOrigins } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { closeRealtime, initializeRealtime } from "./lib/realtime.js";

const port = Number(process.env.PORT) || 3001;
const app = createApp();
const httpServer = createServer(app);

initializeRealtime(httpServer, getAllowedOrigins());

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`AssistDoc API running on http://0.0.0.0:${port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Closing AssistDoc API...`);
  await closeRealtime();
  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  });
}
