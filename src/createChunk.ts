import { Noise } from "./noise";
import { World } from "./VoxelWorld";
import * as THREE from "three";
import { terrainHeight } from "./constants";

const noise = new Noise();

export const chunkSize = 16;
export const halfChunk = chunkSize / 2;
const tileSize = 16;
const tileTextureWidth = 16;
const tileTextureHeight = 16;

export function shouldPlaceBlock(x: number, z: number, y: number) {
  const noiseVal = noise.perlin3(x / 10, z / 10, y / 10);
  return noiseVal >= 0 && z < terrainHeight;
}

export function generateChunk(xOff: number, yOff: number, zOff: number) {
  const chunk = new World({
    chunkSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
  });

  for (let z = 0; z < chunkSize; z++) {
    const realZ = z + zOff;
    for (let y = 0; y < chunkSize; y++) {
      const realY = y + yOff;
      for (let x = 0; x < chunkSize; x++) {
        const realX = x + xOff;
        if (shouldPlaceBlock(realX, realY, realZ) && realZ < 30) {
          chunk.setVoxel(x, y, z, 1);
        }
      }
    }
  }

  const {
    positions,
    normals,
    uvs,
    indices,
  } = chunk.generateGeometryDataForChunk(0, 0, 0);

  const geometry = new THREE.BufferGeometry();

  const texture = new THREE.TextureLoader().load(
    require("../assets/stone.png")
  );

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    side: THREE.DoubleSide,
    alphaTest: 0.1,
    transparent: true,
  });

  const positionNumComponents = 3;
  const uvNumComponents = 2;
  const normalNumComponents = 3;
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(positions),
      positionNumComponents
    )
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents)
  );
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.translateX(xOff);
  mesh.translateY(zOff);
  mesh.translateZ(yOff);
  const wireframe = new THREE.WireframeGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4080ff });
  const line = new THREE.LineSegments(wireframe, lineMaterial);
  line.computeLineDistances();
  line.visible = true;

  return { mesh, line, chunk };
}
