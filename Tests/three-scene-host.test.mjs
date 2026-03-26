import assert from "node:assert/strict";

import { ThreeSceneHost } from "../Sources/app/three-scene-host.js";

class ColorValue {
  constructor(value = null) {
    this.value = value;
  }

  set(value) {
    this.value = value;
  }
}

class Vector3Stub {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  equals(other) {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }
}

class Object3DStub {
  constructor() {
    this.position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x, y, z) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      }
    };
    this.scale = {
      value: 1,
      setScalar: (value) => {
        this.scale.value = value;
      }
    };
  }
}

class SceneStub {
  constructor() {
    this.objects = [];
  }

  add(...objects) {
    this.objects.push(...objects);
  }

  remove(object) {
    this.objects = this.objects.filter((entry) => entry !== object);
  }
}

class PerspectiveCameraStub extends Object3DStub {
  constructor() {
    super();
    this.aspect = 1;
    this.lookAtTarget = null;
    this.projectionMatrixUpdates = 0;
  }

  lookAt(x, y, z) {
    this.lookAtTarget = { x, y, z };
  }

  updateProjectionMatrix() {
    this.projectionMatrixUpdates += 1;
  }
}

class RendererStub {
  constructor() {
    this.outputColorSpace = null;
    this.size = null;
    this.pixelRatio = null;
    this.renderCalls = 0;
    this.disposed = false;
  }

  setClearColor() {}

  setPixelRatio(value) {
    this.pixelRatio = value;
  }

  setSize(width, height) {
    this.size = { width, height };
  }

  render() {
    this.renderCalls += 1;
  }

  dispose() {
    this.disposed = true;
  }
}

class ThrowingRendererStub {
  constructor() {
    throw new Error("WebGL context creation failed.");
  }
}

class GeometryStub {
  constructor() {
    this.disposed = false;
    this.points = [];
    this.attributes = new Map();
    this.drawRange = { start: 0, count: 0 };
    this.setFromPointsCalls = 0;
  }

  dispose() {
    this.disposed = true;
  }

  setFromPoints(points) {
    this.setFromPointsCalls += 1;
    this.points = points;
  }

  setAttribute(name, attribute) {
    this.attributes.set(name, attribute);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setDrawRange(start, count) {
    this.drawRange = { start, count };
  }
}

class BufferAttributeStub {
  constructor(array, itemSize) {
    this.array = array;
    this.itemSize = itemSize;
    this.needsUpdate = false;
  }
}

class MeshStandardMaterialStub {
  constructor(config) {
    this.map = config.map;
    this.color = new ColorValue(config.color);
    this.emissive = new ColorValue(config.emissive);
    this.emissiveIntensity = config.emissiveIntensity;
    this.needsUpdate = false;
    this.disposed = false;
  }

  dispose() {
    this.disposed = true;
  }
}

class LineBasicMaterialStub {
  constructor(config) {
    this.color = new ColorValue(config.color);
    this.transparent = config.transparent;
    this.opacity = config.opacity;
    this.disposed = false;
  }

  dispose() {
    this.disposed = true;
  }
}

class MeshStub extends Object3DStub {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class LineStub extends Object3DStub {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class TextureLoaderStub {
  load(path, onLoad, _onProgress, onError) {
    if (path.endsWith("earth.jpg")) {
      onLoad({ path });
      return;
    }

    onError?.(new Error("missing texture"));
  }
}

function createThreeStub() {
  return {
    Scene: SceneStub,
    Fog: class FogStub {
      constructor(color, near, far) {
        this.color = color;
        this.near = near;
        this.far = far;
      }
    },
    PerspectiveCamera: PerspectiveCameraStub,
    WebGLRenderer: RendererStub,
    TextureLoader: TextureLoaderStub,
    AmbientLight: class AmbientLightStub extends Object3DStub {},
    DirectionalLight: class DirectionalLightStub extends Object3DStub {},
    GridHelper: class GridHelperStub extends Object3DStub {},
    AxesHelper: class AxesHelperStub extends Object3DStub {},
    SphereGeometry: GeometryStub,
    BufferGeometry: GeometryStub,
    MeshStandardMaterial: MeshStandardMaterialStub,
    LineBasicMaterial: LineBasicMaterialStub,
    Mesh: MeshStub,
    Line: LineStub,
    Vector3: Vector3Stub,
    BufferAttribute: BufferAttributeStub,
    SRGBColorSpace: "srgb"
  };
}

function createCanvasStub(width = 640, height = 360) {
  return {
    getBoundingClientRect() {
      return { width, height };
    }
  };
}

function createModel({ bodies, simulationTime = 1, showTrails = true, cameraTarget = "system-center" }) {
  return {
    appState: {
      bodies,
      simulationConfig: {
        maxTrailPoints: 4
      },
      uiState: {
        showTrails,
        cameraTarget
      }
    },
    runtime: {
      simulationTime
    }
  };
}

function testTextureFallbackAndLoadedTexture() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  let invalidateCalls = 0;
  const host = new ThreeSceneHost(createCanvasStub(), {
    three: createThreeStub(),
    onInvalidate: () => {
      invalidateCalls += 1;
    }
  });

  const bodies = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 0, y: 0, z: 0 }, color: "#3366ff" },
    { id: "body-2", name: "pluto", mass: 1, position: { x: 1, y: 0, z: 0 }, color: "#ff6633" }
  ];

  host.render(createModel({ bodies }));

  const earthMesh = host.meshes.get("body-1");
  const plutoMesh = host.meshes.get("body-2");

  assert.ok(host.ready);
  assert.ok(earthMesh.material.map);
  assert.equal(earthMesh.material.color.value, 0xffffff);
  assert.equal(plutoMesh.material.map, null);
  assert.equal(plutoMesh.material.color.value, "#ff6633");
  assert.ok(invalidateCalls >= 1);
  assert.equal(host.getInitializationStatus().modeLabel, "Three.js textured mode");
  assert.equal(
    host.getInitializationStatus().message,
    "Renderer initialized in Three.js textured mode. Texture-backed bodies will load from local Sources/images assets when names match."
  );
}

function testInitializationStatusReportsFallbackReason() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), {});
  const status = host.getInitializationStatus();

  assert.equal(status.modeLabel, "2D fallback mode");
  assert.equal(
    status.message,
    "Renderer initialized in 2D fallback mode. Texture-backed bodies are unavailable because Three.js failed to initialize (Three.js global is unavailable.)."
  );
}

function testInitializationStatusReportsRendererConstructionFailure() {
  delete globalThis.THREE;
  const three = {
    ...createThreeStub(),
    WebGLRenderer: ThrowingRendererStub
  };
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three });
  const status = host.getInitializationStatus();

  assert.equal(host.ready, false);
  assert.equal(status.modeLabel, "2D fallback mode");
  assert.equal(
    status.message,
    "Renderer initialized in 2D fallback mode. Texture-backed bodies are unavailable because Three.js failed to initialize (WebGL context creation failed.)."
  );
}

function testTrailResetAndCameraTarget() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three: createThreeStub() });
  const bodiesA = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 0, y: 0, z: 0 }, color: "#3366ff" }
  ];
  const bodiesB = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 1, y: 0, z: 0 }, color: "#3366ff" }
  ];

  host.render(createModel({ bodies: bodiesA, simulationTime: 1, showTrails: true, cameraTarget: "body-1" }));
  host.render(createModel({ bodies: bodiesB, simulationTime: 2, showTrails: true, cameraTarget: "body-1" }));

  assert.equal(host.trailLines.size, 1);
  assert.equal(host.trailHistory.get("body-1").count, 2);
  assert.equal(host.trailLines.get("body-1").geometry.drawRange.start, 0);
  assert.deepEqual(host.camera.lookAtTarget, { x: 1, y: 0, z: 0 });
  assert.equal(host.trailLines.get("body-1").geometry.setFromPointsCalls, 0);

  host.render(createModel({ bodies: bodiesB, simulationTime: 3, showTrails: false, cameraTarget: "system-center" }));

  assert.equal(host.trailLines.size, 0);
  assert.equal(host.trailHistory.size, 0);
}

function testTrailDisplayBufferUsesPartialAppendAfterWrap() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three: createThreeStub() });
  const positions = [0, 1, 2, 3, 4].map((x) => ({
    id: "body-1",
    name: "earth",
    mass: 1,
    position: { x, y: 0, z: 0 },
    color: "#3366ff"
  }));

  for (let index = 0; index < positions.length; index += 1) {
    host.render(createModel({
      bodies: [positions[index]],
      simulationTime: index + 1,
      showTrails: true,
      cameraTarget: "body-1"
    }));
  }

  const trailState = host.trailHistory.get("body-1");
  const geometry = host.trailLines.get("body-1").geometry;
  const attribute = geometry.getAttribute("position");

  assert.equal(trailState.count, 4);
  assert.equal(geometry.drawRange.start, 1);
  assert.equal(geometry.drawRange.count, 4);
  assert.equal(attribute.array.length, 24);
  assert.deepEqual(Array.from(attribute.array.slice(3, 15)), [1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0]);
}

function testResizeUpdatesRendererAndCamera() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1.5 };

  const host = new ThreeSceneHost(createCanvasStub(800, 400), { three: createThreeStub() });

  host.resize();

  assert.deepEqual(host.renderer.size, { width: 800, height: 400 });
  assert.equal(host.renderer.pixelRatio, 1.5);
  assert.equal(host.camera.aspect, 2);
  assert.equal(host.camera.projectionMatrixUpdates, 1);
}

function testSystemCenterCameraTracksCenterOfMass() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three: createThreeStub() });
  const bodiesA = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 0, y: 0, z: 0 }, color: "#3366ff" },
    { id: "body-2", name: "mars", mass: 3, position: { x: 4, y: 0, z: 0 }, color: "#ff6633" }
  ];
  const bodiesB = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 2, y: 0, z: 0 }, color: "#3366ff" },
    { id: "body-2", name: "mars", mass: 3, position: { x: 6, y: 0, z: 0 }, color: "#ff6633" }
  ];

  host.render(createModel({ bodies: bodiesA, simulationTime: 1, showTrails: false, cameraTarget: "system-center" }));
  assert.deepEqual(host.camera.lookAtTarget, { x: 3, y: 0, z: 0 });

  host.render(createModel({ bodies: bodiesB, simulationTime: 2, showTrails: false, cameraTarget: "system-center" }));
  assert.deepEqual(host.camera.lookAtTarget, { x: 5, y: 0, z: 0 });
}

function testSystemCenterFallsBackToPositionAverageWhenTotalMassIsZero() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three: createThreeStub() });
  const bodies = [
    { id: "body-1", name: "earth", mass: 0, position: { x: 2, y: 1, z: -1 }, color: "#3366ff" },
    { id: "body-2", name: "mars", mass: 0, position: { x: 6, y: 3, z: 1 }, color: "#ff6633" }
  ];

  host.render(createModel({ bodies, simulationTime: 1, showTrails: false, cameraTarget: "system-center" }));

  assert.deepEqual(host.camera.lookAtTarget, { x: 4, y: 2, z: 0 });
}

function testMeshRemovalDisposesMeshAndTrailResources() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three: createThreeStub() });
  const initialBodies = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 0, y: 0, z: 0 }, color: "#3366ff" },
    { id: "body-2", name: "mars", mass: 1, position: { x: 1, y: 0, z: 0 }, color: "#ff6633" }
  ];

  host.render(createModel({ bodies: initialBodies, simulationTime: 1, showTrails: true }));
  host.render(createModel({
    bodies: initialBodies.map((body, index) => ({
      ...body,
      position: { x: body.position.x + index + 1, y: 0, z: 0 }
    })),
    simulationTime: 2,
    showTrails: true
  }));

  const removedMesh = host.meshes.get("body-2");
  const removedTrail = host.trailLines.get("body-2");

  host.render(createModel({
    bodies: [initialBodies[0]],
    simulationTime: 3,
    showTrails: true
  }));

  assert.equal(host.meshes.has("body-2"), false);
  assert.equal(host.trailLines.has("body-2"), false);
  assert.equal(host.trailHistory.has("body-2"), false);
  assert.equal(removedMesh.geometry.disposed, true);
  assert.equal(removedMesh.material.disposed, true);
  assert.equal(removedTrail.geometry.disposed, true);
  assert.equal(removedTrail.material.disposed, true);
}

function testDisposeReleasesMeshesTrailsAndRenderer() {
  delete globalThis.THREE;
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), { three: createThreeStub() });
  const bodies = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 0, y: 0, z: 0 }, color: "#3366ff" }
  ];

  host.render(createModel({ bodies, simulationTime: 1, showTrails: true }));
  host.render(createModel({
    bodies: [{ ...bodies[0], position: { x: 1, y: 0, z: 0 } }],
    simulationTime: 2,
    showTrails: true
  }));

  const mesh = host.meshes.get("body-1");
  const trail = host.trailLines.get("body-1");

  host.dispose();

  assert.equal(host.meshes.size, 0);
  assert.equal(host.trailLines.size, 0);
  assert.equal(host.trailHistory.size, 0);
  assert.equal(mesh.geometry.disposed, true);
  assert.equal(mesh.material.disposed, true);
  assert.equal(trail.geometry.disposed, true);
  assert.equal(trail.material.disposed, true);
  assert.equal(host.renderer.disposed, true);
}

testTextureFallbackAndLoadedTexture();
testInitializationStatusReportsFallbackReason();
testInitializationStatusReportsRendererConstructionFailure();
testTrailResetAndCameraTarget();
testTrailDisplayBufferUsesPartialAppendAfterWrap();
testResizeUpdatesRendererAndCamera();
testSystemCenterCameraTracksCenterOfMass();
testSystemCenterFallsBackToPositionAverageWhenTotalMassIsZero();
testMeshRemovalDisposesMeshAndTrailResources();
testDisposeReleasesMeshesTrailsAndRenderer();

console.log("three-scene-host.test.mjs ok");