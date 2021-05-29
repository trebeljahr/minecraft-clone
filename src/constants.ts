export const chunkSize = 16;
export const halfChunk = chunkSize / 2;
export const surface = 5 * chunkSize;
export const terrainHeight = surface;
export const blockLength = 100;

import * as THREE from "three";
import { Vector3 } from "three";

export type Position = [number, number, number];
export function copy(vec: THREE.Vector3) {
  return new THREE.Vector3().copy(vec);
}
export const maxHeight = 128;

export const stone = 12;
export const grass = 1;
export const dirt = 14;
export const gold = 6;
export const coal = 7;
export const lapis = 9;
export const diamonds = 15;
export const emerald = 17;
export const iron = 19;
export const birchwood = 20;
export const oakwood = 3;
export const foliage = 2;
export const cactus = 18;
export const air = 0;
export const tileSize = 16;
export const tileTextureWidth = 320;
export const tileTextureHeight = 48;

export const neighborOffsets = [
  new Vector3(0, 0, 0), // self
  new Vector3(-1, 0, 0), // left
  new Vector3(1, 0, 0), // right
  new Vector3(0, -1, 0), // down
  new Vector3(0, 1, 0), // up
  new Vector3(0, 0, -1), // back
  new Vector3(0, 0, 1), // front
];

let surroundingOffsets = [] as Position[];

for (let z = -1; z <= 1; z++) {
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      surroundingOffsets.push([x, y, z]);
    }
  }
}

export { surroundingOffsets };

const sum = (a: number, b: number) => a + b;
export const surroundingOffsetsWithoutSelf = surroundingOffsets.filter(
  (coords) => {
    return coords.map(Math.abs).reduce(sum, 0) > 0;
  }
);

export const glowingBlocks = [cactus];
export const transparentBlocks = [air, cactus, foliage];

// function getCurrentChunk(providedPos?: Vector3) {
//   const pos = providedPos || player.position;
//   return copy(pos).divideScalar(chunkSize).floor();
// }
// function generateChunksInMovementDirection() {
//   const currentChunk = getCurrentChunk();
//   if (lastChunk === currentChunk) return;
//   lastChunk = currentChunk;
//   const dir = currentChunk.sub(lastChunk);

//   var axis = new Vector3(0, 1, 0);
//   var angle = Math.PI / 2;

//   const rotatedOffset = copy(dir)
//     .applyAxisAngle(axis, angle)
//     .multiplyScalar(chunkSize);

//   const offset = dir
//     .multiplyScalar(chunkSize)
//     .add(new Vector3(0, -chunkSize, 0));
//   const newPos = player.position.add(offset);
//   generateChunkAtPosition(newPos);
//   generateChunkAtPosition(copy(newPos).add(rotatedOffset));
//   generateChunkAtPosition(copy(newPos).sub(rotatedOffset));
// }
