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
  }

  lookAt(x, y, z) {
    this.lookAtTarget = { x, y, z };
  }

  updateProjectionMatrix() {}
}

class RendererStub {
  constructor() {
    this.outputColorSpace = null;
    this.size = null;
    this.pixelRatio = null;
    this.renderCalls = 0;
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
}

class GeometryStub {
  constructor() {
    this.disposed = false;
    this.points = [];
  }

  dispose() {
    this.disposed = true;
  }

  setFromPoints(points) {
    this.points = points;
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
    SRGBColorSpace: "srgb"
  };
}

function createCanvasStub() {
  return {
    getBoundingClientRect() {
      return { width: 640, height: 360 };
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
  globalThis.THREE = createThreeStub();
  globalThis.window = { devicePixelRatio: 1 };

  let invalidateCalls = 0;
  const host = new ThreeSceneHost(createCanvasStub(), {
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
}

function testTrailResetAndCameraTarget() {
  globalThis.THREE = createThreeStub();
  globalThis.window = { devicePixelRatio: 1 };

  const host = new ThreeSceneHost(createCanvasStub(), {});
  const bodiesA = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 0, y: 0, z: 0 }, color: "#3366ff" }
  ];
  const bodiesB = [
    { id: "body-1", name: "earth", mass: 1, position: { x: 1, y: 0, z: 0 }, color: "#3366ff" }
  ];

  host.render(createModel({ bodies: bodiesA, simulationTime: 1, showTrails: true, cameraTarget: "body-1" }));
  host.render(createModel({ bodies: bodiesB, simulationTime: 2, showTrails: true, cameraTarget: "body-1" }));

  assert.equal(host.trailLines.size, 1);
  assert.equal(host.trailHistory.get("body-1").length, 2);
  assert.deepEqual(host.camera.lookAtTarget, { x: 1, y: 0, z: 0 });

  host.render(createModel({ bodies: bodiesB, simulationTime: 3, showTrails: false, cameraTarget: "system-center" }));

  assert.equal(host.trailLines.size, 0);
  assert.equal(host.trailHistory.size, 0);
}

testTextureFallbackAndLoadedTexture();
testTrailResetAndCameraTarget();

console.log("three-scene-host.test.mjs ok");