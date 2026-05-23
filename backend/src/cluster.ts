import cluster from "node:cluster";
import os from "node:os";

const WORKERS = Number(process.env.WEB_CONCURRENCY) || Math.min(os.cpus().length, 4);

if (cluster.isPrimary) {
  console.log(`[cluster] Primary ${process.pid} — spawning ${WORKERS} workers`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork({ NODE_CLUSTER_WORKER: "1" });
  }

  cluster.on("exit", (worker, code) => {
    console.warn(`[cluster] Worker ${worker.process.pid} exited (${code}) — restarting`);
    cluster.fork({ NODE_CLUSTER_WORKER: "1" });
  });
} else {
  process.env.NODE_CLUSTER = "1";
  await import("./index.js");
}
