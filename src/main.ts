import { Color, Fog } from "three";
import { Loop } from "./Loop";
import { player } from "./Player";
import { chunkSize, viewDistance } from "./constants";
import { setupControls } from "./controls";
import { SimpleTimer } from "./helpers";
import { onlyDisplaySingleBlock } from "./onlyDisplaySingleBlock";
import { onWindowResize } from "./rendering";
import { handleChunks, shouldChunksUpdate } from "./streamChunks";
import { world } from "./world";

init();

async function init() {
  const inSingleBlockMode = false;
  const loop = new Loop(world.renderer);

  if (inSingleBlockMode) onlyDisplaySingleBlock();
  else {
    const logTime = new SimpleTimer();
    handleChunks().then(() => {
      logTime.takenFor("Init");
      world.initialLoadDone = true;
      // const loadingElement = document.getElementById("worldLoaderState");
      // loadingElement.style.display = "none";
      const button = document.getElementById("playButton") as HTMLButtonElement;
      button.disabled = false;
    });
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
