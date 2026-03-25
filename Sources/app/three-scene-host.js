export class ThreeSceneHost {
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.three = globalThis.THREE;
    this.meshes = new Map();
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
        const material = new this.three.MeshStandardMaterial({
          color: body.color,
          emissive: body.color,
          emissiveIntensity: 0.15,
          metalness: 0.18,
          roughness: 0.36
        });
        const mesh = new this.three.Mesh(geometry, material);
        this.meshes.set(body.id, mesh);
        this.scene.add(mesh);
      }

      const mesh = this.meshes.get(body.id);
      const scale = Math.max(0.65, Math.sqrt(body.mass) * 0.45);
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.scale.setScalar(scale);
      mesh.material.color.set(body.color);
      mesh.material.emissive.set(body.color);
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