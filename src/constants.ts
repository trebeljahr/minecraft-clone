import { chunkSize } from "./createChunk";

export const surface = 5 * chunkSize;
export const terrainHeight = surface + 10;
export const blockLength = 100;

import * as THREE from "three";
export function copy(vec: THREE.Vector3) {
  return new THREE.Vector3().copy(vec);
}
