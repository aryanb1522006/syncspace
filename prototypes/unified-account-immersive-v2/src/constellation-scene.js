import * as THREE from "three";

const colors = {
  ink: 0x10231f,
  lime: 0xd5ff55,
  mint: 0xc7f2dd,
  lavender: 0xd9d4ff,
  coral: 0xff806b,
  white: 0xffffff,
};

function createNode(radius, color, detail = 2) {
  return new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, detail),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.32,
      roughness: 0.32,
      metalness: 0.06,
    }),
  );
}

function createWaveField() {
  const group = new THREE.Group();
  const palette = [colors.lime, colors.mint, colors.lavender];

  for (let lineIndex = 0; lineIndex < 13; lineIndex += 1) {
    const points = [];
    const baseY = -4.6 + lineIndex * 0.72;
    for (let index = 0; index <= 120; index += 1) {
      const x = -8.2 + (index / 120) * 16.4;
      const y = baseY + Math.sin(x * 0.82 + lineIndex * 0.56) * 0.22;
      const z = -2.6 + Math.cos(x * 0.35 + lineIndex) * 0.18;
      points.push(new THREE.Vector3(x, y, z));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: palette[lineIndex % palette.length],
        transparent: true,
        opacity: lineIndex % 3 === 0 ? 0.1 : 0.045,
      }),
    );
    group.add(line);
  }
  return group;
}

function createParticleField(count = 460) {
  const positions = new Float32Array(count * 3);
  const colorsArray = new Float32Array(count * 3);
  const palette = [new THREE.Color(colors.lime), new THREE.Color(colors.mint), new THREE.Color(colors.lavender)];

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 15;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[index * 3 + 2] = -1.8 + Math.random() * 4;
    const color = palette[index % palette.length];
    colorsArray[index * 3] = color.r;
    colorsArray[index * 3 + 1] = color.g;
    colorsArray[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colorsArray, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 0.032, transparent: true, opacity: 0.56, vertexColors: true }),
  );
}

function createConnection(color, opacity = 0.44, pointCount = 56) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pointCount * 3), 3));
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function updateConnection(line, from, to, bend = 0.4) {
  const positions = line.geometry.attributes.position;
  const midpoint = from.clone().lerp(to, 0.5);
  midpoint.y += bend;
  midpoint.z += Math.abs(bend) * 0.9;
  const curve = new THREE.QuadraticBezierCurve3(from, midpoint, to);
  curve.getPoints(positions.count - 1).forEach((point, index) => {
    positions.setXYZ(index, point.x, point.y, point.z);
  });
  positions.needsUpdate = true;
  return curve;
}

function createSignal(color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 12),
    new THREE.MeshBasicMaterial({ color }),
  );
}

function createPulseRing(radius, color, opacity) {
  return new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.022, 96),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide }),
  );
}

function createCompatibilityScene(canvas, labels, reason = "webgl-unavailable") {
  const shell = canvas?.closest(".constellation-shell");
  if (!shell) return { setScrollProgress() {} };

  canvas.hidden = true;
  shell.classList.add("constellation-shell--fallback");
  shell.dataset.renderer = "css-fallback";
  shell.dataset.rendererReason = reason;

  Object.entries(labels).forEach(([key, label]) => {
    if (!label) return;
    label.style.removeProperty("left");
    label.style.removeProperty("top");
    label.dataset.fallbackNode = key;
  });

  return {
    setScrollProgress(value) {
      shell.style.setProperty("--fallback-scroll", THREE.MathUtils.clamp(value, 0, 1).toFixed(3));
    },
  };
}

export function createConstellationScene(canvas, labels) {
  if (!canvas) return { setScrollProgress() {} };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  camera.position.set(0, 0, 14.6);

  let renderer;
  try {
    const context = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: "default",
    });
    if (!context) return createCompatibilityScene(canvas, labels);
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  } catch {
    return createCompatibilityScene(canvas, labels);
  }

  renderer.setClearColor(colors.ink, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(colors.white, 1.15));
  const keyLight = new THREE.PointLight(colors.lime, 24, 26);
  keyLight.position.set(2, 0, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(colors.mint, 3.2);
  fillLight.position.set(-5, 6, 8);
  scene.add(fillLight);

  const field = new THREE.Group();
  scene.add(field);
  const waveField = createWaveField();
  const particles = createParticleField();
  field.add(waveField, particles);

  const you = createNode(0.46, colors.mint, 3);
  const join = createNode(0.7, colors.ink, 3);
  const joinCore = createNode(0.22, colors.lime, 2);
  const joinRing = createPulseRing(0.9, colors.lime, 0.72);
  const joinRingOuter = createPulseRing(1.25, colors.mint, 0.24);
  field.add(you, join, joinCore, joinRing, joinRingOuter);

  const projects = [
    { key: "greenGrid", color: colors.lime, base: new THREE.Vector3(-2.75, 2.62, 0.2), phase: 0.2, bend: 0.75, speed: 0.13 },
    { key: "studyCircle", color: colors.lavender, base: new THREE.Vector3(3.55, 2.5, -0.1), phase: 1.5, bend: -0.68, speed: 0.105 },
    { key: "campusMobility", color: colors.coral, base: new THREE.Vector3(-3.72, 0.72, 0.05), phase: 2.75, bend: -0.82, speed: 0.118 },
    { key: "openLab", color: colors.lavender, base: new THREE.Vector3(-2.65, -2.65, -0.1), phase: 4.1, bend: 0.72, speed: 0.095 },
    { key: "localLens", color: colors.mint, base: new THREE.Vector3(3.25, -2.48, 0.18), phase: 5.2, bend: 0.64, speed: 0.11 },
  ];

  projects.forEach((project, index) => {
    project.mesh = createNode(0.18 + (index % 2) * 0.035, project.color, 2);
    project.connection = createConnection(project.color, 0.48, 62);
    project.signal = createSignal(project.color);
    field.add(project.connection, project.signal, project.mesh);
  });

  const youConnection = createConnection(colors.lime, 0.92, 72);
  const youSignal = createSignal(colors.lime);
  field.add(youConnection, youSignal);

  const timer = new THREE.Timer();
  timer.connect(document);
  const pointerTarget = { x: 0, y: 0 };
  let scrollProgress = 0;
  let pageVisible = true;
  let rendererAvailable = true;
  let animationFrameId;
  let compatibilityScene;
  let viewportWidth = 1;
  let viewportHeight = 1;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(Math.round(bounds.width), 1);
    const height = Math.max(Math.round(bounds.height), 1);
    if (width === viewportWidth && height === viewportHeight) return;

    viewportWidth = width;
    viewportHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function positionLabel(key, object) {
    const label = labels[key];
    if (!label) return;
    const projected = object.getWorldPosition(new THREE.Vector3()).project(camera);
    label.style.left = `${(projected.x * 0.5 + 0.5) * viewportWidth}px`;
    label.style.top = `${(-projected.y * 0.5 + 0.5) * viewportHeight}px`;
  }

  function updateScene(elapsed) {
    const motion = reduceMotion ? 0 : elapsed;
    const pull = THREE.MathUtils.smoothstep(scrollProgress, 0.12, 0.92) * 0.12;
    you.position.set(-1.7, -0.05 + Math.sin(motion * 0.8) * 0.06, 0.28);
    join.position.set(1.72, 0, 0.05);
    joinCore.position.copy(join.position);
    joinRing.position.copy(join.position);
    joinRingOuter.position.copy(join.position);
    const ringPulse = reduceMotion ? 1 : 1 + Math.sin(motion * 1.25) * 0.045;
    joinRing.scale.setScalar(ringPulse);
    joinRingOuter.scale.setScalar(1.04 + Math.sin(motion * 0.78 + 1) * 0.06);

    const directCurve = updateConnection(youConnection, you.position, join.position, 0.18);
    youSignal.position.copy(directCurve.getPointAt(reduceMotion ? 0.56 : (motion * 0.18) % 1));

    projects.forEach((project, index) => {
      const floatX = Math.sin(motion * 0.34 + project.phase) * 0.08;
      const floatY = Math.cos(motion * 0.48 + project.phase) * 0.11;
      const target = project.base.clone().lerp(join.position, pull);
      project.mesh.position.set(target.x + floatX, target.y + floatY, target.z);
      project.curve = updateConnection(project.connection, project.mesh.position, join.position, project.bend);
      const signalProgress = reduceMotion ? 0.55 : (motion * project.speed + index * 0.17) % 1;
      project.signal.position.copy(project.curve.getPointAt(signalProgress));
      const signalScale = 0.8 + Math.sin(motion * 2 + index) * 0.25;
      project.signal.scale.setScalar(reduceMotion ? 1 : signalScale);
      positionLabel(project.key, project.mesh);
    });

    positionLabel("you", you);
    positionLabel("join", join);
  }

  function render(timestamp) {
    if (!rendererAvailable) return;
    animationFrameId = requestAnimationFrame(render);
    if (!pageVisible) return;
    resize();
    timer.update(timestamp);
    const elapsed = timer.getElapsed();
    field.rotation.y += (pointerTarget.x * 0.085 - field.rotation.y) * 0.036;
    field.rotation.x += (pointerTarget.y * 0.05 - field.rotation.x) * 0.036;
    field.position.y = scrollProgress * 0.3;
    waveField.position.x = reduceMotion ? 0 : Math.sin(elapsed * 0.1) * 0.14;
    particles.rotation.y = reduceMotion ? 0 : elapsed * -0.009;
    updateScene(elapsed);
    try {
      renderer.render(scene, camera);
    } catch {
      activateCompatibilityScene("render-failed");
    }
  }

  function activateCompatibilityScene(reason) {
    if (!rendererAvailable) return;
    rendererAvailable = false;
    window.cancelAnimationFrame(animationFrameId);
    renderer.dispose();
    compatibilityScene = createCompatibilityScene(canvas, labels, reason);
    compatibilityScene.setScrollProgress(scrollProgress);
  }

  const shell = canvas.closest(".constellation-shell");
  shell?.addEventListener("pointermove", (event) => {
    const rect = shell.getBoundingClientRect();
    pointerTarget.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerTarget.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  shell?.addEventListener("pointerleave", () => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  });
  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
  });

  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      activateCompatibilityScene("context-lost");
    },
    { once: true },
  );

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  resize();
  updateScene(0);
  animationFrameId = requestAnimationFrame(render);

  return {
    setScrollProgress(value) {
      scrollProgress = THREE.MathUtils.clamp(value, 0, 1);
      compatibilityScene?.setScrollProgress(scrollProgress);
    },
  };
}
