import { world } from "./world";

export function onWindowResize() {
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(window.innerWidth, window.innerHeight);
}

export function render() {
  world.renderRequested = false;
  world.renderer.render(world.scene, world.camera);
}

export function requestRenderIfNotRequested() {
  if (!world.renderRequested) {
    world.renderRequested = true;
    requestAnimationFrame(render);
  }
}
