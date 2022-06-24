import { spawn, Pool } from "threads";
import { ChunkWorkerObject } from "./chunkWorkerObject";

export const chunkWorkerPool = Pool(
  () =>
    spawn<typeof ChunkWorkerObject>(
      new Worker(new URL("./chunkWorker.ts", import.meta.url), {
        name: "chunkWorker",
        type: "module",
        /* webpackEntryOptions: { filename: "workers/[name].js" } */
      })
    ),
  8
);
