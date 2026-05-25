import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MAP_IMAGE, defaultAssetByType } from "./arConfigSchema.js";
import { TARGET_ASPECT, clamp } from "./arCoordinates.js";
import { getActionPoint, getActionRotation } from "./arTimelineEngine.js";

const MARKER_ASSET = "/ar-assets/flag-marker.glb";

function mediaPathToUrl(filePath = "") {
  const cleanPath = String(filePath).trim().replace(/^["']|["']$/g, "");
  if (!cleanPath) return "";
  if (cleanPath.startsWith("/") || cleanPath.startsWith("http")) return cleanPath;
  return `/@fs/${encodeURI(cleanPath.replaceAll("\\", "/"))}`;
}

function mapPoint(point, fallbackZ = 0) {
  return new THREE.Vector3(
    Number(point?.x ?? 50) / 100 - 0.5,
    Number(point?.z ?? fallbackZ),
    (0.5 - Number(point?.y ?? 50) / 100) * TARGET_ASPECT
  );
}

function scenePointToPercent(point) {
  return {
    x: Number(clamp((point.x + 0.5) * 100).toFixed(1)),
    y: Number(clamp((0.5 - point.z / TARGET_ASPECT) * 100).toFixed(1)),
  };
}

function applyARRotation(object, rotation) {
  object.rotation.set(
    THREE.MathUtils.degToRad(rotation.x),
    THREE.MathUtils.degToRad(rotation.z),
    THREE.MathUtils.degToRad(rotation.y)
  );
}

function makeFallbackMarker(color = "#ef4444") {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.012, 0.08, 18),
    new THREE.MeshStandardMaterial({ color })
  );
  stem.position.y = 0.04;
  group.add(stem);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 24, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })
  );
  head.position.y = 0.09;
  group.add(head);
  return group;
}

function makeFallbackAction(type, color = "#facc15") {
  const group = new THREE.Group();
  if (type === "attack-arrow") {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
    );
    shaft.rotation.z = Math.PI / 2;
    group.add(shaft);
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.06, 18),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
    );
    head.position.x = 0.09;
    head.rotation.z = -Math.PI / 2;
    group.add(head);
    return group;
  }
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(type === "bomb-drop" ? 0.035 : 0.028, 24, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
  );
  group.add(body);
  return group;
}

function addPath(root, points, color, active = false, hitObjects = [], selectedPathIndex = -1) {
  if (!points || points.length < 2) return;
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => mapPoint(point, point.z ?? 0.04)));
  const line = new THREE.Line(geometry, material);
  line.position.y += active ? 0.018 : 0.01;
  root.add(line);
  points.forEach((point, index) => {
    const selected = active && selectedPathIndex === index;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(selected ? 0.026 : active ? 0.018 : 0.012, 16, 12),
      new THREE.MeshStandardMaterial({ color: selected ? 0xfacc15 : color, emissive: selected ? 0xfacc15 : color, emissiveIntensity: selected ? 0.9 : active ? 0.6 : 0.2 })
    );
    dot.position.copy(mapPoint(point, point.z ?? 0.04));
    dot.userData = { type: "path", pathIndex: index };
    root.add(dot);
    if (selected) addSelectionPulse(root, dot.position.clone(), 0xfacc15, 0.05);
    hitObjects.push(dot);
  });
}

function addSelectionPulse(root, position, color = 0xfacc15, radius = 0.08) {
  const group = new THREE.Group();
  group.position.copy(position);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.005, 12, 56),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.95,
    })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.42, 24, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  halo.position.y = radius * 0.18;
  group.add(halo);
  group.userData.pulse = true;
  root.add(group);
  return group;
}

function disposeObject(object) {
  object.traverse((item) => {
    item.geometry?.dispose?.();
    if (item.material) {
      const materials = Array.isArray(item.material) ? item.material : [item.material];
      materials.forEach((material) => {
        material.map?.dispose?.();
        material.dispose?.();
      });
    }
  });
}

export default function TimelineMap3DPreview({
  state,
  activeSegment,
  activeAction,
  selected,
  mapMode,
  playTime,
  onSelect,
  onPlacePoint,
  onUpdateMarker,
  onUpdateAction,
  onUpdateActionTransform,
}) {
  const hostRef = useRef(null);
  const rotatePadRef = useRef(null);
  const cameraStateRef = useRef({
    position: [0.15, 1.25, 1.35],
    target: [0, 0.02, 0],
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    const camera = new THREE.PerspectiveCamera(44, 1, 0.01, 20);
    camera.position.fromArray(cameraStateRef.current.position);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.fromArray(cameraStateRef.current.target);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(0.45, 1.2, 0.65);
    scene.add(sun);

    const root = new THREE.Group();
    scene.add(root);
    const hitObjects = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dragPoint = new THREE.Vector3();
    let dragTarget = null;

    const axes = new THREE.AxesHelper(0.34);
    axes.position.set(-0.43, 0.035, -0.43 * TARGET_ASPECT);
    root.add(axes);
    const makeAxisLabel = (text, color, position) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      context.fillStyle = color;
      context.font = "700 34px Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 64, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
      sprite.position.copy(position);
      sprite.scale.set(0.09, 0.045, 1);
      root.add(sprite);
    };
    makeAxisLabel("X", "#ef4444", new THREE.Vector3(-0.08, 0.035, -0.43 * TARGET_ASPECT));
    makeAxisLabel("Cao", "#22c55e", new THREE.Vector3(-0.43, 0.36, -0.43 * TARGET_ASPECT));
    makeAxisLabel("Y map", "#38bdf8", new THREE.Vector3(-0.43, 0.035, (-0.43 * TARGET_ASPECT) + 0.34));

    new THREE.TextureLoader().load(MAP_IMAGE, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const map = new THREE.Mesh(
        new THREE.PlaneGeometry(1, TARGET_ASPECT),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      map.rotation.x = Math.PI / 2;
      map.userData = { type: "map" };
      root.add(map);
      hitObjects.push(map);
    });

    const loader = new GLTFLoader();
    const addModel = (path, fallback, setup) => {
      const normalizedPath = path ? mediaPathToUrl(path) : "";
      if (!normalizedPath) {
        setup(fallback());
        return;
      }
      loader.load(normalizedPath, (gltf) => setup(gltf.scene), undefined, () => setup(fallback()));
    };

    (state.markers || []).forEach((marker) => {
      addModel(MARKER_ASSET, () => makeFallbackMarker(marker.color), (object) => {
        const isActive = selected?.kind === "marker" && selected.markerId === marker.id;
        object.position.copy(mapPoint(marker, marker.z || 0.02));
        object.position.y += 0.05;
        object.scale.setScalar(0.035 * Number(marker.scale || 0.35));
        root.add(object);
        if (isActive) {
          object.traverse((child) => {
            if (child.material?.emissive) {
              child.material = child.material.clone();
              child.material.emissive.set(0xfacc15);
              child.material.emissiveIntensity = 0.45;
            }
          });
        }
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.06 * Math.max(1, Number(marker.scale || 0.35)), 16, 12),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
        );
        hit.position.copy(object.position);
        hit.userData = { type: "marker", markerId: marker.id };
        root.add(hit);
        hitObjects.push(hit);
        if (isActive) {
          const pulsePosition = mapPoint(marker, marker.z || 0.02);
          pulsePosition.y += 0.025;
          addSelectionPulse(root, pulsePosition, 0xfacc15, 0.07);
        }
      });
    });

    (activeSegment?.actions || []).forEach((action, actionIndex) => {
      const isSelected = selected?.kind === "action" && selected.actionIndex === actionIndex;
      const isPlaying = playTime >= Number(action.startAt || 0) && playTime <= Number(action.startAt || 0) + Number(action.duration || 0);
      const marker = state.markers?.find((item) => item.id === action.pointId);
      const elapsed = Math.max(0, playTime - Number(action.startAt || 0));
      const point = isPlaying || isSelected ? getActionPoint(action, marker, elapsed) : action.position || marker;
      const transform = action.transform || {};
      const color = isSelected ? 0xfacc15 : action.type === "airplane" ? 0x38bdf8 : action.type === "bomb-drop" ? 0xf97316 : 0x22c55e;

      addPath(
        root,
        action.path || [],
        isSelected ? 0xfacc15 : 0x22c55e,
        isSelected,
        isSelected ? hitObjects : [],
        selected?.kind === "path" && selected.actionIndex === actionIndex ? selected.pathIndex : -1
      );
      if (!point || (!isSelected && !isPlaying && action.type !== "highlight-marker" && action.type !== "open-video-marker")) return;

      const position = {
        ...point,
        x: Number(point.x || 50) + Number(transform.offsetX || 0),
        y: Number(point.y || 50) + Number(transform.offsetY || 0),
        z: Number(point.z || transform.z || 0.08) + Number(transform.offsetZ || 0),
      };
      const assetPath = action.assetPath || defaultAssetByType[action.type] || "";
      addModel(assetPath, () => makeFallbackAction(action.type, color), (object) => {
        const rotation = getActionRotation(action, elapsed);
        const isSelectedAction = selected?.kind === "action" && selected.actionIndex === actionIndex;
        object.position.copy(mapPoint(position, transform.z || 0.08));
        object.scale.setScalar(0.03 * Number(transform.scale || 1));
        applyARRotation(object, rotation);
        root.add(object);
        if (isSelectedAction) {
          object.traverse((child) => {
            if (child.material?.emissive) {
              child.material = child.material.clone();
              child.material.emissive.set(0xfacc15);
              child.material.emissiveIntensity = 0.5;
            }
          });
          const pulsePosition = object.position.clone();
          pulsePosition.y += 0.015;
          addSelectionPulse(root, pulsePosition, 0xfacc15, 0.085 * Math.max(1, Number(transform.scale || 1)));
        }
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 * Math.max(1, Number(transform.scale || 1)), 16, 12),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
        );
        hit.position.copy(object.position);
        hit.userData = { type: "action", actionIndex };
        root.add(hit);
        hitObjects.push(hit);
      });
    });

    const setPointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const placeFromEvent = (event) => {
      setPointer(event);
      if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return null;
      return scenePointToPercent(dragPoint);
    };

    const updateDraggedTarget = (event) => {
      if (!dragTarget) return;
      const point = placeFromEvent(event);
      if (!point) return;
      if (dragTarget.type === "marker") {
        onUpdateMarker?.(dragTarget.markerId, { x: point.x, y: point.y });
      }
      if (dragTarget.type === "action") {
        const action = activeSegment?.actions?.[dragTarget.actionIndex];
        onUpdateAction?.(selected.segmentIndex, dragTarget.actionIndex, {
          position: { ...(action?.position || {}), x: point.x, y: point.y },
        });
      }
      if (dragTarget.type === "path") {
        const nextPath = [...(activeAction?.path || [])];
        nextPath[dragTarget.pathIndex] = { ...nextPath[dragTarget.pathIndex], x: point.x, y: point.y };
        onUpdateAction?.(selected.segmentIndex, selected.actionIndex, { path: nextPath });
      }
    };

    const handlePointerDown = (event) => {
      setPointer(event);
      const hit = raycaster.intersectObjects(hitObjects, true)[0]?.object;
      if (!hit) return;
      const userData = hit.userData || {};
      event.preventDefault();
      if (userData.type === "marker") {
        onSelect?.({ kind: "marker", markerId: userData.markerId });
        dragTarget = userData;
        controls.enabled = false;
        renderer.domElement.setPointerCapture?.(event.pointerId);
        return;
      }
      if (userData.type === "action") {
        onSelect?.({ kind: "action", actionIndex: userData.actionIndex });
        dragTarget = userData;
        controls.enabled = false;
        renderer.domElement.setPointerCapture?.(event.pointerId);
        return;
      }
      if (userData.type === "path") {
        onSelect?.({ kind: "path", pathIndex: userData.pathIndex });
        dragTarget = userData;
        controls.enabled = false;
        renderer.domElement.setPointerCapture?.(event.pointerId);
        return;
      }
      if (userData.type === "map") {
        const point = placeFromEvent(event);
        if (point) onPlacePoint?.(point);
      }
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
      const width = host.clientWidth || 720;
      const height = host.clientHeight || 560;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    renderer.setAnimationLoop(() => {
      const time = performance.now() * 0.004;
      root.traverse((object) => {
        if (object.userData?.pulse) {
          const scale = 1 + Math.sin(time) * 0.16;
          object.scale.setScalar(scale);
        }
      });
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      cameraStateRef.current = {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      disposeObject(scene);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [activeAction, activeSegment, mapMode, onPlacePoint, onSelect, onUpdateAction, onUpdateMarker, playTime, selected, state]);

  const canRotate = selected?.kind === "action" && activeAction;
  const rotationX = Number(activeAction?.transform?.rotationX || 0);
  const rotationY = Number(activeAction?.transform?.rotationY || 0);
  const rotationZ = Number(activeAction?.transform?.rotationZ || 0);
  const changeRotation = (field, delta) => {
    const current = Number(activeAction?.transform?.[field] || 0);
    onUpdateActionTransform?.(field, current + delta);
  };
  const patchSelectedActionTransform = (patch) => {
    if (!activeAction || selected?.kind !== "action") return;
    onUpdateAction?.(selected.segmentIndex, selected.actionIndex, {
      transform: { ...(activeAction.transform || {}), ...patch },
    });
  };
  const levelSelectedActionOnMap = () => {
    patchSelectedActionTransform({
      rotationX: -90,
      rotationY: 0,
      rotationZ: activeAction.type === "airplane" ? 45 : rotationZ,
    });
  };
  const startRotateDrag = (event) => {
    if (!activeAction) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    rotatePadRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotationX,
      rotationZ,
    };
  };
  const moveRotateDrag = (event) => {
    const drag = rotatePadRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    onUpdateActionTransform?.("rotationZ", Number((drag.rotationZ + dx * 0.45).toFixed(1)));
    onUpdateActionTransform?.("rotationX", Number((drag.rotationX - dy * 0.45).toFixed(1)));
  };
  const stopRotateDrag = (event) => {
    rotatePadRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-sm ring-1 ring-slate-200">
      <div ref={hostRef} className="h-[760px] min-h-[620px]" />
      <div className="pointer-events-none absolute left-4 top-4 max-w-sm rounded-xl border border-white/10 bg-slate-950/85 p-3 text-white shadow-xl backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">Bản đồ chỉnh sửa 3D</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          Mặt phẳng bản đồ giữ đúng tỉ lệ target AR. Kéo mốc hoặc asset để chỉnh X/Y; chỉnh Z, xoay và kích thước ở bảng thông số.
        </p>
      </div>
      {canRotate ? (
        <div className="absolute right-4 top-4 w-72 rounded-xl border border-white/10 bg-slate-950/88 p-3 text-white shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">Xoay asset trên bản đồ</p>
              <p className="mt-1 text-xs text-slate-300">Các nút này cập nhật thẳng vào thông số asset.</p>
            </div>
            <button
              type="button"
              className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black text-white"
              onClick={() => patchSelectedActionTransform({ rotationX: 0, rotationY: 0, rotationZ: 0 })}
            >
              Reset
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {[
              ["rotationX", "X", rotationX],
              ["rotationY", "Y", rotationY],
              ["rotationZ", "Z", rotationZ],
            ].map(([field, label, value]) => (
              <div key={field} className="grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2">
                <span className="text-xs font-black text-slate-300">{label}</span>
                <button type="button" className="rounded-lg bg-white px-2 py-2 text-xs font-black text-slate-950" onClick={() => changeRotation(field, -5)}>
                  -5°
                </button>
                <button type="button" className="rounded-lg bg-white px-2 py-2 text-xs font-black text-slate-950" onClick={() => changeRotation(field, 5)}>
                  +5°
                </button>
                <span className="rounded-lg bg-white/10 px-2 py-2 text-center text-xs font-black text-white">{Number(value).toFixed(0)}°</span>
              </div>
            ))}
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Kéo để xoay asset"
            onPointerDown={startRotateDrag}
            onPointerMove={moveRotateDrag}
            onPointerUp={stopRotateDrag}
            onPointerCancel={stopRotateDrag}
            className="mt-3 grid h-36 touch-none place-items-center rounded-xl border border-white/15 bg-white/8 text-center text-xs font-bold text-slate-200"
          >
            <div>
              <div className="mx-auto mb-2 h-9 w-9 rounded-full border-2 border-amber-300 bg-amber-300/20 shadow-lg shadow-amber-300/20" />
              <p>Kéo trong ô này để xoay trực tiếp model</p>
              <p className="mt-1 text-[11px] text-slate-400">Ngang: xoay Z | Dọc: xoay X</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="rounded-lg bg-amber-300 px-2 py-2 text-xs font-black text-slate-950" onClick={levelSelectedActionOnMap}>
              Nằm trên bản đồ
            </button>
            <button type="button" className="rounded-lg bg-white/10 px-2 py-2 text-xs font-black text-white" onClick={() => patchSelectedActionTransform({ rotationX: 0, rotationY: 0 })}>
              Đứng thẳng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
