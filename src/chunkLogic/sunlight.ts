import { getChunkForVoxel } from "../chunkLogic";
import {
  type Chunks,
  chunkSize,
  type LightUpdate,
  type Position,
  transparentBlocks,
  verticalNumberOfChunks,
} from "../constants";
import { computeSmallChunkCornerFromId, computeVoxelIndex, setLightValue } from "../helpers";

class Node<T> {
  constructor(
    public value: T,
    public next: Node<T> | null = null,
  ) {}
}

export class Queue<T = unknown> {
  private first: Node<T> | null = null;
  private last: Node<T> | null = null;

  enqueue(value: T) {
    const newNode = new Node(value);
    if (this.last) {
      this.last.next = newNode;
    }
    this.last = newNode;
    if (!this.first) {
      this.first = newNode;
    }
  }

  dequeue(): T | null {
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

  let _iterations = 0;
  while (!sunlightQueue.isEmpty()) {
    _iterations++;
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

export async function createSunlightQueue(chunks: Chunks, chunksThatNeedToBeUpdated: string[]) {
  const queue = chunksThatNeedToBeUpdated.flatMap((id) => {
    const [cx, , cz] = computeSmallChunkCornerFromId(id);
    const queue = [] as LightUpdate[];
    for (let xOff = 0; xOff < chunkSize; xOff++) {
      for (let zOff = 0; zOff < chunkSize; zOff++) {
        const pos = [xOff + cx, verticalNumberOfChunks * chunkSize, zOff + cz] as Position;
        queue.push({ pos, lightValue: 15 });
      }
    }
    return queue;
  });
  // queue is correct length!

  const sunlightQueue = propagateSunlight(chunks, queue);
  return {
    sunlightQueue,
    chunks,
  };
}
