import {
  createBodyMaterialVisual,
  getTexturePath,
  normalizeTextureKey,
  resolveLoadedTexture
} from "./renderer-helpers.js";
import {
  buildSceneTrailPlan,
  createTrailPoints,
  resolveSceneCameraFrame
} from "./three-scene-runtime.js";
import { measureViewportDisplaySize } from "./viewport-layout.js";

export class ThreeSceneHost {
  constructor(canvasElement, options = {}) {
    this.canvasElement = canvasElement;
    this.onInvalidate = typeof options.onInvalidate === "function" ? options.onInvalidate : null;
    this.three = options.three ?? globalThis.THREE;
    this.meshes = new Map();
    this.trailLines = new Map();
    this.trailHistory = new Map();
    this.textureCache = new Map();
    this.ready = false;
    this.initError = null;

    if (!this.three) {
      this.initError = new Error("Three.js global is unavailable.");
      return;
    }

    try {
      this.scene = new this.three.Scene();
      this.scene.fog = new this.three.Fog(0x081622, 8, 26);

      this.camera = new this.three.PerspectiveCamera(45, 1, 0.1, 100);
      this.camera.position.set(0, 3.2, 8.2);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new this.three.WebGLRenderer({
        canvas: this.canvasElement,
        antialias: true,
        alpha: true
      });
      this.renderer.outputColorSpace = this.three.SRGBColorSpace;
      this.renderer.setClearColor(0x000000, 0);
      this.textureLoader = new this.three.TextureLoader();

      const ambientLight = new this.three.AmbientLight(0xffffff, 1.1);
      const keyLight = new this.three.DirectionalLight(0xcdeaff, 1.9);
      keyLight.position.set(5, 8, 6);

      const rimLight = new this.three.DirectionalLight(0x7ce7d8, 0.8);
      rimLight.position.set(-6, 3, -4);

      this.scene.add(ambientLight, keyLight, rimLight);

      const grid = new this.three.GridHelper(14, 14, 0x2e5968, 0x16323e);
      grid.position.y = -1.6;
      this.scene.add(grid);

      const axes = new this.three.AxesHelper(1.6);
      axes.position.set(-2.8, -1.5, -2.8);
      this.scene.add(axes);

      this.ready = true;
    } catch (error) {
      this.initError = error;
      this.ready = false;
    }
  }

  getModeLabel() {
    return this.ready ? "Three.js textured mode" : "2D fallback mode";
  }

  getInitializationStatus() {
    if (this.ready) {
      return {
        modeLabel: this.getModeLabel(),
        message: "Renderer initialized in Three.js textured mode. Texture-backed bodies will load from local Sources/images assets when names match."
      };
    }

    const reason = this.initError?.message ?? "Unknown renderer initialization error.";

    return {
      modeLabel: this.getModeLabel(),
      message: `Renderer initialized in 2D fallback mode. Texture-backed bodies are unavailable because Three.js failed to initialize (${reason}).`
    };
  }

  resize() {
    if (!this.ready) {
      return;
    }

    const { width, height } = measureViewportDisplaySize(this.canvasElement);

    this.renderer.setPixelRatio(Math.max(1, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  syncMeshes(bodies) {
    const activeIds = new Set(bodies.map((body) => body.id));

    for (const [bodyId, mesh] of this.meshes.entries()) {
      if (!activeIds.has(bodyId)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.meshes.delete(bodyId);
        this.removeTrail(bodyId);
      }
    }

    for (const body of bodies) {
      if (!this.meshes.has(body.id)) {
        const geometry = new this.three.SphereGeometry(0.16, 24, 24);
        const material = this.createBodyMaterial(body);
        const mesh = new this.three.Mesh(geometry, material);
        this.meshes.set(body.id, mesh);
        this.scene.add(mesh);
      }

      const mesh = this.meshes.get(body.id);
      const scale = Math.max(0.65, Math.sqrt(body.mass) * 0.45);
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.scale.setScalar(scale);
      this.updateBodyMaterial(mesh.material, body);
    }
  }

  removeTrail(bodyId) {
    const trailLine = this.trailLines.get(bodyId);

    if (trailLine) {
      this.scene.remove(trailLine);
      trailLine.geometry.dispose();
      trailLine.material.dispose();
      this.trailLines.delete(bodyId);
    }

    this.trailHistory.delete(bodyId);
  }

  resetTrails() {
    for (const bodyId of [...this.trailLines.keys()]) {
      this.removeTrail(bodyId);
    }
  }

  createBodyMaterial(body) {
    const texture = this.resolveTexture(body.name);
    const visual = createBodyMaterialVisual(body.color, texture);

    return new this.three.MeshStandardMaterial({
      map: visual.map,
      color: visual.color,
      emissive: visual.emissive,
      emissiveIntensity: visual.emissiveIntensity,
      metalness: 0.18,
      roughness: 0.36
    });
  }

  updateBodyMaterial(material, body) {
    const texture = this.resolveTexture(body.name);
    const visual = createBodyMaterialVisual(body.color, texture);

    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }

    material.color.set(visual.color);
    material.emissive.set(visual.emissive);
    material.emissiveIntensity = visual.emissiveIntensity;
  }

  resolveTexture(bodyName) {
    const textureKey = normalizeTextureKey(bodyName);

    if (!textureKey || !this.textureLoader) {
      return null;
    }

    const loadedTexture = resolveLoadedTexture(this.textureCache, bodyName);

    if (loadedTexture) {
      return loadedTexture;
    }

    const cachedTexture = this.textureCache.get(textureKey);

    if (cachedTexture?.status === "loading" || cachedTexture?.status === "error") {
      return null;
    }

    const texturePath = getTexturePath(bodyName);
    this.textureCache.set(textureKey, { status: "loading" });

    this.textureLoader.load(
      texturePath,
      (texture) => {
        texture.colorSpace = this.three.SRGBColorSpace;
        this.textureCache.set(textureKey, { status: "loaded", texture });
        this.requestRender();
      },
      undefined,
      () => {
        this.textureCache.set(textureKey, { status: "error" });
        this.requestRender();
      }
    );

    return null;
  }

  requestRender() {
    if (this.onInvalidate) {
      this.onInvalidate();
    }
  }

  syncTrails(model) {
    const { appState } = model;
    const trailPlan = buildSceneTrailPlan({
      trailHistory: this.trailHistory,
      appState,
      simulationTime: model.runtime.simulationTime
    });

    if (trailPlan.shouldReset) {
      this.resetTrails();
      return;
    }

    for (const bodyId of trailPlan.removedBodyIds) {
      this.removeTrail(bodyId);
    }

    this.trailHistory = trailPlan.nextTrailHistory;

    for (const body of appState.bodies) {
      const history = this.trailHistory.get(body.id) ?? [];
      let trailLine = this.trailLines.get(body.id);

      if (!trailLine) {
        trailLine = new this.three.Line(
          new this.three.BufferGeometry(),
          new this.three.LineBasicMaterial({
            color: body.color,
            transparent: true,
            opacity: 0.45
          })
        );
        this.trailLines.set(body.id, trailLine);
        this.scene.add(trailLine);
      }

      trailLine.material.color.set(body.color);
      trailLine.geometry.setFromPoints(createTrailPoints(history, (x, y, z) => new this.three.Vector3(x, y, z)));
    }
  }

  render(model) {
    if (!this.ready) {
      return false;
    }

    this.syncMeshes(model.appState.bodies);
    this.syncTrails(model);

    const cameraFrame = resolveSceneCameraFrame(model.appState, model.runtime.simulationTime);
    this.camera.position.x = cameraFrame.position.x;
    this.camera.position.y = cameraFrame.position.y;
    this.camera.position.z = cameraFrame.position.z;
    this.camera.lookAt(cameraFrame.target.x, cameraFrame.target.y, cameraFrame.target.z);

    this.renderer.render(this.scene, this.camera);
    return true;
  }
}