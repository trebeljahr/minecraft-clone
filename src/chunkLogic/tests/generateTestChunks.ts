import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { blocks } from "../../blocks";
import { getChunkForVoxel } from "../../chunkLogic";
import {
  fields,
  type LightUpdate,
  type LightUpdates,
  neighborOffsets,
  type Position,
  transparentBlocks,
} from "../../constants";
import { computeVoxelIndex, makeEmptyChunk } from "../../helpers";
import { placeVoxelSafe } from "../../placeVoxel";
import { mergeChunkUpdates, sunlightChunks } from "../../streamChunks";
import { updateGeometry } from "../../updateGeometry";
import { world } from "../../world";
import { Queue } from "../sunlight";

const chunkIdForSpawning = "0,0,0";

export async function displayTestBed() {
  if (!world.globalChunks[chunkIdForSpawning]) {
    world.globalChunks[chunkIdForSpawning] = makeEmptyChunk(chunkIdForSpawning);
  }

  await generateFlatTestBed();
}

const neighbors = [...neighborOffsets].slice(1, neighborOffsets.length);

const addDebugLightBox = (pos: Position, brightness: number) => {
  const geometry = new BoxGeometry(1, 1, 1);

  const mapBrightnessToHexColor = (brightness: number) => {
    const hex = brightness.toString(16);
    return "#" + hex + hex + hex;
  };

  const hexValue = mapBrightnessToHexColor(brightness);

  const material = new MeshStandardMaterial({
    emissive: hexValue,
  });

  const mesh = new Mesh(geometry, material);
  mesh.position.set(...pos);
  world.scene.add(mesh);
};

export function createFloodlightQueueVisualizer(queue: LightUpdate[]) {
  const floodlightQueue = new Queue<LightUpdate>();
  queue.forEach((update) => {
    floodlightQueue.enqueue(update);
  });

  const chunksThatNeedUpdates: LightUpdates = {};

  const step = () => {
    if (floodlightQueue.isEmpty()) {
      console.log("Done floodlighting");
      world.stepFloodLightCalc = () => {};
      return;
    }

    const {
      pos: [x, y, z],
      lightValue,
    } = floodlightQueue.dequeue();

    console.log("step:", { x, y, z, lightValue });
    const newLightValue = lightValue - 1;
    if (newLightValue <= 0) return;

    addDebugLightBox([x, y, z], newLightValue);

    neighbors.forEach((offset) => {
      const nx = x + offset.x;
      const ny = y + offset.y;
      const nz = z + offset.z;

      const [neighborsChunk, chunkId] = getChunkForVoxel(world.globalChunks, [nx, ny, nz]);
      if (!neighborsChunk) {
        if (!chunksThatNeedUpdates[chunkId]) {
          chunksThatNeedUpdates[chunkId] = [];
        }
        chunksThatNeedUpdates[chunkId].push({
          lightValue: newLightValue,
          pos: [nx, ny, nz],
        });
        return;
      }

      const neighborIndex = computeVoxelIndex([nx, ny, nz]);
      const lightValueInNeighbor = neighborsChunk[neighborIndex + fields.light];
      const neighborType = neighborsChunk[neighborIndex];

      const lightIsBrighter = newLightValue > lightValueInNeighbor;
      const neighborIsTransparent = transparentBlocks.includes(neighborType);

      if (lightIsBrighter && neighborIsTransparent) {
        neighborsChunk[neighborIndex + fields.light] = newLightValue;
        floodlightQueue.enqueue({
          pos: [nx, ny, nz],
          lightValue: newLightValue,
        });
      }
    });
  };

  world.stepFloodLightCalc = step;
}

export function createBoxWalls() {}

export function createBoxFrame() {}

export function createSolidBox({
  size,
  leftCornerPos,
  blockType = blocks.stone,
}: {
  size: { x: number; y: number; z: number };
  leftCornerPos: Position;
  blockType?: number;
}) {
  for (let x = 0; x <= size.x; x++) {
    for (let y = 0; y <= size.y; y++) {
      for (let z = 0; z <= size.z; z++) {
        const pos = new Vector3(...leftCornerPos).add(new Vector3(x, y, z)).toArray() as Position;
        placeVoxelSafe(blockType, pos);
      }
    }
  }
}

export async function generateFlatTestBed() {
  createSolidBox({
    size: { x: 200, y: 1, z: 200 },
    leftCornerPos: [-100, 0, -100],
  });

  console.log(world.globalChunks);

  const { updatedChunks } = await sunlightChunks(world.globalChunks, [chunkIdForSpawning]);

  mergeChunkUpdates(world.globalChunks, updatedChunks);

  Object.keys(updatedChunks).forEach((id) => {
    updateGeometry(id);
  });
}
