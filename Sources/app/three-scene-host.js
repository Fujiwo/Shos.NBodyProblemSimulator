const TEXTURE_ROOT = "./images";

function normalizeTextureKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export class ThreeSceneHost {
  constructor(canvasElement, options = {}) {
    this.canvasElement = canvasElement;
    this.onInvalidate = typeof options.onInvalidate === "function" ? options.onInvalidate : null;
    this.three = globalThis.THREE;
    this.meshes = new Map();
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
    return this.ready ? "Three.js scaffold mode" : "2D fallback mode";
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

  createBodyMaterial(body) {
    const texture = this.resolveTexture(body.name);

    return new this.three.MeshStandardMaterial({
      map: texture,
      color: texture ? 0xffffff : body.color,
      emissive: texture ? 0x111111 : body.color,
      emissiveIntensity: texture ? 0.05 : 0.15,
      metalness: 0.18,
      roughness: 0.36
    });
  }

  updateBodyMaterial(material, body) {
    const texture = this.resolveTexture(body.name);

    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }

    if (texture) {
      material.color.set(0xffffff);
      material.emissive.set(0x111111);
      material.emissiveIntensity = 0.05;
      return;
    }

    material.color.set(body.color);
    material.emissive.set(body.color);
    material.emissiveIntensity = 0.15;
  }

  resolveTexture(bodyName) {
    const textureKey = normalizeTextureKey(bodyName);

    if (!textureKey || !this.textureLoader) {
      return null;
    }

    const cachedTexture = this.textureCache.get(textureKey);

    if (cachedTexture?.status === "loaded") {
      return cachedTexture.texture;
    }

    if (cachedTexture?.status === "loading" || cachedTexture?.status === "error") {
      return null;
    }

    const texturePath = `${TEXTURE_ROOT}/${textureKey}.jpg`;
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

  render(model) {
    if (!this.ready) {
      return false;
    }

    this.syncMeshes(model.appState.bodies);

    const elapsed = model.runtime.simulationTime;
    this.camera.position.x = Math.sin(elapsed * 0.18) * 0.2;
    this.camera.position.z = 8.2 + Math.cos(elapsed * 0.14) * 0.15;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    return true;
  }
}