import {
  NearestFilter,
  ShaderLib,
  ShaderMaterial,
  TextureLoader,
  UniformsUtils,
} from "three";

import textureAtlas from "./assets/First-Texture-Atlas.png";
const texture = new TextureLoader().load(textureAtlas);

texture.magFilter = NearestFilter;
texture.minFilter = NearestFilter;

const opaque = new ShaderMaterial({
  name: "voxels-material",
  vertexColors: true,
  fog: true,
  fragmentShader: ShaderLib.basic.fragmentShader
    .replace(
      "#include <common>",
      [
        "varying float vlight;",
        "varying float vsunlight;",
        "uniform float sunlightIntensity;",
        "#include <common>",
      ].join("\n")
    )
    .replace(
      "#include <envmap_fragment>",
      [
        "#include <envmap_fragment>",
        "outgoingLight *= (vlight + max(vsunlight * sunlightIntensity, 0.05)) * 0.5;",
      ].join("\n")
    ),
  vertexShader: ShaderLib.basic.vertexShader
    .replace(
      "#include <common>",
      [
        "attribute float light;",
        "varying float vlight;",
        "varying float vsunlight;",
        "#include <common>",
      ].join("\n")
    )
    .replace(
      "#include <color_vertex>",
      [
        "#ifdef USE_COLOR",
        "  vColor.xyz = color.xyz / 255.0;",
        "#endif",
        "vlight = float((int(light) >> 4) & 15) / 15.0;",
        "vsunlight = float(int(light) & 15) / 15.0;",
      ].join("\n")
    ),
  uniforms: {
    ...UniformsUtils.clone(ShaderLib.basic.uniforms),
    sunlightIntensity: { value: 1 },
  },
}) as any;

opaque.map = texture;
opaque.uniforms.map.value = texture;

export { opaque };
