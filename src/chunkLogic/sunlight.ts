import {
  Position,
  chunkSize,
  transparentBlocks,
  Chunks,
  verticalNumberOfChunks,
  LightUpdate,
} from "../constants";
import {
  setLightValue,
  getSmallChunkCorner,
  computeVoxelIndex,
  parseChunkId,
  computeSmallChunkCornerFromId,
  SimpleTimer,
} from "../helpers";
import { getChunkForVoxel } from "../chunkLogic";

class Node {
  constructor(public value: any, public next: Node | null = null) {}
}

export class Queue {
  private first: Node | null = null;
  private last: Node | null = null;

  enqueue(value: any) {
    const newNode = new Node(value);
    if (this.last) {
      this.last.next = newNode;
    }
    this.last = newNode;
    if (!this.first) {
      this.first = newNode;
    }
  }

  dequeue<T>() {
    if (!this.first) return null;
    const dequeuedNode = this.first;
    this.first = dequeuedNode.next;
    if (!this.first) {
      this.last = null;
    }
    return dequeuedNode.value;
  }

  isEmpty() {
    return this.first === null;
  }
}

export function propagateSunlight(chunks: Chunks, queue: LightUpdate[]) {
  const sunlightQueue = new Queue();

  const outgoingQueue: LightUpdate[] = [];
  queue.forEach((update) => sunlightQueue.enqueue(update));

  let iterations = 0;
  while (!sunlightQueue.isEmpty()) {
    iterations++;
    const {
      pos: [x, y, z],
      lightValue,
    } = sunlightQueue.dequeue<LightUpdate>();
    const yBelow = y - 1;
    const blockBelowIndex = computeVoxelIndex([x, yBelow, z]);
    const [chunkBelow] = getChunkForVoxel(chunks, [x, yBelow, z]);
    if (!chunkBelow || yBelow < 0) {
      continue;
    }

    const blockBelow = chunkBelow[blockBelowIndex];
    const belowIsTransparent = transparentBlocks.includes(blockBelow);
    const canPropagateSunlight = yBelow >= 0 && belowIsTransparent;
    if (canPropagateSunlight) {
      sunlightQueue.enqueue({ pos: [x, yBelow, z], lightValue });
      setLightValue(chunks, [x, yBelow, z], lightValue);
    }
    outgoingQueue.push({ pos: [x, y, z], lightValue });
  }
  return outgoingQueue;
}

export async function createSunlightQueue(
  chunks: Chunks,
  chunksThatNeedToBeUpdated: string[]
) {
  const queue = chunksThatNeedToBeUpdated
    .map((id) => {
      const [cx, , cz] = computeSmallChunkCornerFromId(id);
      const queue = [] as LightUpdate[];
      for (let xOff = 0; xOff < chunkSize; xOff++) {
        for (let zOff = 0; zOff < chunkSize; zOff++) {
          const pos = [
            xOff + cx,
            verticalNumberOfChunks * chunkSize,
            zOff + cz,
          ] as Position;
          queue.push({ pos, lightValue: 15 });
        }
      }
      return queue;
    })
    .flat();
  // queue is correct length!

  const sunlightQueue = propagateSunlight(chunks, queue);
  return {
    sunlightQueue,
    chunks,
  };
}
