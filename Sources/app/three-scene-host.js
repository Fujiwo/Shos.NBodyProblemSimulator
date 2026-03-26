import {
  createBodyMaterialVisual,
  getTexturePath,
  normalizeTextureKey,
  resolveLoadedTexture
} from "./renderer-helpers.js";
import {
  buildSceneTrailPlan,
  resolveSceneCameraFrame
} from "./three-scene-runtime.js";
import {
  applyBodyMaterialVisual,
  applyBodyMeshTransform,
  createBodyMesh,
  createStandardBodyMaterial,
  disposeBodyMesh,
  disposeThreeResource,
  syncBodyMeshes
} from "./three-scene-meshes.js";
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
    syncBodyMeshes({
      scene: this.scene,
      meshes: this.meshes,
      bodies,
      createMesh: (body) => this.createBodyMesh(body),
      updateMesh: (mesh, body) => this.updateBodyMesh(mesh, body),
      removeBody: (bodyId) => {
        this.removeTrail(bodyId);
      }
    });
  }

  removeTrail(bodyId) {
    const trailLine = this.trailLines.get(bodyId);

    if (trailLine) {
      this.scene.remove(trailLine);
      disposeThreeResource(trailLine.geometry);
      disposeThreeResource(trailLine.material);
      this.trailLines.delete(bodyId);
    }

    this.trailHistory.delete(bodyId);
  }

  createTrailState(maxPoints) {
    const normalizedMaxPoints = Math.max(2, Number(maxPoints) || 300);
    const displayCapacity = normalizedMaxPoints * 2;

    return {
      maxPoints: normalizedMaxPoints,
      ringBuffer: new Float32Array(normalizedMaxPoints * 3),
      displayBuffer: new Float32Array(displayCapacity * 3),
      nextIndex: 0,
      count: 0,
      displayCapacity,
      lastPoint: null
    };
  }

  ensureTrailState(bodyId, maxPoints) {
    const current = this.trailHistory.get(bodyId);
    const normalizedMaxPoints = Math.max(2, Number(maxPoints) || 300);

    if (current && current.maxPoints === normalizedMaxPoints) {
      return current;
    }

    const nextState = this.createTrailState(normalizedMaxPoints);
    this.trailHistory.set(bodyId, nextState);
    return nextState;
  }

  appendTrailPoint(trailState, point) {
    if (
      trailState.lastPoint
      && trailState.lastPoint.x === point.x
      && trailState.lastPoint.y === point.y
      && trailState.lastPoint.z === point.z
    ) {
      return false;
    }

    const offset = trailState.nextIndex * 3;
    trailState.ringBuffer[offset] = point.x;
    trailState.ringBuffer[offset + 1] = point.y;
    trailState.ringBuffer[offset + 2] = point.z;
    trailState.displayBuffer[offset] = point.x;
    trailState.displayBuffer[offset + 1] = point.y;
    trailState.displayBuffer[offset + 2] = point.z;

    const duplicateOffset = (trailState.nextIndex + trailState.maxPoints) * 3;
    trailState.displayBuffer[duplicateOffset] = point.x;
    trailState.displayBuffer[duplicateOffset + 1] = point.y;
    trailState.displayBuffer[duplicateOffset + 2] = point.z;

    trailState.lastPoint = point;
    trailState.nextIndex = (trailState.nextIndex + 1) % trailState.maxPoints;
    trailState.count = Math.min(trailState.count + 1, trailState.maxPoints);
    return true;
  }

  getTrailDisplayStart(trailState) {
    return trailState.count === trailState.maxPoints ? trailState.nextIndex : 0;
  }

  ensureTrailGeometry(trailLine, trailState) {
    const existingAttribute = trailLine.geometry.getAttribute?.("position");

    if (existingAttribute) {
      return existingAttribute;
    }

    const attribute = new this.three.BufferAttribute(trailState.displayBuffer, 3);
    trailLine.geometry.setAttribute("position", attribute);
    return attribute;
  }

  resetTrails() {
    for (const bodyId of [...this.trailLines.keys()]) {
      this.removeTrail(bodyId);
    }
  }

  resolveBodyMaterialVisual(body) {
    return createBodyMaterialVisual(body.color, this.resolveTexture(body.name));
  }

  createBodyMaterial(body) {
    return createStandardBodyMaterial(this.three, this.resolveBodyMaterialVisual(body));
  }

  createBodyMesh(body) {
    return createBodyMesh(this.three, body, this.createBodyMaterial(body));
  }

  updateBodyMaterial(material, body) {
    applyBodyMaterialVisual(material, this.resolveBodyMaterialVisual(body));
  }

  updateBodyMesh(mesh, body) {
    applyBodyMeshTransform(mesh, body);
    this.updateBodyMaterial(mesh.material, body);
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

  dispose() {
    this.resetTrails();

    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh);
      disposeBodyMesh(mesh);
    }

    this.meshes.clear();
    this.textureCache.clear();
    this.renderer?.dispose?.();
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

    for (const body of appState.bodies) {
      const trailState = this.ensureTrailState(body.id, appState.simulationConfig.maxTrailPoints);
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

      const didAppend = this.appendTrailPoint(trailState, {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z
      });

      if (!didAppend) {
        continue;
      }

      const attribute = this.ensureTrailGeometry(trailLine, trailState);
      attribute.needsUpdate = true;
      trailLine.geometry.setDrawRange(this.getTrailDisplayStart(trailState), trailState.count);
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