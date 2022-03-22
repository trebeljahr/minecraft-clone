import { generateChunkData, setVoxel } from "../src/chunkLogic";
import {
  addChunkAtChunkId,
  getBigChunkCorner as getBigChunkCorner,
  computeChunkId,
  getSmallChunkCorner as getSmallChunkCorner,
  computeSmallChunkCornerFromId,
  parseChunkId,
  generateSurroundingChunks,
} from "../src/helpers";
import { chunkSize, verticalNumberOfChunks } from "../src/constants";
import { blocks } from "../src/blocks";
import { Vector3 } from "three";

const { stone } = blocks;
describe("test voxel logic", () => {
  // it("should set voxel on edges of chunk correctly", () => {
  //   let chunks = addChunkAtChunkId({}, "0,0,0");
  //   for (let x = 0; x < chunkSize; x++) {
  //     for (let y = 0; y < chunkSize; y++) {
  //       for (let z = 0; z < chunkSize; z++) {
  //         chunks = setVoxel(chunks, [x, y, z], stone);
  //       }
  //     }
  //   }
  // });

  // it("worker should set chunk geometry correctly", () => {
  //   const chunkId = "0,0,0";
  //   let chunks = addChunkAtChunkId({}, chunkId);
  //   generateChunkData(chunks, parseChunkId(chunkId).toArray());
  // });

  // it("should work with multiple ids", () => {
  //   let ids = [];
  //   let chunks = {};
  //   const iterator = 2;
  //   for (let x = -iterator; x < iterator; x++) {
  //     for (let y = -iterator; y < iterator; y++) {
  //       for (let z = -iterator; z < iterator; z++) {
  //         const chunkId = `${x},${y},${z}`;
  //         ids.push(chunkId);
  //         chunks = addChunkAtChunkId(chunks, chunkId);
  //         chunks = generateChunkData(chunks, parseChunkId(chunkId).toArray());
  //       }
  //     }
  //   }
  //   expect(Object.keys(chunks).length).toBe(ids.length);
  // });

  it("should parse chunkIds correctly from position", () => {
    // computeChunkId should follow this logic:
    // 0 in id -> chunkPositions from [0 -> 16)
    // 1 in id -> chunkPositions from [16 -> 32)
    // generally of the form n in id -> [n * 16 -> n + 16 * 16)
    // where 16 is chunkSize
    expect(computeChunkId([15, 15, 15])).toBe("0,0,0");
    expect(computeChunkId([0, 0, 0])).toBe("0,0,0");
    expect(computeChunkId([16, 16, 16])).toBe("1,1,1");
    expect(computeChunkId([-1, -1, -1])).toBe("-1,-1,-1");
    expect(computeChunkId([16, 0, -16])).toBe("1,0,-1");
    expect(computeChunkId([-16, 0, -16.01])).toBe("-1,0,-2");
    expect(computeChunkId([16, 0, 31.99])).toBe("1,0,1");
  });

  it("should compute bottom left front (small) corner correctly", () => {
    expect(getSmallChunkCorner([15, 15, 15])).toStrictEqual([0, 0, 0]);
    expect(getSmallChunkCorner([16, 16, 16])).toStrictEqual([16, 16, 16]);
    expect(getSmallChunkCorner([1, 1, 1])).toStrictEqual([0, 0, 0]);
    expect(getSmallChunkCorner([17, 17, 17])).toStrictEqual([16, 16, 16]);
    expect(getSmallChunkCorner([-1, -1, -1])).toStrictEqual([-16, -16, -16]);
  });

  it("should compute top right back (big) corner correctly", () => {
    expect(getBigChunkCorner([15, 15, 15])).toStrictEqual([15, 15, 15]);
    expect(getBigChunkCorner([16, 16, 16])).toStrictEqual([31, 31, 31]);
    expect(getBigChunkCorner([1, 1, 1])).toStrictEqual([15, 15, 15]);
    expect(getBigChunkCorner([17, 17, 17])).toStrictEqual([31, 31, 31]);
    expect(getBigChunkCorner([-1, -1, -1])).toStrictEqual([-1, -1, -1]);
  });

  // it("should populate chunks for moving 'player'", () => {
  //   let chunks = {};
  //   function generateChunksAroundPlayer(pos: Vector3) {
  //     const iter = 0;
  //     for (let z = -iter; z <= iter; z++) {
  //       for (let x = -iter; x <= iter; x++) {
  //         const chunkColumnPos = new Vector3(
  //           pos.x + x * chunkSize,
  //           0,
  //           pos.z + z * chunkSize
  //         );

  //         const chunkId = computeChunkId(chunkColumnPos.toArray());
  //         for (let yOff = verticalNumberOfChunks; yOff >= 0; yOff--) {
  //           const [x, y, z] = chunkCoordinatesFromId(chunkId);
  //           const newId = `${x},${y + yOff},${z}`;
  //           chunks = addChunkAtChunkId(chunks, newId);
  //           const bottomLeftCornerOfChunk =
  //             computeSmallChunkCornerFromId(newId);

  //           chunks = generateChunkData(
  //             chunks,
  //             new Vector3(...bottomLeftCornerOfChunk).toArray()
  //           );
  //         }
  //       }
  //     }
  //   }

  //   const steps = 10;
  //   for (let x = 0; x < chunkSize * steps; x += chunkSize) {
  //     for (let z = 0; z < chunkSize * steps; z += chunkSize) {
  //       generateChunksAroundPlayer(new Vector3(x, 0, z));
  //     }
  //   }
  //   expect(Object.keys(chunks).length).toBe(
  //     steps * steps * (verticalNumberOfChunks + 1)
  //   );
  // });

  it("should generate surrounding chunks correctly", () => {
    const chunks = generateSurroundingChunks({}, "0,0,0");
    console.log(Object.keys(chunks));
    expect(Object.keys(chunks).length).toBe(27);
  });

  // it("should populate chunks for moving 'player' asynchronously", () => {
  //   let chunks = {};
  //   async function generateChunksAroundPlayer(pos: Vector3) {
  //     const iter = 0;
  //     for (let z = -iter; z <= iter; z++) {
  //       for (let x = -iter; x <= iter; x++) {
  //         const chunkColumnPos = new Vector3(
  //           pos.x + x * chunkSize,
  //           0,
  //           pos.z + z * chunkSize
  //         );

  //         const chunkId = computeChunkId(chunkColumnPos.toArray());
  //         for (let yOff = verticalNumberOfChunks; yOff >= 0; yOff--) {
  //           const [x, y, z] = chunkCoordinatesFromId(chunkId);
  //           const newId = `${x},${y + yOff},${z}`;
  //           chunks = addChunkAtChunkId(chunks, newId);
  //           const bottomLeftCornerOfChunk =
  //             computeSmallChunkCornerFromId(newId);

  //           chunks = generateChunkData(
  //             chunks,
  //             new Vector3(...bottomLeftCornerOfChunk).toArray()
  //           );
  //         }
  //       }
  //     }
  //   }

  //   const steps = 10;
  //   const promises = [];
  //   for (let x = 0; x < chunkSize * steps; x += chunkSize) {
  //     for (let z = 0; z < chunkSize * steps; z += chunkSize) {
  //       promises.push(generateChunksAroundPlayer(new Vector3(x, 0, z)));
  //     }
  //   }

  //   Promise.all(promises).then(() => {
  //     expect(Object.keys(chunks).length).toBe(
  //       steps * steps * (verticalNumberOfChunks + 1)
  //     );
  //   });
  // });
});
