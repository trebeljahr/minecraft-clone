import { Clock, PerspectiveCamera, Scene, WebGLRenderer } from "three";

interface Animatable {
  tick: (delta: number) => void;
}

const clock = new Clock();

class Loop {
  private camera: PerspectiveCamera;
  private scene: Scene;
  private renderer: WebGLRenderer;
  private updatables: Animatable[];
  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    renderer: WebGLRenderer
  ) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.updatables = [];
  }

  public register(object: Animatable) {
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
    for (const object of this.updatables) {
      object.tick(delta);
    }
  }
}

export { Loop };
