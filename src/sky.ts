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
  const start = 180;

  const increments = {
    rayleigh: 0.5,
    mieDirectionalG: 0.1,
    mieCoefficient: 0.1,
    turbidity: 2,
    exposure: 0.1,
  };

  const nightValues = {
    rayleigh: 0.15,
    mieDirectionalG: 0.05,
    mieCoefficient: 0,
    turbidity: 1,
    exposure: 0.1,
  };
  const dayValues = {
    rayleigh: 4,
    mieDirectionalG: 0.7,
    mieCoefficient: 0.05,
    turbidity: 10,
    exposure: 0.2,
  };

  const isDay = (rotation: number) => rotation >= 180 && rotation <= 360;

  const parameters = {
    ...(isDay(start) ? dayValues : nightValues),
    rotation: start,
    elevation: start,
    azimuth: 180,
    exposure: 0.2,
    sunVelocity: 20,
  };

  const pmremGenerator = new PMREMGenerator(renderer);

  function updateSun() {
    // if (isDay) {
    //   phi = MathUtils.degToRad(90 - parameters.elevation - 180);
    // }
    let phi = MathUtils.degToRad(90 + parameters.elevation);
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
  skyGui.add(parameters, "rayleigh", 0.0, 10, 0.001).onChange(updateSky);
  skyGui.add(parameters, "mieCoefficient", 0.0, 0.1, 0.001).onChange(updateSky);
  skyGui.add(parameters, "mieDirectionalG", 0.0, 1, 0.001).onChange(updateSky);
  skyGui.add(parameters, "rotation", 0, 360, 0.1).onChange(updateSky);
  skyGui.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSky);
  skyGui.add(parameters, "exposure", 0, 1, 0.0001).onChange(updateSky);
  skyGui.add(parameters, "sunVelocity", 0, 60, 0.1);

  skyGui.open();

  const nightfall = () =>
    parameters.rotation >= 180 && parameters.rotation < 180 + 90;

  const dayrise = () => parameters.rotation >= 0 && parameters.rotation < 90;

  function changeToValues({ values, compare, update }) {
    Object.keys(values).forEach((param) => {
      if (compare(param)) {
        update(param);
      }
    });
  }
  function tick() {
    const { sunVelocity: vel } = parameters;
    if (vel === 0) return;

    parameters.rotation += vel / 500;
    if (parameters.rotation >= 360) parameters.rotation = 0;

    if (dayrise()) {
      changeToValues({
        values: dayValues,
        compare: (param: string) => parameters[param] < dayValues[param],
        update: (param: string) => {
          parameters[param] += (increments[param] * vel) / 500;
          parameters[param] = Math.min(dayValues[param], parameters[param]);
        },
      });
    }
    if (nightfall()) {
      changeToValues({
        values: nightValues,
        compare: (param: string) => parameters[param] > nightValues[param],
        update: (param: string) => {
          parameters[param] -= (increments[param] * vel) / 500;
          parameters[param] = Math.max(nightValues[param], parameters[param]);
        },
      });
    }
    if (!isDay(parameters.rotation)) {
      parameters.elevation = parameters.rotation - 180;
    } else {
      parameters.elevation = parameters.rotation;
    }

    updateSky();
    gui.updateDisplay();
  }

  setInterval(tick, 500);
  return {
    tick,
  };
}
