import * as THREE from "three";

const colors = {
  ink: 0x10231f,
  lime: 0xd5ff55,
  mint: 0xc7f2dd,
  lavender: 0xd9d4ff,
};

function createOrbit(radiusX, radiusY, rotationZ = 0) {
  const points = Array.from({ length: 128 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0);
  });
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.48 });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.z = rotationZ;
  return line;
}

function createSphere(radius, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 }),
  );
}

export function createOrbitScene(canvas, labels) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 2.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 6, 8);
  scene.add(keyLight);

  const system = new THREE.Group();
  scene.add(system);
  system.add(createOrbit(4.6, 2.8, 0.12));
  system.add(createOrbit(4.25, 2.05, -0.38));

  const center = createSphere(1.14, colors.ink);
  system.add(center);

  const satellites = [
    { key: "post", mesh: createSphere(0.72, colors.lime), radiusX: 4.35, radiusY: 2.62, speed: 0.14, phase: 0.62 },
    { key: "join", mesh: createSphere(0.72, colors.mint), radiusX: 4.05, radiusY: 2.12, speed: -0.11, phase: 3.18 },
    { key: "collaborate", mesh: createSphere(0.78, colors.lavender), radiusX: 4.45, radiusY: 2.74, speed: 0.09, phase: 5.22 },
  ];

  const connectorMaterial = new THREE.LineBasicMaterial({ color: colors.ink, transparent: true, opacity: 0.58 });
  satellites.forEach((satellite) => {
    system.add(satellite.mesh);
    satellite.connector = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      connectorMaterial,
    );
    system.add(satellite.connector);
  });

  const pointerTarget = { x: 0, y: 0 };
  const timer = new THREE.Timer();
  timer.connect(document);

  function resize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setLabelPosition(key, object) {
    const label = labels[key];
    if (!label) return;
    const position = object.getWorldPosition(new THREE.Vector3()).project(camera);
    label.style.left = `${(position.x * 0.5 + 0.5) * canvas.clientWidth}px`;
    label.style.top = `${(-position.y * 0.5 + 0.5) * canvas.clientHeight}px`;
  }

  function updateSatellites(time) {
    satellites.forEach((satellite) => {
      const angle = satellite.phase + (reduceMotion ? 0 : time * satellite.speed);
      satellite.mesh.position.set(
        Math.cos(angle) * satellite.radiusX,
        Math.sin(angle) * satellite.radiusY,
        Math.sin(angle * 1.7) * 0.42,
      );
      satellite.connector.geometry.setFromPoints([new THREE.Vector3(), satellite.mesh.position.clone()]);
      setLabelPosition(satellite.key, satellite.mesh);
    });
    setLabelPosition("you", center);
  }

  function render(timestamp) {
    timer.update(timestamp);
    const elapsed = timer.getElapsed();
    system.rotation.y += (pointerTarget.x * 0.09 - system.rotation.y) * 0.035;
    system.rotation.x += (pointerTarget.y * 0.06 - system.rotation.x) * 0.035;
    updateSatellites(elapsed);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerTarget.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerTarget.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  canvas.addEventListener("pointerleave", () => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  });

  new ResizeObserver(resize).observe(canvas);
  resize();
  updateSatellites(0);
  requestAnimationFrame(render);
}
