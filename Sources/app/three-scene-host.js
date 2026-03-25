function createVector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

import {
  createBodyMaterialVisual,
  getTexturePath,
  normalizeTextureKey,
  resolveLoadedTexture,
  syncTrailHistoryEntries
} from "./renderer-helpers.js";

export class ThreeSceneHost {
  constructor(canvasElement, options = {}) {
    this.canvasElement = canvasElement;
    this.onInvalidate = typeof options.onInvalidate === "function" ? options.onInvalidate : null;
    this.three = globalThis.THREE;
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

  resize() {
    if (!this.ready) {
      return;
    }

    const bounds = this.canvasElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));

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

  resolveCameraTarget(appState) {
    const cameraTarget = appState.uiState.cameraTarget;

    if (cameraTarget && cameraTarget !== "system-center") {
      const targetBody = appState.bodies.find((body) => body.id === cameraTarget);

      if (targetBody) {
        return createVector(targetBody.position.x, targetBody.position.y, targetBody.position.z);
      }
    }

    if (appState.bodies.length === 0) {
      return createVector();
    }

    const weightedCenter = appState.bodies.reduce((accumulator, body) => {
      const mass = Number.isFinite(body.mass) && body.mass > 0 ? body.mass : 0;

      return {
        x: accumulator.x + (body.position.x * mass),
        y: accumulator.y + (body.position.y * mass),
        z: accumulator.z + (body.position.z * mass),
        totalMass: accumulator.totalMass + mass
      };
    }, {
      x: 0,
      y: 0,
      z: 0,
      totalMass: 0
    });

    if (weightedCenter.totalMass > 0) {
      return createVector(
        weightedCenter.x / weightedCenter.totalMass,
        weightedCenter.y / weightedCenter.totalMass,
        weightedCenter.z / weightedCenter.totalMass
      );
    }

    const center = appState.bodies.reduce((accumulator, body) => ({
      x: accumulator.x + body.position.x,
      y: accumulator.y + body.position.y,
      z: accumulator.z + body.position.z
    }), createVector());

    return createVector(
      center.x / appState.bodies.length,
      center.y / appState.bodies.length,
      center.z / appState.bodies.length
    );
  }

  syncTrails(model) {
    const { appState, runtime } = model;
    const nextTrailHistory = syncTrailHistoryEntries({
      trailHistory: this.trailHistory,
      bodies: appState.bodies,
      showTrails: appState.uiState.showTrails,
      simulationTime: runtime.simulationTime,
      maxTrailPoints: appState.simulationConfig.maxTrailPoints,
      selectPoint: (body) => ({ x: body.position.x, y: body.position.y, z: body.position.z })
    });

    if (nextTrailHistory.size === 0) {
      this.resetTrails();
      return;
    }

    for (const bodyId of [...this.trailHistory.keys()]) {
      if (!nextTrailHistory.has(bodyId)) {
        this.removeTrail(bodyId);
      }
    }

    this.trailHistory = nextTrailHistory;

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
      trailLine.geometry.setFromPoints(history.map((point) => new this.three.Vector3(point.x, point.y, point.z)));
    }
  }

  render(model) {
    if (!this.ready) {
      return false;
    }

    this.syncMeshes(model.appState.bodies);
    this.syncTrails(model);

    const elapsed = model.runtime.simulationTime;
    const target = this.resolveCameraTarget(model.appState);
    this.camera.position.x = target.x + Math.sin(elapsed * 0.18) * 0.2;
    this.camera.position.y = target.y + 3.2;
    this.camera.position.z = target.z + 8.2 + Math.cos(elapsed * 0.14) * 0.15;
    this.camera.lookAt(target.x, target.y, target.z);

    this.renderer.render(this.scene, this.camera);
    return true;
  }
}