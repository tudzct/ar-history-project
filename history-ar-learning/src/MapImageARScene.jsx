import { useRef, useState } from "react";
import { CONFIG_URL, MAP_IMAGE, defaultAssetByType, normalizeConfig } from "./arConfigSchema.js";
import { resolveActionMapPose, segmentDuration } from "./arTimelineEngine.js";
import {
  modelRotationToAFrame,
  percentToAFramePosition,
  yawToAFrameRotation,
} from "./arSpace.js";

const TARGET_MIND = "/ar-targets/dien_bien_phu_map.mind";
const DEFAULT_MARKER_ASSET = "/ar-assets/marker.glb";
const TABLETOP_TRACKING_OPTIONS = [
  "filterMinCF: 0.0001",
  "filterBeta: 0.001",
  "warmupTolerance: 10",
  "missTolerance: 30",
].join("; ");

const scripts = [
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image.prod.js",
  "https://aframe.io/releases/1.2.0/aframe.min.js",
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image-aframe.prod.js",
];

let scriptPromise;

function escapeAttr(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function mediaPathToUrl(filePath = "") {
  const cleanPath = String(filePath).trim().replace(/^["']|["']$/g, "");
  if (!cleanPath) return "";
  if (cleanPath.startsWith("/") || cleanPath.startsWith("http")) return cleanPath;
  return `/@fs/${encodeURI(cleanPath.replaceAll("\\", "/"))}`;
}

function loadScript(src) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Cannot load ${src}`));
    document.head.appendChild(script);
  });
}

function loadMindARScripts() {
  if (!scriptPromise) {
    scriptPromise = scripts.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve());
  }
  return scriptPromise;
}

async function loadArConfig() {
  const response = await fetch(`${CONFIG_URL}?t=${Date.now()}`);
  if (!response.ok) throw new Error("Không tải được cấu hình timeline AR");
  return normalizeConfig(await response.json());
}

function markerMarkup(marker, calibration) {
  const position = percentToAFramePosition(marker, calibration, marker.z || 0.02);
  const color = marker.color || "#ef4444";
  const scale = Number(marker.scale || 0.35);
  const modelScale = 0.035 * scale;
  const ringInnerRadius = 0.03 * Math.max(0.4, scale);
  const ringOuterRadius = 0.045 * Math.max(0.4, scale);

  // Hạ toàn bộ phần hiển thị của marker xuống gần mặt map.
  // Parent marker vẫn là điểm neo thật.
  // Chỉ visual bên trong bị hạ xuống.
  const visualOffsetZ = Number(marker.visualOffsetZ ?? -0.045);

  return `
    <a-entity
      class="hotspot marker-root"
      data-point="${escapeAttr(marker.id)}"
      position="${position}"
    >
      <a-entity class="marker-visual" position="0 0 ${visualOffsetZ.toFixed(3)}">
        <a-sphere
          class="hotspot"
          data-point="${escapeAttr(marker.id)}"
          radius="${(0.08 * Math.max(1, scale)).toFixed(3)}"
          position="0 0 0.06"
          material="opacity: 0; transparent: true"
        ></a-sphere>

        <a-ring
          id="marker-ring-${escapeAttr(marker.id)}"
          class="hotspot marker-ring"
          data-point="${escapeAttr(marker.id)}"
          radius-inner="${ringInnerRadius.toFixed(3)}"
          radius-outer="${ringOuterRadius.toFixed(3)}"
          position="0 0 0.004"
          color="${color}"
          opacity="0.85"
        ></a-ring>

        <a-entity
          class="hotspot"
          data-point="${escapeAttr(marker.id)}"
          gltf-model="${DEFAULT_MARKER_ASSET}"
          position="0 0 0.055"
          rotation="90 0 0"
          scale="${modelScale.toFixed(3)} ${modelScale.toFixed(3)} ${modelScale.toFixed(3)}"
        ></a-entity>
      </a-entity>
    </a-entity>
  `;
}

function calibrationGuideMarkup(calibration = {}) {
  if (!calibration.showGuides) return "";
  const guides = [
    { id: "goc-tren-trai", label: "Goc tren trai", x: 0, y: 0, color: "#ef4444" },
    { id: "goc-tren-phai", label: "Goc tren phai", x: 100, y: 0, color: "#22c55e" },
    { id: "goc-duoi-phai", label: "Goc duoi phai", x: 100, y: 100, color: "#38bdf8" },
    { id: "goc-duoi-trai", label: "Goc duoi trai", x: 0, y: 100, color: "#f97316" },
    { id: "tam-ban-do", label: "Tam", x: 50, y: 50, color: "#facc15" },
  ];
  return guides.map((guide) => `
    <a-entity position="${percentToAFramePosition({ x: guide.x, y: guide.y, z: 0.018 }, calibration, 0.018)}">
      <a-ring radius-inner="0.018" radius-outer="0.027" color="${guide.color}" opacity="0.95"
        animation="property: scale; from: 0.9 0.9 0.9; to: 1.5 1.5 1.5; dur: 650; dir: alternate; loop: true"></a-ring>
      <a-text value="${guide.label}" align="center" width="0.55" position="0 0 0.055" color="#ffffff"></a-text>
    </a-entity>
  `).join("");
}

function localAxesMarkup(enabled = false) {
  if (!enabled) return "";
  return `
    <a-cylinder radius="0.003" height="0.18" color="#ff0000" position="0.09 0 0" rotation="0 0 90"></a-cylinder>
    <a-cylinder radius="0.003" height="0.18" color="#00ff00" position="0 0.09 0"></a-cylinder>
    <a-cylinder radius="0.003" height="0.18" color="#0000ff" position="0 0 0.09" rotation="90 0 0"></a-cylinder>
  `;
}

function actionMarkup(action, marker, index, calibration) {
  const transform = action.transform || {};
  const pose = resolveActionMapPose(action, marker, 0, calibration);
  const position = percentToAFramePosition(pose.position, calibration, transform.z || 0.08);
  const id = `timeline-action-${index}`;
  const modelId = `timeline-action-model-${index}`;
  const assetPath = action.assetPath || defaultAssetByType[action.type] || "";
  const scale = Number(pose.scale || 1);
  const yawRotation = yawToAFrameRotation(pose.yaw);
  const modelRotation = modelRotationToAFrame(pose.modelRotation);
  const axes = localAxesMarkup(Boolean(transform.showLocalAxes));
  const label = action.label ? `<a-text value="${escapeAttr(action.label)}" align="center" width="0.7" position="0 0 0.12" color="#ffffff"></a-text>` : "";

  if (assetPath) {
    return `
      <a-entity id="${id}" class="timeline-action timeline-action-root" data-action-index="${index}" visible="false" position="${position}" rotation="${yawRotation}" scale="${scale} ${scale} ${scale}">
        <a-entity id="${modelId}" class="timeline-action-model" rotation="${modelRotation}">
          <a-entity gltf-model="${escapeAttr(mediaPathToUrl(assetPath))}" scale="0.03 0.03 0.03"></a-entity>
          ${axes}
        </a-entity>
        ${action.type === "bomb-drop" ? `<a-sphere class="bomb-flash" radius="0.045" color="#fb923c" opacity="0.85" position="0 0 -0.02" animation="property: scale; from: 0.5 0.5 0.5; to: 2 2 2; dur: 500; dir: alternate; loop: true"></a-sphere>` : ""}
        ${label}
      </a-entity>
    `;
  }

  if (action.type === "attack-arrow") {
    return `
      <a-entity id="${id}" class="timeline-action timeline-action-root" data-action-index="${index}" visible="false" position="${position}" rotation="${yawRotation}" scale="${scale} ${scale} ${scale}">
        <a-entity id="${modelId}" class="timeline-action-model" rotation="${modelRotation}">
          <a-cylinder radius="0.008" height="0.14" position="0 0.07 0" color="#22c55e"></a-cylinder>
          <a-cone radius-bottom="0.028" radius-top="0" height="0.06" position="0 0.16 0" color="#22c55e"></a-cone>
          ${axes}
        </a-entity>
        ${label}
      </a-entity>
    `;
  }

  if (action.type === "bomb-drop") {
    return `
      <a-entity id="${id}" class="timeline-action timeline-action-root" data-action-index="${index}" visible="false" position="${position}" rotation="${yawRotation}" scale="${scale} ${scale} ${scale}">
        <a-entity id="${modelId}" class="timeline-action-model" rotation="${modelRotation}">
          <a-sphere radius="0.035" color="#f97316" opacity="0.9" animation="property: scale; from: 0.4 0.4 0.4; to: 2.2 2.2 2.2; dur: 520; dir: alternate; loop: true"></a-sphere>
          ${axes}
        </a-entity>
        ${label}
      </a-entity>
    `;
  }

  return `
    <a-entity id="${id}" class="timeline-action timeline-action-root" data-action-index="${index}" visible="false" position="${position}" rotation="${yawRotation}" scale="${scale} ${scale} ${scale}">
      <a-entity id="${modelId}" class="timeline-action-model" rotation="${modelRotation}">
        <a-ring radius-inner="0.045" radius-outer="0.06" color="#facc15" opacity="0.9"
          animation="property: scale; from: 0.8 0.8 0.8; to: 1.7 1.7 1.7; dur: 700; dir: alternate; loop: true"></a-ring>
        <a-sphere radius="0.014" position="0 0 0.04" color="#facc15"></a-sphere>
        ${axes}
      </a-entity>
      ${label}
    </a-entity>
  `;
}

function flattenActions(config) {
  return config.segments.flatMap((segment, segmentIndex) =>
    (segment.actions || []).map((action, actionIndex) => ({ ...action, segmentIndex, actionIndex }))
  );
}

function buildScene(targetUrl, config) {
  const actions = flattenActions(config);
  return `
    <a-scene
      mindar-image="imageTargetSrc: ${targetUrl}; autoStart: true; uiScanning: yes; uiLoading: yes; ${TABLETOP_TRACKING_OPTIONS}"
      color-space="sRGB"
      renderer="colorManagement: true; physicallyCorrectLights: true; antialias: true; alpha: true"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      embedded
    >
      <a-assets timeout="30000">
        <img id="mapTargetImage" src="${MAP_IMAGE}" />
      </a-assets>
      <a-camera
        position="0 0 0"
        look-controls="enabled: false"
        cursor="rayOrigin: mouse; fuse: false"
        raycaster="objects: .hotspot; far: 100"
      ></a-camera>
      <a-entity light="type: ambient; color: #ffffff; intensity: 1.4"></a-entity>
      <a-entity light="type: directional; color: #ffffff; intensity: 1.2" position="0 1 1"></a-entity>
      <a-entity light="type: directional; color: #ffffff; intensity: 0.8" position="0 -1 1"></a-entity>
      <a-entity id="timelineTarget" mindar-image-target="targetIndex: 0">
        ${calibrationGuideMarkup(config.calibration)}
        ${config.markers.map((marker) => markerMarkup(marker, config.calibration)).join("")}
        ${actions.map((action, index) => actionMarkup(action, config.markers.find((marker) => marker.id === action.pointId), index, config.calibration)).join("")}
      </a-entity>
    </a-scene>
  `;
}

export default function MapImageARScene() {
  const sceneHostRef = useRef(null);
  const sceneRef = useRef(null);
  const screenPickHandlerRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const configRef = useRef(null);
  const actionListRef = useRef([]);
  const segmentIndexRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState({ title: "Bản đồ AR", detail: "Bấm Start AR rồi quét bản đồ in." });
  const [activeVideo, setActiveVideo] = useState(null);
  const [highlightMarkerLabel, setHighlightMarkerLabel] = useState("");
  const [loading, setLoading] = useState({ active: false, title: "", note: "", progress: 0, error: "" });

  const clearTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    audioRef.current?.pause();
  };

  const setMarkerHighlight = (markerId) => {
    const markerLabel = configRef.current?.markers?.find((marker) => marker.id === markerId)?.label;
    setHighlightMarkerLabel(markerLabel || markerId || "");
    const scene = sceneRef.current;
    scene?.querySelectorAll(".marker-ring").forEach((ring) => {
      ring.removeAttribute("animation");
      ring.setAttribute("opacity", "0.85");
      ring.setAttribute("color", ring.getAttribute("color") || "#facc15");
    });
    if (!markerId) return;
    const ring = Array.from(scene?.querySelectorAll(".marker-ring") || []).find((item) => item.id === `marker-ring-${markerId}`);
    if (ring) {
      ring.setAttribute("color", "#facc15");
      ring.setAttribute("opacity", "1");
      ring.setAttribute("animation", "property: scale; from: 1 1 1; to: 1.8 1.8 1.8; dur: 700; dir: alternate; loop: true");
    }
  };

  const updateActions = (segment, elapsed) => {
    const scene = sceneRef.current;
    const config = configRef.current;
    if (!scene || !config || !segment) return;
    const actions = actionListRef.current;
    actions.forEach((action, globalIndex) => {
      const entity = scene.querySelector(`#timeline-action-${globalIndex}`);
      if (!entity) return;
      const isCurrentSegment = action.segmentIndex === segmentIndexRef.current;
      const start = Number(action.startAt || 0);
      const duration = Math.max(0.1, Number(action.duration || 1));
      const visible = isCurrentSegment && elapsed >= start && elapsed <= start + duration;
      entity.setAttribute("visible", visible);
      if (!visible) return;
      const marker = config.markers.find((item) => item.id === action.pointId);
      const localElapsed = elapsed - start;
      const transform = action.transform || {};
      const pose = resolveActionMapPose(action, marker, localElapsed, config.calibration);
          if (action.type === "airplane") {
      console.log("AIRPLANE POSE", {
        id: action.id,
        yaw: pose.yaw,
        modelRotation: pose.modelRotation,
        transform: action.transform,
      });
      }
      entity.setAttribute("position", percentToAFramePosition(pose.position, config.calibration, transform.z || 0.08));
      entity.setAttribute("rotation", yawToAFrameRotation(pose.yaw));
      entity.setAttribute("scale", `${pose.scale} ${pose.scale} ${pose.scale}`);
      const modelEntity = scene.querySelector(`#timeline-action-model-${globalIndex}`);
      modelEntity?.setAttribute("rotation", modelRotationToAFrame(pose.modelRotation));
    });
  };

  const playSegment = async (index = 0) => {
    const config = configRef.current;
    const segment = config?.segments?.[index];
    if (!segment) return;
    clearTimer();
    segmentIndexRef.current = index;
    setMarkerHighlight("");
    if (!audioRef.current) audioRef.current = new Audio();
    if (segment.audioPath) {
      audioRef.current.src = mediaPathToUrl(segment.audioPath);
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
      } catch {
        // Mobile browsers may still require a fresh user gesture; actions continue as visual guidance.
      }
    }
    const startedAt = performance.now();
    updateActions(segment, 0);
    timerRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      updateActions(segment, elapsed);
      if (elapsed >= segmentDuration(segment)) {
        clearTimer();
        updateActions(segment, segmentDuration(segment) + 1);
        setMarkerHighlight(segment.nextMarkerId);
      }
    }, 80);
  };

  const selectPoint = (pointId) => {
    const config = configRef.current;
    const marker = config?.markers?.find((item) => item.id === pointId);
    if (!marker) return;
    setSelected({
      title: marker.label || marker.id,
      detail: marker.videoPath ? "Mốc này có video. Đóng video để tiếp tục mạch thuyết minh." : "Đang chọn mốc trên bản đồ.",
    });
    if (marker.videoPath) {
      setActiveVideo({
        title: marker.label || marker.id,
        src: mediaPathToUrl(marker.videoPath),
        pointId: marker.id,
      });
    }
  };

  const removeScreenPicker = () => {
    const host = sceneHostRef.current;
    const handler = screenPickHandlerRef.current;
    if (!host || !handler) return;
    host.removeEventListener("pointerup", handler);
    host.removeEventListener("touchend", handler);
    screenPickHandlerRef.current = null;
  };

  const attachScreenPicker = () => {
    const host = sceneHostRef.current;
    const scene = sceneRef.current;
    const AFRAME = window.AFRAME;
    if (!host || !scene || !AFRAME?.THREE) return;
    removeScreenPicker();
    const raycaster = new AFRAME.THREE.Raycaster();
    const pointer = new AFRAME.THREE.Vector2();
    const handler = (event) => {
      if (event.target.closest?.("button,a,video")) return;
      const touch = event.changedTouches?.[0];
      const clientX = touch?.clientX ?? event.clientX;
      const clientY = touch?.clientY ?? event.clientY;
      if (clientX == null || clientY == null || !scene.camera) return;
      const rect = host.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const targets = [];
      scene.object3D.traverse((object) => {
        if (object.el?.classList?.contains("hotspot")) targets.push(object);
      });
      raycaster.setFromCamera(pointer, scene.camera);
      const hit = raycaster.intersectObjects(targets, true).find((item) => item.object.el?.dataset?.point);
      const pointId = hit?.object.el?.dataset?.point;
      if (!pointId) return;
      event.preventDefault();
      event.stopPropagation();
      selectPoint(pointId);
    };
    host.addEventListener("pointerup", handler);
    host.addEventListener("touchend", handler, { passive: false });
    screenPickHandlerRef.current = handler;
  };

  const startMindAR = async () => {
    if (running) return;
    setRunning(true);
    setLoading({ active: true, title: "Đang tải AR", note: "Đang nạp MindAR và cấu hình", progress: 10, error: "" });
    try {
      await loadMindARScripts();
      const config = await loadArConfig();
      console.table(
        config.segments.flatMap((segment) =>
          (segment.actions || []).map((action) => ({
            id: action.id,
            type: action.type,
            yawOffset: action.transform?.yawOffset,
            modelRotationX: action.transform?.modelRotationX,
            modelRotationY: action.transform?.modelRotationY,
            modelRotationZ: action.transform?.modelRotationZ,
            followPathRotation: action.transform?.followPathRotation,
            showLocalAxes: action.transform?.showLocalAxes,
          }))
        )
      );
      configRef.current = config;
      actionListRef.current = flattenActions(config);
      setLoading({ active: true, title: "Đang mở camera", note: "Hãy cho phép quyền camera khi trình duyệt hỏi", progress: 90, error: "" });
      sceneHostRef.current.innerHTML = buildScene(TARGET_MIND, config);
      sceneRef.current = sceneHostRef.current.querySelector("a-scene");
      sceneRef.current.addEventListener("arReady", () => setLoading((prev) => ({ ...prev, active: false, progress: 100 })));
      sceneRef.current.addEventListener("loaded", attachScreenPicker);
      sceneRef.current.addEventListener("targetFound", () => playSegment(0));
      sceneRef.current.querySelector("#timelineTarget")?.addEventListener("targetFound", () => playSegment(0));
      sceneRef.current.addEventListener("arError", () => {
        setLoading({ active: true, title: "Không mở được camera", note: "Hãy dùng HTTPS và kiểm tra quyền camera", progress: 100, error: "camera" });
      });
      sceneHostRef.current.querySelectorAll(".hotspot").forEach((hotspot) => {
        const pointId = hotspot.dataset.point;
        const handler = (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectPoint(pointId);
        };
        hotspot.addEventListener("click", handler);
        hotspot.addEventListener("pointerup", handler);
        hotspot.addEventListener("touchend", handler, { passive: false });
      });
    } catch (error) {
      setLoading({ active: true, title: "Không khởi động được AR", note: error?.message || "Hãy tải lại trang và thử lại", progress: 100, error: "start" });
      setRunning(false);
    }
  };

  const stopMindAR = async () => {
    removeScreenPicker();
    clearTimer();
    const scene = sceneRef.current;
    if (scene?.systems?.["mindar-image-system"]) {
      await scene.systems["mindar-image-system"].stop();
    }
    if (sceneHostRef.current) sceneHostRef.current.innerHTML = "";
    sceneRef.current = null;
    setRunning(false);
    setMarkerHighlight("");
    setLoading({ active: false, title: "", note: "", progress: 0, error: "" });
  };

  const closeVideo = () => {
    const pointId = activeVideo?.pointId;
    setActiveVideo(null);
    const config = configRef.current;
    const marker = config?.markers?.find((item) => item.id === pointId);
    const currentIndex = segmentIndexRef.current;
    const nextIndex = Math.min(currentIndex + 1, (config?.segments?.length || 1) - 1);
    const shouldContinue = pointId && config?.segments?.[currentIndex]?.nextMarkerId === pointId && nextIndex !== currentIndex;
    setSelected({
      title: marker?.label || pointId || "Bản đồ AR",
      detail: shouldContinue ? "Đã xem xong video. Đang tiếp tục mạch thuyết minh." : "Đã xem xong video tại mốc này.",
    });
    if (shouldContinue) {
      playSegment(nextIndex);
    }
  };

  return (
    <div
      className={`overflow-hidden bg-slate-950 ${
        running
          ? "fixed inset-0 z-[9999] min-h-[100dvh] rounded-none"
          : "relative min-h-[560px] rounded-[1.5rem]"
      }`}
    >
      {!running ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">MindAR image tracking</p>
            <h4 className="mt-3 text-3xl font-black">Quét bản đồ lịch sử 2D</h4>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Bấm Start AR, cho phép camera, rồi hướng điện thoại vào bản đồ in. Điện thoại sẽ đọc cấu hình mới nhất đã lưu từ editor.
            </p>
          </div>
        </div>
      ) : null}

      <div ref={sceneHostRef} className="ar-scene-host absolute inset-0 z-0" />

      {loading.active ? (
        <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-slate-950/72 p-6 text-white backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-slate-950/85 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">MindAR</p>
                <h4 className="mt-2 text-xl font-black">{loading.title}</h4>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full border border-amber-200/30 bg-amber-300/15 text-sm font-black text-amber-200">
                {loading.progress}%
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all duration-300 ${loading.error ? "bg-red-400" : "bg-amber-300"}`} style={{ width: `${loading.progress}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{loading.note}</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 right-4 z-30 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-950 shadow-lg backdrop-blur">
          <p className="text-sm font-black">{selected.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {highlightMarkerLabel ? `Mốc tiếp theo đang sáng: ${highlightMarkerLabel}. ` : ""}
            {selected.detail}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={MAP_IMAGE} target="_blank" rel="noreferrer" className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-slate-100">
            Bản đồ target
          </a>
          <button type="button" onClick={running ? stopMindAR : startMindAR} className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-200">
            {running ? "Dừng AR" : "Bắt đầu AR + voice"}
          </button>
          {running ? (
            <button type="button" onClick={() => playSegment(segmentIndexRef.current)} className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-emerald-300">
              Phát lại voice
            </button>
          ) : null}
        </div>
      </div>

      {activeVideo ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/78 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Video diễn biến</p>
                <h4 className="mt-1 text-xl font-black">{activeVideo.title}</h4>
              </div>
              <button type="button" onClick={closeVideo} className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20">
                Đóng
              </button>
            </div>
            <video key={activeVideo.src} src={activeVideo.src} className="aspect-video w-full bg-black" controls autoPlay playsInline />
          </div>
        </div>
      ) : null}
    </div>
  );
}
