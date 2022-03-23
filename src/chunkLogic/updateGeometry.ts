import { BufferAttribute, Mesh, Scene } from "three";
import { chunkWorkerPool } from "../workers/workerPool";
import { BufferGeometry } from "three";
import { computeSmallChunkCornerFromId } from "../helpers";
import { opaque } from "../voxelMaterial";
import { Chunks } from "../constants";
import { generateGeometry } from "./generateGeometry";

export async function updateGeometry(
  chunks: Chunks,
  chunkIdToMesh: Record<string, Mesh>,
  scene: Scene,
  chunkId: string,
  defaultLight = false
) {
  const chunkOffset = computeSmallChunkCornerFromId(chunkId);

  if (!chunks[chunkId]) return;

  let mesh = chunkIdToMesh[chunkId];

  const geometry = mesh ? mesh.geometry : new BufferGeometry();

  await chunkWorkerPool.queue(async (worker) => {
    const { positions, normals, uvs, indices, lightValues } =
      await worker.generateGeometry(chunks, chunkId, defaultLight);

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
    mesh.name = chunkId;
    chunkIdToMesh[chunkId] = mesh;
    scene.add(mesh);
    mesh.position.set(chunkOffset[0], chunkOffset[1], chunkOffset[2]);
  }
}
