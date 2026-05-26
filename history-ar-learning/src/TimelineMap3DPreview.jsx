import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MAP_IMAGE, defaultAssetByType } from "./arConfigSchema.js";
import { TARGET_ASPECT } from "./arCoordinates.js";
import { getActionPoint, resolveActionMapPose } from "./arTimelineEngine.js";
import {
  modelRotationToThreeEuler,
  percentToThreeVector,
  threeVectorToPercent,
  yawToThreeEuler,
} from "./arSpace.js";

const MARKER_ASSET = "/ar-assets/marker.glb";

function mediaPathToUrl(filePath = "") {
  const cleanPath = String(filePath).trim().replace(/^["']|["']$/g, "");
  if (!cleanPath) return "";
  if (cleanPath.startsWith("/") || cleanPath.startsWith("http")) return cleanPath;
  return `/@fs/${encodeURI(cleanPath.replaceAll("\\", "/"))}`;
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

function addPath(root, points, color, active = false, hitObjects = [], selectedPathIndex = -1, calibration = {}) {
  if (!points || points.length < 2) return;
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => percentToThreeVector(point, calibration, point.z ?? 0.04)));
  const line = new THREE.Line(geometry, material);
  line.position.y += active ? 0.018 : 0.01;
  root.add(line);
  points.forEach((point, index) => {
    const selected = active && selectedPathIndex === index;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(selected ? 0.026 : active ? 0.018 : 0.012, 16, 12),
      new THREE.MeshStandardMaterial({ color: selected ? 0xfacc15 : color, emissive: selected ? 0xfacc15 : color, emissiveIntensity: selected ? 0.9 : active ? 0.6 : 0.2 })
    );
    dot.position.copy(percentToThreeVector(point, calibration, point.z ?? 0.04));
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
  const resetViewRef = useRef(null);
  const cameraStateRef = useRef({
    position: [0, 1.35, 0.08],
    target: [0, 0, 0],
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
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05;
    resetViewRef.current = () => {
      camera.position.set(0, 1.35, 0.08);
      controls.target.set(0, 0, 0);
      cameraStateRef.current = {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
      controls.update();
    };

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
    const calibration = state.calibration || {};

    new THREE.TextureLoader().load(MAP_IMAGE, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Source JPG is stored 90 degrees left; show it in the same orientation as the .mind target.
      texture.center.set(0.5, 0.5);
      texture.rotation = -Math.PI / 2;
      const map = new THREE.Mesh(
        new THREE.PlaneGeometry(1, TARGET_ASPECT),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
      );
      map.rotation.x = -Math.PI / 2;
      map.renderOrder = -10;
      map.userData = { type: "map" };
      root.add(map);
      hitObjects.push(map);
    });
    const border = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.5, 0.004, -TARGET_ASPECT / 2),
        new THREE.Vector3(0.5, 0.004, -TARGET_ASPECT / 2),
        new THREE.Vector3(0.5, 0.004, TARGET_ASPECT / 2),
        new THREE.Vector3(-0.5, 0.004, TARGET_ASPECT / 2),
        new THREE.Vector3(-0.5, 0.004, -TARGET_ASPECT / 2),
      ]),
      new THREE.LineBasicMaterial({ color: 0xfacc15 })
    );
    root.add(border);

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
        object.position.copy(percentToThreeVector(marker, calibration, marker.z || 0.02));
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
          const pulsePosition = percentToThreeVector(marker, calibration, marker.z || 0.02);
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
        selected?.kind === "path" && selected.actionIndex === actionIndex ? selected.pathIndex : -1,
        calibration
      );
      if (!point || (!isSelected && !isPlaying && action.type !== "highlight-marker" && action.type !== "open-video-marker")) return;

      const assetPath = action.assetPath || defaultAssetByType[action.type] || "";
      addModel(assetPath, () => makeFallbackAction(action.type, color), (object) => {
        const pose = resolveActionMapPose(action, marker, elapsed, calibration);
        const isSelectedAction = selected?.kind === "action" && selected.actionIndex === actionIndex;
        const rootObject = new THREE.Group();
        rootObject.position.copy(percentToThreeVector(pose.position, calibration, transform.z || 0.08));
        rootObject.rotation.copy(yawToThreeEuler(pose.yaw));
        rootObject.scale.setScalar(pose.scale);
        object.rotation.copy(modelRotationToThreeEuler(pose.modelRotation));
        object.scale.setScalar(assetPath ? 0.03 : 1);
        rootObject.add(object);
        root.add(rootObject);
        if (isSelectedAction) {
          object.traverse((child) => {
            if (child.material?.emissive) {
              child.material = child.material.clone();
              child.material.emissive.set(0xfacc15);
              child.material.emissiveIntensity = 0.5;
            }
          });
          const pulsePosition = rootObject.position.clone();
          pulsePosition.y += 0.015;
          addSelectionPulse(root, pulsePosition, 0xfacc15, 0.085 * Math.max(1, Number(transform.scale || 1)));
        }
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 * Math.max(1, Number(transform.scale || 1)), 16, 12),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
        );
        hit.position.copy(rootObject.position);
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
      return threeVectorToPercent(dragPoint, calibration);
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
      resetViewRef.current = null;
    };
  }, [activeAction, activeSegment, mapMode, onPlacePoint, onSelect, onUpdateAction, onUpdateMarker, playTime, selected, state]);

  const canRotate = selected?.kind === "action" && activeAction;
  const yawOffset = Number(activeAction?.transform?.yawOffset ?? activeAction?.transform?.rotationZ ?? 0);
  const modelRotationX = Number(activeAction?.transform?.modelRotationX ?? activeAction?.transform?.rotationX ?? 0);
  const modelRotationY = Number(activeAction?.transform?.modelRotationY ?? activeAction?.transform?.rotationY ?? 0);
  const modelRotationZ = Number(activeAction?.transform?.modelRotationZ ?? 0);
  const changeRotation = (field, delta) => {
    const current = Number(activeAction?.transform?.[field] || 0);
    onUpdateActionTransform?.(field, current + delta);
  };
  const startRotateDrag = (event) => {
    if (!activeAction) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    rotatePadRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      modelRotationX,
      yawOffset,
    };
  };
  const moveRotateDrag = (event) => {
    const drag = rotatePadRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    onUpdateActionTransform?.("yawOffset", Number((drag.yawOffset + dx * 0.45).toFixed(1)));
    onUpdateActionTransform?.("modelRotationX", Number((drag.modelRotationX - dy * 0.45).toFixed(1)));
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
      <button
        type="button"
        className="absolute bottom-4 left-4 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-lg"
        onClick={() => resetViewRef.current?.()}
      >
        Nhìn từ trên
      </button>
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
              onClick={() => {
                onUpdateActionTransform?.("yawOffset", 0);
                onUpdateActionTransform?.("modelRotationX", 0);
                onUpdateActionTransform?.("modelRotationY", 0);
                onUpdateActionTransform?.("modelRotationZ", 0);
              }}
            >
              Reset
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {[
              ["yawOffset", "Yaw", yawOffset],
              ["modelRotationX", "Model X", modelRotationX],
              ["modelRotationY", "Model Y", modelRotationY],
              ["modelRotationZ", "Model Z", modelRotationZ],
            ].map(([field, label, value]) => (
              <div key={field} className="grid grid-cols-[58px_1fr_1fr_52px] items-center gap-2">
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
              <p className="mt-1 text-[11px] text-slate-400">Ngang: yaw | Dọc: model X</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="rounded-lg bg-amber-300 px-2 py-2 text-xs font-black text-slate-950" onClick={() => onUpdateActionTransform?.("modelRotationX", -90)}>
              Nằm trên bản đồ
            </button>
            <button type="button" className="rounded-lg bg-white/10 px-2 py-2 text-xs font-black text-white" onClick={() => onUpdateActionTransform?.("modelRotationX", 0)}>
              Đứng thẳng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
