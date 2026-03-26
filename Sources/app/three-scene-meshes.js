export function disposeThreeResource(resource) {
  resource?.dispose?.();
}

export function disposeBodyMesh(mesh) {
  if (!mesh) {
    return;
  }

  disposeThreeResource(mesh.geometry);
  disposeThreeResource(mesh.material);
}

export function createBodyMesh(three, body, material) {
  const geometry = new three.SphereGeometry(0.16, 24, 24);
  const mesh = new three.Mesh(geometry, material);

  applyBodyMeshTransform(mesh, body);
  return mesh;
}

export function applyBodyMeshTransform(mesh, body) {
  const scale = Math.max(0.65, Math.sqrt(body.mass) * 0.45);

  mesh.position.set(body.position.x, body.position.y, body.position.z);
  mesh.scale.setScalar(scale);
}

export function createStandardBodyMaterial(three, visual) {
  return new three.MeshStandardMaterial({
    map: visual.map,
    color: visual.color,
    emissive: visual.emissive,
    emissiveIntensity: visual.emissiveIntensity,
    metalness: 0.18,
    roughness: 0.36
  });
}

export function applyBodyMaterialVisual(material, visual) {
  if (material.map !== visual.map) {
    material.map = visual.map;
    material.needsUpdate = true;
  }

  material.color.set(visual.color);
  material.emissive.set(visual.emissive);
  material.emissiveIntensity = visual.emissiveIntensity;
}

export function syncBodyMeshes({ scene, meshes, bodies, createMesh, updateMesh, removeBody }) {
  const activeIds = new Set(bodies.map((body) => body.id));

  for (const [bodyId, mesh] of meshes.entries()) {
    if (activeIds.has(bodyId)) {
      continue;
    }

    scene.remove(mesh);
    disposeBodyMesh(mesh);
    meshes.delete(bodyId);
    removeBody?.(bodyId, mesh);
  }

  for (const body of bodies) {
    if (!meshes.has(body.id)) {
      const mesh = createMesh(body);
      meshes.set(body.id, mesh);
      scene.add(mesh);
    }

    updateMesh(meshes.get(body.id), body);
  }
}