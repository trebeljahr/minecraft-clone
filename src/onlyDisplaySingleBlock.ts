import { Vector3 } from "three";
import { Position, chunkSize, fields } from "./constants";
import { world } from "./world";
import { setVoxel } from "./chunkLogic";
import { blocks } from "./blocks";
import { player } from "./Player";
import { computeChunkId } from "./helpers";

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
    setVoxel(world.globalChunks, [x, y + i, z], blocks.foliage);
  }

  // world.renderer.render(world.scene, world.camera);
}
