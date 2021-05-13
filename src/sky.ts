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
  const moon = new Vector3();

  const sky = new Sky();

  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  const parameters = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
    sunVelocity: 10,
  };

  const pmremGenerator = new PMREMGenerator(renderer);

  function updateSun() {
    const phi = MathUtils.degToRad(90 - parameters.elevation);
    const theta = MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);

    // const phiMoon = MathUtils.degToRad(180 - parameters.elevation);
    // moon.setFromSphericalCoords(1, phiMoon, theta);

    const uniforms = sky.material.uniforms;
    uniforms["sunPosition"].value.copy(sun);
    uniforms["turbidity"].value = parameters.turbidity;
    uniforms["rayleigh"].value = parameters.rayleigh;
    uniforms["mieCoefficient"].value = parameters.mieCoefficient;
    uniforms["mieDirectionalG"].value = parameters.mieDirectionalG;

    renderer.toneMappingExposure = parameters.exposure;

    scene.environment = pmremGenerator.fromScene(scene).texture;
  }

  updateSun();

  const gui = new dat.GUI();

  const skyGui = gui.addFolder("Sky");
  skyGui.add(parameters, "turbidity", 0.0, 20.0, 0.1).onChange(updateSun);
  skyGui.add(parameters, "rayleigh", 0.0, 4, 0.001).onChange(updateSun);
  skyGui.add(parameters, "mieCoefficient", 0.0, 0.1, 0.001).onChange(updateSun);
  skyGui.add(parameters, "mieDirectionalG", 0.0, 1, 0.001).onChange(updateSun);
  skyGui.add(parameters, "elevation", 0, 360, 0.1).onChange(updateSun);
  skyGui.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSun);
  skyGui.add(parameters, "exposure", 0, 1, 0.0001).onChange(updateSun);
  skyGui.add(parameters, "sunVelocity", 0, 20, 0.1);

  skyGui.open();

  return {
    tick: (delta: number) => {
      if (renderer.info.render.frame % 10 === 0) {
        console.log(
          Math.floor(Math.abs(parameters.elevation / 180)) === 1
            ? "Night"
            : "Day"
        );
        const phi = MathUtils.degToRad(90 - parameters.elevation);
        console.log(phi);
      }
      parameters.elevation += delta * parameters.sunVelocity;
      updateSun();
    },
  };
}
