import { Clock, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Player } from "./Player";

interface Animatable {
  tick: (delta: number) => void;
}

const clock = new Clock();

class Loop {
  private camera: PerspectiveCamera;
  private scene: Scene;
  private renderer: WebGLRenderer;
  private updatables: Animatable[];
  private stats = Stats();
  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    renderer: WebGLRenderer
  ) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.updatables = [];
    document.body.appendChild(this.stats.dom);
  }

  public register<T extends Animatable>(object: T) {
    this.updatables.push(object);
  }
  public start() {
    this.renderer.setAnimationLoop(() => {
      this.tick();
      this.renderer.render(this.scene, this.camera);
    });
  }

  public stop() {
    this.renderer.setAnimationLoop(null);
  }

  public tick() {
    const delta = clock.getDelta();
    this.stats.update();

    for (const object of this.updatables) {
      object.tick(delta);
    }
  }
}

export { Loop };
