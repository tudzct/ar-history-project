import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function makeLabel(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 512;
  canvas.height = 128;

  context.fillStyle = "rgba(15, 23, 42, 0.88)";
  context.roundRect(12, 18, 488, 92, 24);
  context.fill();
  context.fillStyle = "#f8fafc";
  context.font = "700 34px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.75, 0.44, 1);
  return sprite;
}

function makePath(points, color) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 48, 0.035, 10, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.45,
  });
  return new THREE.Mesh(geometry, material);
}

export default function HistoryARScene() {
  const hostRef = useRef(null);
  const rendererRef = useRef(null);
  const [arSupported, setArSupported] = useState(false);
  const [arMessage, setArMessage] = useState("3D preview");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    rendererRef.current = renderer;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.2, 0);

    const ambient = new THREE.HemisphereLight(0xf8fafc, 0x475569, 1.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(4, 7, 3);
    sun.castShadow = true;
    scene.add(sun);

    const terrain = new THREE.Group();
    scene.add(terrain);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.75, 3.1, 0.35, 96),
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 })
    );
    base.receiveShadow = true;
    terrain.add(base);

    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(2.28, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        roughness: 0.85,
        metalness: 0.02,
      })
    );
    bowl.scale.set(1, 0.22, 0.82);
    bowl.position.y = 0.14;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    terrain.add(bowl);

    const strongholds = [
      ["A1", -0.85, 0.58, -0.45, 0xf97316],
      ["Him Lam", 0.7, 0.46, -0.8, 0xfacc15],
      ["Muong Thanh", 0.08, 0.54, 0.48, 0xef4444],
    ];

    strongholds.forEach(([label, x, y, z, color]) => {
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 0.42, 32),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
      );
      marker.position.set(x, y, z);
      marker.castShadow = true;
      terrain.add(marker);

      const labelSprite = makeLabel(label);
      labelSprite.position.set(x, y + 0.55, z);
      terrain.add(labelSprite);
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.025, 12, 96),
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xfb923c,
        emissiveIntensity: 0.5,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.62;
    terrain.add(ring);

    terrain.add(
      makePath(
        [
          new THREE.Vector3(-2.15, 0.34, 1.55),
          new THREE.Vector3(-1.25, 0.48, 0.72),
          new THREE.Vector3(-0.25, 0.58, 0.35),
          new THREE.Vector3(0.45, 0.55, 0.15),
        ],
        0x22c55e
      )
    );
    terrain.add(
      makePath(
        [
          new THREE.Vector3(2.0, 0.34, -1.45),
          new THREE.Vector3(1.1, 0.45, -0.9),
          new THREE.Vector3(0.35, 0.55, -0.2),
          new THREE.Vector3(-0.25, 0.58, 0.08),
        ],
        0xfacc15
      )
    );

    const grid = new THREE.GridHelper(6, 12, 0x64748b, 0x334155);
    grid.position.y = -0.18;
    scene.add(grid);

    const resize = () => {
      const width = host.clientWidth || 640;
      const height = host.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    renderer.setAnimationLoop(() => {
      terrain.rotation.y += 0.0025;
      controls.update();
      renderer.render(scene, camera);
    });

    if (navigator.xr) {
      navigator.xr
        .isSessionSupported("immersive-ar")
        .then((supported) => {
          setArSupported(supported);
          setArMessage(supported ? "WebXR AR ready" : "3D preview");
        })
        .catch(() => setArMessage("3D preview"));
    }

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
      rendererRef.current = null;
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
    };
  }, []);

  const startAR = async () => {
    const renderer = rendererRef.current;
    if (!renderer || !navigator.xr) return;

    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        optionalFeatures: ["local-floor", "bounded-floor", "dom-overlay"],
        domOverlay: { root: document.body },
      });
      await renderer.xr.setSession(session);
      setArMessage("AR session running");
      session.addEventListener("end", () => setArMessage("WebXR AR ready"));
    } catch {
      setArMessage("AR needs a compatible mobile browser");
    }
  };

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[1.5rem] bg-slate-950">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          Dien Bien Phu
        </p>
        <p className="mt-1 text-sm text-slate-200">{arMessage}</p>
      </div>
      <button
        type="button"
        onClick={startAR}
        disabled={!arSupported}
        className="absolute bottom-4 right-4 rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
      >
        Start AR
      </button>
    </div>
  );
}
