import { player } from "./Player";
import { blocks } from "./blocks";
import { setVoxelFromPos } from "./chunkLogic";
import { chunkSize, fields } from "./constants";
import { computeChunkId } from "./helpers";
import { world } from "./world";

export function onlyDisplaySingleBlock() {
  console.log(computeChunkId(player.pos.toArray()));
  console.log(computeChunkId(world.camera.position.toArray()));

  const chunkId = "0,3,0";

  world.globalChunks[chunkId] = {
    chunkId,
    isGenerated: true,
    isSunlit: true,
    isFloodlit: true,
    isGeometrized: true,
    data: new Uint8Array(chunkSize * chunkSize * chunkSize * fields.count),
  };

  const [x, y, z] = player.pos.toArray();
  for (let i = 0; i < 10; i++) {
    setVoxelFromPos(world.globalChunks, [x, y + i, z], blocks.foliage);
  }

  // world.renderer.render(world.scene, world.camera);
}
