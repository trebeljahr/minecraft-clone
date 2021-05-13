import {
  MathUtils,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { Sky } from "three/examples/jsm/objects/Sky";

import * as dat from "dat.gui";

export function initSky(
  camera: PerspectiveCamera,
  scene: Scene,
  renderer: WebGLRenderer
) {
  const sun = new Vector3();

  const sky = new Sky();

  sky.scale.setScalar(10000);

  scene.add(sky);

  const parameters = {
    cycle: 0,
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: 0.2,
    sunVelocity: 10,
  };

  const pmremGenerator = new PMREMGenerator(renderer);

  function updateSun() {
    const phi = MathUtils.degToRad(90 - parameters.elevation);
    const theta = MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);

    const uniforms = sky.material.uniforms;
    uniforms["sunPosition"].value.copy(sun);
    uniforms["turbidity"].value = parameters.turbidity;
    uniforms["rayleigh"].value = parameters.rayleigh;
    uniforms["mieCoefficient"].value = parameters.mieCoefficient;
    uniforms["mieDirectionalG"].value = parameters.mieDirectionalG;
  }

  function updateSky() {
    updateSun();

    renderer.toneMappingExposure = parameters.exposure;
    scene.environment = pmremGenerator.fromScene(scene).texture;
  }

  updateSky();

  const gui = new dat.GUI();

  const skyGui = gui.addFolder("Sky");
  skyGui.add(parameters, "turbidity", 0.0, 20.0, 0.1).onChange(updateSky);
  skyGui.add(parameters, "rayleigh", 0.0, 4, 0.001).onChange(updateSky);
  skyGui.add(parameters, "mieCoefficient", 0.0, 0.1, 0.001).onChange(updateSky);
  skyGui.add(parameters, "mieDirectionalG", 0.0, 1, 0.001).onChange(updateSky);
  skyGui.add(parameters, "elevation", -90, 90, 0.1).onChange(updateSky);
  skyGui.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSky);
  skyGui.add(parameters, "exposure", 0, 1, 0.0001).onChange(updateSky);
  skyGui.add(parameters, "sunVelocity", 0, 20, 0.1);

  skyGui.open();
  return {
    tick: (delta: number) => {
      if (renderer.info.render.frame % 10 === 0) {
        console.log(parameters.exposure);
      }

      const isNight = Math.abs(parameters.cycle / 180) >s= 1;
      if (isNight) {
        parameters.elevation = parameters.cycle - 180;
        if (parameters.rayleigh > 0.15) {
          parameters.rayleigh -= 0.2 * delta;
        }
        if (parameters.mieCoefficient > 0.003) {
          parameters.rayleigh -= 0.2 * delta;
        }
        if (parameters.mieDirectionalG < 0.865) {
          parameters.mieDirectionalG += 0.2 * delta;
        }
      } else {
        parameters.elevation = parameters.cycle;
    
      }

      parameters.cycle += delta * parameters.sunVelocity;
      updateSky();
    },
  };
}
