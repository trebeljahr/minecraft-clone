import { expose } from "threads/worker";
import { World } from "../VoxelWorld";

expose({
  floodLight(chunks: Record<string, Uint8Array>, queue: Position[]) {
    return chunks;
  },
});
