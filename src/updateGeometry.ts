import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
} from "three";
import { Chunk, chunkSize } from "./constants";
import { computeSmallChunkCornerFromId } from "./helpers";
import { pickSurroundingChunks } from "./streamChunks";
import { opaque } from "./voxelMaterial";
import { chunkWorkerPool } from "./workers/workerPool";
import { world } from "./world";

export async function updateGeometry(chunkId: string, defaultLight = false) {
  const pos = computeSmallChunkCornerFromId(chunkId);

  let mesh = world.meshes[chunkId];

  const geometry = mesh ? mesh.geometry : new BufferGeometry();

  await chunkWorkerPool.queue(async (worker) => {
    const { positions, normals, uvs, indices, lightValues } =
      await worker.generateGeometry(
        pickSurroundingChunks(chunkId),
        chunkId,
        defaultLight
      );

    const positionNumComponents = 3;
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), positionNumComponents)
    );
    const normalNumComponents = 3;
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(normals), normalNumComponents)
    );
    const uvNumComponents = 2;
    geometry.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array(uvs), uvNumComponents)
    );
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    geometry.setAttribute(
      "light",
      new BufferAttribute(new Float32Array(lightValues), 1)
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(
        new Float32Array(
          positions.map(() => {
            return 255;
          })
        ),
        3
      )
    );
  });

  if (!mesh) {
    mesh = new Mesh(geometry, opaque);
    mesh.name = "chunk:" + chunkId;
    world.meshes[chunkId] = mesh;
    world.scene.add(mesh);
    mesh.position.set(...pos);

    const chunkOutline = new LineSegments(
      new EdgesGeometry(new BoxGeometry(chunkSize, chunkSize, chunkSize)),
      new LineBasicMaterial({ color: 0x00ff00 })
    );
    chunkOutline.name = "debug:" + chunkId;
    world.debugMeshes[chunkId] = chunkOutline;
    world.scene.add(chunkOutline),
      chunkOutline.position.set(
        pos[0] + chunkSize / 2,
        pos[1] + chunkSize / 2,
        pos[2] + chunkSize / 2
      );
  }
}
