import "./main.css";
import { SimpleTimer } from "./helpers";
import { chunkSize, viewDistance } from "./constants";
import { Loop } from "./Loop";

import { Color, Fog } from "three";
import { handleChunks, shouldChunksUpdate } from "./streamChunks";

import { world } from "./world";
import { setupControls } from "./controls";
import { onWindowResize } from "./rendering";
import { player } from "./Player";

init();

async function init() {
  const loop = new Loop(world.renderer);

  const logTime = new SimpleTimer();
  handleChunks().then(() => logTime.takenFor("Init"));
  loop.register(player);
  loop.register({ tick: shouldChunksUpdate });
  loop.start();
  setupControls();
  const color = "lightblue";
  world.scene.fog = new Fog(
    color,
    viewDistance * chunkSize - 2 * chunkSize,
    viewDistance * chunkSize
  );
  world.scene.background = new Color(color);

  window.addEventListener("resize", onWindowResize);
}

// function spawnSingleBlock() {
//   const [x, y, z] = world.player.pos.toArray();
//   const initialBlockPos = [x, y - 2, z - 3] as Position;
//   const hardcodedCameraPosition = {
//     x: 2.2839938822872243,
//     y: 85,
//     z: -0.8391258104030554,
//   };
//   world.camera.position.y = hardcodedCameraPosition.y;
//   world.camera.position.x = hardcodedCameraPosition.x;
//   world.camera.position.z = hardcodedCameraPosition.z;
//   const camDirection = new Vector3(...initialBlockPos);
//   camDirection.y -= 0.5;
//   world.camera.lookAt(camDirection);
//   setVoxel(initialBlockPos, blocks.coal);
// }
