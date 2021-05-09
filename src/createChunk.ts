import { Noise } from "./noise";

const noise = new Noise();

export const chunkSize = 16;
export const halfChunk = chunkSize / 2;

function shouldPlaceBlock(x: number, z: number, y: number) {
  const noiseVal = noise.perlin3(x / 10, z / 10, y / 10);
  return noiseVal >= 0;
}

export function generateChunk(xOff: number, yOff: number, zOff: number) {
  const chunk: ({ x: number; y: number; z: number } | false)[] = [];
  for (let z = 0; z < chunkSize; z++) {
    const realZ = z + zOff;
    for (let y = 0; y < chunkSize; y++) {
      const realY = y + yOff;
      for (let x = 0; x < chunkSize; x++) {
        const realX = x + xOff;
        if (shouldPlaceBlock(realX, realY, realZ)) {
          chunk.push({ x: realX, y: realY, z: realZ });
        } else {
          chunk.push(false);
        }
      }
    }
  }
  return chunk;
}
