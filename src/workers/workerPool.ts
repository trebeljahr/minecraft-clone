import { spawn, Pool } from "threads";

export const chunkWorkerPool = Pool(
  () =>
    spawn(
      new Worker(new URL("./chunkWorker.ts", import.meta.url), {
        name: "chunkWorker",
        type: "module",
        /* webpackEntryOptions: { filename: "workers/[name].js" } */
      })
    ),
  8
);
