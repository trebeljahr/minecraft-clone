import { generateChunkData, setVoxel } from "../src/chunkLogic";
import { addChunkAtChunkId, parseChunkId } from "../src/helpers";
import { chunkSize } from "../src/constants";
import { blocks } from "../src/blocks";

const { stone } = blocks;
describe("test voxel logic", () => {
  it("should set voxel on edges of chunk correctly", () => {
    let chunks = addChunkAtChunkId({}, "0,0,0");
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          chunks = setVoxel(chunks, [x, y, z], stone);
        }
      }
    }
  });

  it("worker should set chunk geometry correctly", () => {
    const chunkId = "0,0,0";
    let chunks = addChunkAtChunkId({}, chunkId);
    generateChunkData(chunks, parseChunkId(chunkId).toArray());
  });

  it("should work with multiple ids", () => {
    let ids = [];
    for (let x = -3; x < 3; x++) {
      for (let y = -3; y < 3; y++) {
        for (let z = -3; z < 3; z++) {
          const chunkId = `${x},${y},${z}`;
          ids.push(chunkId);
          let chunks = addChunkAtChunkId({}, chunkId);
          chunks = generateChunkData(chunks, parseChunkId(chunkId).toArray());
        }
      }
    }
    console.log(ids);
  });
});
