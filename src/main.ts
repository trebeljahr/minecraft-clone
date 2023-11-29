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
import { generate } from "./generateChunks";

init();

async function onlyDisplaySingleChunk() {
  const chunkId = "0,0,0";
  await generate(world.globalChunks, [chunkId]);

  const button = document.getElementById("playButton") as HTMLButtonElement;
  button.disabled = false;
}

async function onlyDisplayFewChunks() {
  const chunkIds = [
    "0,0,0",
    "0,0,1",
    "0,0,2",
    "1,0,0",
    "2,0,0",
    "2,0,1",
    "2,0,2",
    "1,0,2",
    "1,0,1",
  ];
  await generate(world.globalChunks, chunkIds);

  const button = document.getElementById("playButton") as HTMLButtonElement;
  button.disabled = false;
}

async function init() {
  const inSingleBlockMode = false;
  const inSingleChunkMode = false;
  const inMultipleChunksMode = false;

  const loop = new Loop(world.renderer);

  if (inSingleBlockMode) onlyDisplaySingleBlock();
  if (inSingleChunkMode) onlyDisplaySingleChunk();
  if (inMultipleChunksMode) onlyDisplayFewChunks();
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
    // loop.register({ tick: shouldChunksUpdate });
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
