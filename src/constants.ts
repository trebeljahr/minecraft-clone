import { chunkSize } from "./createChunk";

export const surface = 5 * chunkSize;
export const terrainHeight = surface;
export const blockLength = 100;

import * as THREE from "three";
import { Vector3 } from "three";

export function copy(vec: THREE.Vector3) {
  return new THREE.Vector3().copy(vec);
}

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

export const transparentBlocks = [cactus, foliage];
