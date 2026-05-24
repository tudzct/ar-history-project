import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MAP_IMAGE } from "./arTimelineConfig.js";

const defaultAssetByType = {
  "attack-arrow": "/ar-assets/attack-arrow.glb",
  airplane: "/ar-assets/airplane.glb",
  "open-point": "/ar-assets/flag-marker.glb",
  "show-label": "/ar-assets/flag-marker.glb",
};

function parsePair(value) {
  if (!value) return null;
  const [x, y] = String(value).split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function mapPoint(point) {
  return new THREE.Vector3(point.x / 100 - 0.5, 0.03, point.y / 100 - 0.5);
}

function scenePointToPercent(point) {
  return {
    x: Number(Math.max(0, Math.min(100, (point.x + 0.5) * 100)).toFixed(1)),
    y: Number(Math.max(0, Math.min(100, (point.z + 0.5) * 100)).toFixed(1)),
  };
}

function pairValue(point) {
  return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
}

function mediaPathToUrl(filePath = "") {
  const cleanPath = String(filePath).trim().replace(/^["']|["']$/g, "");
  if (!cleanPath) return "";
  if (cleanPath.startsWith("/") || cleanPath.startsWith("http")) return cleanPath;
  return `/@fs/${encodeURI(cleanPath.replaceAll("\\", "/"))}`;
}

function pathPoints(action) {
  const points = Array.isArray(action?.path) ? action.path.map(parsePair).filter(Boolean) : [];
  const from = parsePair(action?.from);
  const to = parsePair(action?.to);
  return points.length >= 2 ? points : from && to ? [from, to] : points;
}

function pointOnPath(points, progress) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const length = Math.hypot(next.x - point.x, next.y - point.y);
    return { point, next, length };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0) || 1;
  let distance = Math.max(0, Math.min(1, progress)) * total;
  for (const segment of segments) {
    if (distance <= segment.length) {
      const local = segment.length ? distance / segment.length : 0;
      return {
        x: segment.point.x + (segment.next.x - segment.point.x) * local,
        y: segment.point.y + (segment.next.y - segment.point.y) * local,
      };
    }
    distance -= segment.length;
  }
  return points[points.length - 1];
}

function makeFallbackMarker(color) {
  const group = new THREE.Group();
  const pin = new THREE.Mesh(
    new THREE.ConeGeometry(0.025, 0.09, 24),
    new THREE.MeshStandardMaterial({ color })
  );
  pin.rotation.x = Math.PI;
  pin.position.y = 0.08;
  group.add(pin);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 24, 16),
    new THREE.MeshStandardMaterial({ color })
  );
  head.position.y = 0.14;
  group.add(head);
  return group;
}

function makePath(points, color) {
  const group = new THREE.Group();
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = mapPoint(points[index]);
    const end = mapPoint(points[index + 1]);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, length, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
    );
    cylinder.position.copy(mid);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(cylinder);
  }
  const end = mapPoint(points[points.length - 1]);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.025, 0.06, 20),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
  );
  cone.position.copy(end);
  cone.position.y += 0.015;
  cone.rotation.x = Math.PI / 2;
  group.add(cone);
  return group;
}

export default function TimelineMap3DPreview({
  state,
  activeAction,
  activeMarkerId,
  playTime,
  onSelectMarker,
  onUpdateMarker,
  onUpdateAction,
}) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10);
    camera.position.set(0.1, 1.1, 1.25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(0.5, 1, 0.6);
    scene.add(sun);

    const root = new THREE.Group();
    scene.add(root);
    const interactiveObjects = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dragPoint = new THREE.Vector3();
    let dragTarget = null;

    new THREE.TextureLoader().load(MAP_IMAGE, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const map = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1.05),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      map.rotation.x = -Math.PI / 2;
      root.add(map);
    });

    const loader = new GLTFLoader();
    const addModel = (path, fallback, setup) => {
      if (!path) {
        setup(fallback());
        return;
      }
      loader.load(
        path,
        (gltf) => setup(gltf.scene),
        undefined,
        () => setup(fallback())
      );
    };

    (state.markers || []).forEach((marker) => {
      addModel("/ar-assets/flag-marker.glb", () => makeFallbackMarker(marker.color || "#ef4444"), (object) => {
        object.position.copy(mapPoint(marker));
        object.position.y = 0.07;
        const scale = 0.08 * Number(marker.markerScale || 1);
        object.scale.setScalar(scale);
        root.add(object);
      });
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.055 * Number(marker.markerScale || 1), 16, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      hit.position.copy(mapPoint(marker));
      hit.position.y = 0.12;
      hit.userData = { type: "marker", markerId: marker.id };
      root.add(hit);
      interactiveObjects.push(hit);
    });

    (state.timeline || []).forEach((segment) => {
      (segment.actions || []).forEach((action) => {
        const from = parsePair(action.from);
        const to = parsePair(action.to);
        const points = action.path?.length ? action.path.map(parsePair).filter(Boolean) : from && to ? [from, to] : [];
        if (points.length >= 2) {
          root.add(makePath(points, action.color || "#ef4444"));
        }
      });
    });

    if (activeAction) {
      const points = pathPoints(activeAction);
      const position = parsePair(activeAction.position);
      const marker = state.markers?.find((item) => item.id === activeAction.pointId);
      const progress = Math.max(0, Math.min(1, (playTime - Number(activeAction.at || 0)) / Math.max(0.1, Number(activeAction.duration || 1))));
      const point = points.length >= 2 ? pointOnPath(points, progress) : position || marker;
      if (point) {
        const color = activeAction.color || "#facc15";
        const active = new THREE.Mesh(
          new THREE.TorusGeometry(0.06, 0.006, 12, 64),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55 })
        );
        active.position.copy(mapPoint(point));
        active.position.y = 0.075;
        active.rotation.x = Math.PI / 2;
        root.add(active);

        const assetPath = activeAction.assetPath || defaultAssetByType[activeAction.type] || "";
        addModel(assetPath ? mediaPathToUrl(assetPath) : "", () => makeFallbackMarker(color), (object) => {
          object.position.copy(mapPoint(point));
          object.position.y = 0.14;
          const scale = 0.08 * Number(activeAction.scale || 1);
          object.scale.setScalar(scale);
          object.rotation.set(
            THREE.MathUtils.degToRad(Number(activeAction.rotationX || 0)),
            THREE.MathUtils.degToRad(Number(activeAction.rotationY || 0)),
            THREE.MathUtils.degToRad(Number(activeAction.rotationZ ?? activeAction.rotation ?? 0))
          );
          root.add(object);
        });
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.075 * Number(activeAction.scale || 1), 16, 12),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
        );
        hit.position.copy(mapPoint(point));
        hit.position.y = 0.14;
        hit.userData = { type: "action" };
        root.add(hit);
        interactiveObjects.push(hit);
      }
    }

    const setPointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const activePathIndex = () => {
      const points = Array.isArray(activeAction?.path) ? activeAction.path.map(parsePair).filter(Boolean) : [];
      if (!points.length) return -1;
      const progress = Math.max(0, Math.min(1, (playTime - Number(activeAction.at || 0)) / Math.max(0.1, Number(activeAction.duration || 1))));
      return Math.max(0, Math.min(points.length - 1, Math.round(progress * (points.length - 1))));
    };

    const updateDraggedTarget = (event) => {
      if (!dragTarget) return;
      setPointer(event);
      if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;
      const nextPoint = scenePointToPercent(dragPoint);

      if (dragTarget.type === "marker") {
        onSelectMarker?.(dragTarget.markerId);
        onUpdateMarker?.(dragTarget.markerId, "x", nextPoint.x);
        onUpdateMarker?.(dragTarget.markerId, "y", nextPoint.y);
        return;
      }

      if (dragTarget.type === "action") {
        const pathIndex = activePathIndex();
        if (pathIndex >= 0) {
          const nextPath = [...(activeAction.path || [])];
          nextPath[pathIndex] = pairValue(nextPoint);
          onUpdateAction?.("path", nextPath);
          return;
        }
        onUpdateAction?.("position", pairValue(nextPoint));
      }
    };

    const handlePointerDown = (event) => {
      setPointer(event);
      const hit = raycaster.intersectObjects(interactiveObjects, true)[0]?.object;
      if (!hit) return;
      event.preventDefault();
      dragTarget = hit.userData;
      controls.enabled = false;
      renderer.domElement.setPointerCapture?.(event.pointerId);
      updateDraggedTarget(event);
    };

    const handlePointerMove = (event) => {
      if (!dragTarget) return;
      event.preventDefault();
      updateDraggedTarget(event);
    };

    const handlePointerUp = (event) => {
      dragTarget = null;
      controls.enabled = true;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

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
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.dispose();
      host.removeChild(renderer.domElement);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        }
      });
    };
  }, [activeAction, onSelectMarker, onUpdateAction, onUpdateMarker, playTime, state]);

  const marker = state.markers?.find((item) => item.id === activeMarkerId);
  const actionScale = Number(activeAction?.scale || 1);
  const rotationZ = Number(activeAction?.rotationZ ?? activeAction?.rotation ?? 0);

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950">
      <div ref={hostRef} className="h-[420px]" />
      <div className="absolute left-3 top-3 grid max-w-[calc(100%-1.5rem)] gap-2 rounded-2xl border border-white/10 bg-slate-950/85 p-3 text-white shadow-xl backdrop-blur">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
            Size animation
            <input
              type="range"
              min="0.1"
              max="8"
              step="0.1"
              value={actionScale}
              onChange={(event) => onUpdateAction?.("scale", Number(event.target.value))}
              className="w-36 accent-amber-300"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
            Huong Z
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotationZ}
              onChange={(event) => {
                onUpdateAction?.("rotationZ", Number(event.target.value));
                onUpdateAction?.("rotation", Number(event.target.value));
              }}
              className="w-36 accent-amber-300"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
            Size moc
            <input
              type="range"
              min="0.2"
              max="5"
              step="0.1"
              value={marker?.markerScale ?? 1}
              onChange={(event) => marker && onUpdateMarker?.(marker.id, "markerScale", Number(event.target.value))}
              className="w-36 accent-amber-300"
            />
          </label>
        </div>
        <p className="text-xs font-semibold text-slate-300">
          Keo coc 3D de doi vi tri moc. Keo asset dang chon de doi vi tri animation/waypoint hien tai.
        </p>
      </div>
    </div>
  );
}
