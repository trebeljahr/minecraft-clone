import {
  LinearFilter,
  Mesh,
  MeshDepthMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RGBFormat,
  Scene,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import {
  GodRaysFakeSunShader,
  GodRaysDepthMaskShader,
  GodRaysCombineShader,
  GodRaysGenerateShader,
} from "three/examples/jsm/shaders/GodRaysShader.js";

function getStepSize(filterLen, tapsPerPass, pass) {
  return filterLen * Math.pow(tapsPerPass, -pass);
}

export class Godrays {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private sunPosition: Vector3;
  private clipPosition: Vector4;
  private screenSpacePosition: Vector3;
  private materialDepth: MeshDepthMaterial;
  private godrayRenderTargetResolutionMultiplier: number;
  private postprocessing: any;
  private bgColor = 0x000511;
  private sunColor = 0xffee00;
  constructor(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    scene: Scene
  ) {
    this.godrayRenderTargetResolutionMultiplier = 1.0 / 4.0;
    this.screenSpacePosition = new Vector3();
    this.clipPosition = new Vector4();
    this.materialDepth = new MeshDepthMaterial();
    this.sunPosition = new Vector3(0, 1000, -1000);
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.postprocessing = { enabled: true };
    this.init(window.innerWidth, window.innerHeight);
  }

  filterGodRays(inputTex, renderTarget, stepSize) {
    this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysGenerate;

    this.postprocessing.godrayGenUniforms["fStepSize"].value = stepSize;
    this.postprocessing.godrayGenUniforms["tInput"].value = inputTex;
    this.postprocessing.scene.overrideMaterial = null;
  }

  init(targetW: number, targetH: number) {
    this.postprocessing.scene = new Scene();

    this.postprocessing.camera = new OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      -10000,
      10000
    );
    this.postprocessing.camera.position.z = 100;

    this.postprocessing.scene.add(this.postprocessing.camera);

    const pars = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBFormat,
    };
    this.postprocessing.rtTextureColors = new WebGLRenderTarget(
      targetW,
      targetH,
      pars
    );

    this.postprocessing.rtTextureDepth = new WebGLRenderTarget(
      targetW,
      targetH,
      pars
    );
    this.postprocessing.rtTextureDepthMask = new WebGLRenderTarget(
      targetW,
      targetH,
      pars
    );

    // The ping-pong render targets can use an adjusted resolution to minimize cost
    const adjustedWidth = targetW * this.godrayRenderTargetResolutionMultiplier;
    const adjustedHeight =
      targetH * this.godrayRenderTargetResolutionMultiplier;
    this.postprocessing.rtTextureGodRays1 = new WebGLRenderTarget(
      adjustedWidth,
      adjustedHeight,
      pars
    );
    this.postprocessing.rtTextureGodRays2 = new WebGLRenderTarget(
      adjustedWidth,
      adjustedHeight,
      pars
    );

    // god-ray shaders

    const godraysMaskShader = GodRaysDepthMaskShader;
    this.postprocessing.godrayMaskUniforms = UniformsUtils.clone(
      godraysMaskShader.uniforms
    );
    this.postprocessing.materialGodraysDepthMask = new ShaderMaterial({
      uniforms: this.postprocessing.godrayMaskUniforms,
      vertexShader: godraysMaskShader.vertexShader,
      fragmentShader: godraysMaskShader.fragmentShader,
    });

    const godraysGenShader = GodRaysGenerateShader;
    this.postprocessing.godrayGenUniforms = UniformsUtils.clone(
      godraysGenShader.uniforms
    );
    this.postprocessing.materialGodraysGenerate = new ShaderMaterial({
      uniforms: this.postprocessing.godrayGenUniforms,
      vertexShader: godraysGenShader.vertexShader,
      fragmentShader: godraysGenShader.fragmentShader,
    });

    const godraysCombineShader = GodRaysCombineShader;
    this.postprocessing.godrayCombineUniforms = UniformsUtils.clone(
      godraysCombineShader.uniforms
    );
    this.postprocessing.materialGodraysCombine = new ShaderMaterial({
      uniforms: this.postprocessing.godrayCombineUniforms,
      vertexShader: godraysCombineShader.vertexShader,
      fragmentShader: godraysCombineShader.fragmentShader,
    });

    const godraysFakeSunShader = GodRaysFakeSunShader;
    this.postprocessing.godraysFakeSunUniforms = UniformsUtils.clone(
      godraysFakeSunShader.uniforms
    );
    this.postprocessing.materialGodraysFakeSun = new ShaderMaterial({
      uniforms: this.postprocessing.godraysFakeSunUniforms,
      vertexShader: godraysFakeSunShader.vertexShader,
      fragmentShader: godraysFakeSunShader.fragmentShader,
    });

    this.postprocessing.godraysFakeSunUniforms.bgColor.value.setHex(
      this.bgColor
    );
    this.postprocessing.godraysFakeSunUniforms.sunColor.value.setHex(
      this.sunColor
    );

    this.postprocessing.godrayCombineUniforms.fGodRayIntensity.value = 0.75;

    this.postprocessing.quad = new Mesh(
      new PlaneGeometry(1.0, 1.0),
      this.postprocessing.materialGodraysGenerate
    );
    this.postprocessing.quad.position.z = -9900;
    this.postprocessing.scene.add(this.postprocessing.quad);
  }

  tick(_delta: number) {
    this.clipPosition.x = this.sunPosition.x;
    this.clipPosition.y = this.sunPosition.y;
    this.clipPosition.z = this.sunPosition.z;
    this.clipPosition.w = 1;

    this.clipPosition
      .applyMatrix4(this.camera.matrixWorldInverse)
      .applyMatrix4(this.camera.projectionMatrix);

    // perspective divide (produce NDC space)
    this.clipPosition.x /= this.clipPosition.w;
    this.clipPosition.y /= this.clipPosition.w;

    this.screenSpacePosition.x = (this.clipPosition.x + 1) / 2; // transform from [-1,1] to [0,1]
    this.screenSpacePosition.y = (this.clipPosition.y + 1) / 2; // transform from [-1,1] to [0,1]
    this.screenSpacePosition.z = this.clipPosition.z; // needs to stay in clip space for visibilty checks

    // Give it to the god-ray and sun shaders
    this.postprocessing.godrayGenUniforms["vSunPositionScreenSpace"].value.copy(
      this.screenSpacePosition
    );
    this.postprocessing.godraysFakeSunUniforms[
      "vSunPositionScreenSpace"
    ].value.copy(this.screenSpacePosition);

    // -- Draw sky and sun --

    // Clear colors and depths, will clear to sky color

    this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
    this.renderer.clear(true, true, false);

    // Sun render. Runs a shader that gives a brightness based on the screen
    // space distance to the sun. Not very efficient, so i make a scissor
    // rectangle around the suns position to avoid rendering surrounding pixels.

    const sunsqH = 0.74 * window.innerHeight; // 0.74 depends on extent of sun from shader
    const sunsqW = 0.74 * window.innerHeight; // both depend on height because sun is aspect-corrected

    this.screenSpacePosition.x *= window.innerWidth;
    this.screenSpacePosition.y *= window.innerHeight;

    this.renderer.setScissor(
      this.screenSpacePosition.x - sunsqW / 2,
      this.screenSpacePosition.y - sunsqH / 2,
      sunsqW,
      sunsqH
    );
    this.renderer.setScissorTest(true);

    this.postprocessing.godraysFakeSunUniforms["fAspect"].value =
      window.innerWidth / window.innerHeight;

    this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysFakeSun;
    this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
    this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);

    this.renderer.setScissorTest(false);

    // -- Draw scene objects --

    // Colors

    this.scene.overrideMaterial = null;
    this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
    this.renderer.render(this.scene, this.camera);

    // Depth
    this.scene.overrideMaterial = this.materialDepth;
    this.renderer.setRenderTarget(this.postprocessing.rtTextureDepth);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    //

    this.postprocessing.godrayMaskUniforms[
      "tInput"
    ].value = this.postprocessing.rtTextureDepth.texture;

    this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysDepthMask;
    this.renderer.setRenderTarget(this.postprocessing.rtTextureDepthMask);
    this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);

    // -- Render god-rays --

    // Maximum length of god-rays (in texture space [0,1]X[0,1])

    const filterLen = 1.0;

    // Samples taken by filter

    const TAPS_PER_PASS = 6.0;

    // Pass order could equivalently be 3,2,1 (instead of 1,2,3), which
    // would start with a small filter support and grow to large. however
    // the large-to-small order produces less objectionable aliasing artifacts that
    // appear as a glimmer along the length of the beams

    // pass 1 - render into first ping-pong target
    this.filterGodRays(
      this.postprocessing.rtTextureDepthMask.texture,
      this.postprocessing.rtTextureGodRays2,
      getStepSize(filterLen, TAPS_PER_PASS, 1.0)
    );

    // pass 2 - render into second ping-pong target
    this.filterGodRays(
      this.postprocessing.rtTextureGodRays2.texture,
      this.postprocessing.rtTextureGodRays1,
      getStepSize(filterLen, TAPS_PER_PASS, 2.0)
    );

    // pass 3 - 1st RT
    this.filterGodRays(
      this.postprocessing.rtTextureGodRays1.texture,
      this.postprocessing.rtTextureGodRays2,
      getStepSize(filterLen, TAPS_PER_PASS, 3.0)
    );

    // final pass - composite god-rays onto colors

    this.postprocessing.godrayCombineUniforms[
      "tColors"
    ].value = this.postprocessing.rtTextureColors.texture;
    this.postprocessing.godrayCombineUniforms[
      "tGodRays"
    ].value = this.postprocessing.rtTextureGodRays2.texture;

    this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysCombine;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
    this.postprocessing.scene.overrideMaterial = null;
  }
  resize() {
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;

    this.postprocessing.rtTextureColors.setSize(targetW, targetH);
    this.postprocessing.rtTextureDepth.setSize(targetW, targetH);
    this.postprocessing.rtTextureDepthMask.setSize(targetW, targetH);

    const adjustedWidth = targetW * this.godrayRenderTargetResolutionMultiplier;
    const adjustedHeight =
      targetH * this.godrayRenderTargetResolutionMultiplier;
    this.postprocessing.rtTextureGodRays1.setSize(
      adjustedWidth,
      adjustedHeight
    );
    this.postprocessing.rtTextureGodRays2.setSize(
      adjustedWidth,
      adjustedHeight
    );
  }
}
