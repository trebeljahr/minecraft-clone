import { chunkSize, viewDistance } from "./constants";
import { SimpleTimer } from "./helpers";
import { Loop } from "./Loop";
import { Color, Fog } from "three";
import { setupControls } from "./controls";
import { player } from "./Player";
import { onWindowResize } from "./rendering";
import { handleChunks, shouldChunksUpdate } from "./streamChunks";
import { world } from "./world";
import { onlyDisplaySingleBlock } from "./onlyDisplaySingleBlock";

init();

async function init() {
  const inSingleBlockMode = false;
  const loop = new Loop(world.renderer);

  if (inSingleBlockMode) onlyDisplaySingleBlock();
  else {
    const logTime = new SimpleTimer();
    handleChunks().then(() => logTime.takenFor("Init"));
    loop.register({ tick: shouldChunksUpdate });
  }

  loop.register(player);

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
