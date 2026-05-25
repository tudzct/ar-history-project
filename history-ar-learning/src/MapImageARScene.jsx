import { useCallback, useRef, useState } from "react";

const TARGET_IMAGE = "/ar-targets/dien_bien_phu_map.jpg";
const TARGET_MIND = "/ar-targets/dien_bien_phu_map.mind";
const TARGET_WIDTH = 1419;
const TARGET_HEIGHT = 1491;
const TARGET_ASPECT = 1491 / 1419;
const POINT_OFFSET = [0, 0];
const CONFIG_URL = "/ar-config/ar-timeline-config.json";

const scripts = [
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image.prod.js",
  "https://aframe.io/releases/1.2.0/aframe.min.js",
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image-aframe.prod.js",
];

const defaultAssetByType = {
  "attack-arrow": "/ar-assets/attack-arrow.glb",
  airplane: "/ar-assets/airplane.glb",
  "open-point": "/ar-assets/flag-marker.glb",
  "show-label": "/ar-assets/flag-marker.glb",
};
const DEFAULT_MARKER_ASSET = "/ar-assets/flag-marker.glb";
const SECURE_CAMERA_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const pointVideos = {
  "him-lam": {
    title: "Tran danh Him Lam",
    videoPath: "D:\\ghichep_monhoc\\Ky2_nam3\\CDKHMT\\HimLam\\HimLam(Moc_1).mp4",
  },
  "thanh-minh": {
    title: "Doi Doc Lap va Ban Keo",
    videoPath:
      "D:\\ghichep_monhoc\\Ky2_nam3\\CDKHMT\\Đồi Độc Lập và Bản kéo\\Đồi Độc Lập và Bản kéo(moc_2).mp4",
  },
  "ta-leng": {
    title: "San bay Muong Thanh",
    videoPath:
      "D:\\ghichep_monhoc\\Ky2_nam3\\CDKHMT\\Sân bay Mường Thanh\\Sân bay Mường Thanh(Moc_3)_.mp4",
  },
  "tan-thanh": {
    title: "San bay Muong Thanh",
    videoPath:
      "D:\\ghichep_monhoc\\Ky2_nam3\\CDKHMT\\Sân bay Mường Thanh\\Sân bay Mường Thanh(Moc_3)_.mp4",
  },
  "muong-thanh": {
    title: "Khu trung tam",
    videoPath:
      "D:\\ghichep_monhoc\\Ky2_nam3\\CDKHMT\\Khu trung tam(moc_5)\\Khu trung tam(moc_5)-1.mp4",
  },
};

const fallbackPoints = [
  {
    id: "him-lam",
    title: "Him Lam",
    detail: "Khu vuc trung tam tren ban do, co the gan noi dung lich su va diem tham quan.",
    pixel: [620, 865],
    offset: [-0.045, 0.016],
    color: "#ef4444",
  },
  {
    id: "muong-thanh",
    title: "Muong Thanh",
    detail: "Vi tri noi bat o khu vuc phia tay nam ban do, phu hop lam point goc cho bai hoc.",
    pixel: [392, 1125],
    offset: [-0.035, 0.038],
    color: "#f59e0b",
  },
  {
    id: "tan-thanh",
    title: "Tan Thanh",
    detail: "Diem nam gan trung tam duong noi do thi, co the dung de mo thong tin dia danh.",
    pixel: [451, 1018],
    offset: [-0.055, 0.018],
    color: "#8b5cf6",
  },
  {
    id: "thanh-minh",
    title: "Thanh Minh",
    detail: "Khu vuc phia dong bac cua ban do, dung lam point mo rong cho lop thong tin dia ly.",
    pixel: [985, 562],
    offset: [-0.12, -0.025],
    color: "#22c55e",
  },
  {
    id: "ta-leng",
    title: "Ta Leng",
    detail: "Khu vuc phia dong nam, co the gan mo ta dia hinh va lien ket den bai hoc lien quan.",
    pixel: [1175, 1042],
    offset: [-0.16, 0.012],
    color: "#38bdf8",
  },
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

function cameraSecurityIssue() {
  if (typeof window === "undefined") return "";
  if (window.isSecureContext || SECURE_CAMERA_HOSTS.has(window.location.hostname)) return "";

  return `Camera bi chan vi trang dang chay bang ${window.location.protocol}//${window.location.host}. Hay chay npm run dev:https va mo lai bang HTTPS.`;
}

function cameraSupportIssue() {
  if (typeof navigator === "undefined") return "";
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Trinh duyet nay khong ho tro getUserMedia. Hay mo bang Safari hoac Chrome moi nhat.";
  }
  return "";
}

async function loadArConfig() {
  const response = await fetch(`${CONFIG_URL}?t=${Date.now()}`);
  if (!response.ok) throw new Error("Cannot load AR timeline config");
  const config = await response.json();
  return {
    markers: config.markers?.length ? config.markers : fallbackPoints.map((point) => ({
      id: point.id,
      label: point.title,
      x: (point.pixel[0] / TARGET_WIDTH) * 100,
      y: (point.pixel[1] / TARGET_HEIGHT) * 100,
      color: point.color,
    })),
    timeline: config.timeline || [],
  };
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

function pixelToAR([x, y], offset = [0, 0], z = 0) {
  const arX = x / TARGET_WIDTH - 0.5 + POINT_OFFSET[0] + offset[0];
  const arY = (0.5 - y / TARGET_HEIGHT) * TARGET_ASPECT + POINT_OFFSET[1] + offset[1];
  return `${arX.toFixed(3)} ${arY.toFixed(3)} ${z}`;
}

function percentToAR(x, y, z = 0) {
  const arX = x / 100 - 0.5 + POINT_OFFSET[0];
  const arY = (0.5 - y / 100) * TARGET_ASPECT + POINT_OFFSET[1];
  return `${arX.toFixed(3)} ${arY.toFixed(3)} ${z}`;
}

function pointToAR(point, calibration = {}, z = 0) {
  const scaleX = Number(calibration.scaleX ?? 1);
  const scaleY = Number(calibration.scaleY ?? 1);
  const offsetX = Number(calibration.offsetX ?? 0);
  const offsetY = Number(calibration.offsetY ?? 0);
  const normalizedX = (point.x - 50) * scaleX + 50 + offsetX;
  const normalizedY = (point.y - 50) * scaleY + 50 + offsetY;
  return percentToAR(normalizedX, normalizedY, z);
}

function parsePair(value) {
  if (!value) return null;
  const [x, y] = value.split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
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

function pathAngle(points, progress) {
  if (points.length < 2) return 0;
  const ahead = pointOnPath(points, Math.min(1, progress + 0.01));
  const behind = pointOnPath(points, Math.max(0, progress - 0.01));
  if (!ahead || !behind) return 0;
  return Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * (180 / Math.PI);
}

function hotspotMarkup(point) {
  const position = point.pixel ? pixelToAR(point.pixel, point.offset) : pointToAR(point, point.calibration);
  const color = point.color || "#ef4444";
  const title = point.title || point.label || point.id;
  const markerAsset = mediaPathToUrl(point.markerAssetPath || DEFAULT_MARKER_ASSET);
  const markerScale = Number(point.markerScale || 1);
  const ringInnerRadius = 0.028 * markerScale;
  const ringOuterRadius = 0.038 * markerScale;
  const modelScale = 0.035 * markerScale;
  const hitRadius = 0.06 * Math.max(1, markerScale);
  return `
    <a-entity class="hotspot" data-point="${point.id}" position="${position}">
      <a-sphere
        class="hotspot"
        data-point="${point.id}"
        radius="${hitRadius.toFixed(3)}"
        position="0 0 0.06"
        material="opacity: 0; transparent: true"
      ></a-sphere>
      <a-ring
        class="hotspot"
        data-point="${point.id}"
        radius-inner="${ringInnerRadius.toFixed(3)}"
        radius-outer="${ringOuterRadius.toFixed(3)}"
        position="0 0 0.004"
        color="${color}"
        opacity="0.8"
      ></a-ring>
      <a-entity
        class="hotspot"
        data-point="${point.id}"
        gltf-model="${escapeAttr(markerAsset)}"
        position="0 0 0.055"
        rotation="90 0 0"
        scale="${modelScale.toFixed(3)} ${modelScale.toFixed(3)} ${modelScale.toFixed(3)}"
      ></a-entity>
      <a-text
        value="${escapeAttr(title)}"
        align="center"
        width="0.7"
        position="0 0 0.13"
        rotation="0 0 0"
        color="#ffffff"
      ></a-text>
    </a-entity>
  `;
}

function actionMarkup(action, markers, index, calibration = {}) {
  const marker = markers.find((item) => item.id === action.pointId) || markers[0];
  const actionPosition = parsePair(action.position);
  const points = pathPoints(action);
  const position = points[0] ? pointToAR(points[0], calibration, 0.08) : actionPosition ? pointToAR(actionPosition, calibration, 0.08) : pointToAR(marker, calibration, 0.08);
  const color = action.color || marker?.color || "#ef4444";
  const id = `timeline-action-${index}`;
  const label = escapeAttr(action.label || "");
  const labelMarkup = label ? `<a-text value="${label}" align="center" width="0.7" position="0 0 0.12" color="#ffffff"></a-text>` : "";
  const assetPath = action.assetPath || defaultAssetByType[action.type] || "";
  const rotation = Number(action.rotation || 0);
  const rotationX = Number(action.rotationX || 0);
  const rotationY = Number(action.rotationY || 0);
  const rotationZ = Number(action.rotationZ ?? action.rotation ?? 0);
  const scale = Number(action.scale || 1);

  if (assetPath) {
    return `
      <a-entity id="${id}" class="timeline-action" data-action-index="${index}" visible="false" position="${position}">
        <a-entity gltf-model="${escapeAttr(mediaPathToUrl(assetPath))}" scale="${0.03 * scale} ${0.03 * scale} ${0.03 * scale}" rotation="${90 + rotationX} ${rotationY} ${rotationZ}"></a-entity>
        ${labelMarkup}
      </a-entity>
    `;
  }

  if (action.type === "attack-arrow") {
    return `
      <a-entity id="${id}" class="timeline-action" data-action-index="${index}" visible="false" position="${position}" rotation="0 0 ${rotation}" scale="${scale} ${scale} ${scale}">
        <a-cylinder radius="0.008" height="0.12" position="0 0 0" rotation="90 0 0" color="${color}"></a-cylinder>
        <a-cone radius-bottom="0.025" radius-top="0" height="0.055" position="0 0.075 0" rotation="90 0 0" color="${color}"></a-cone>
        ${labelMarkup}
      </a-entity>
    `;
  }

  if (action.type === "airplane") {
    return `
      <a-entity id="${id}" class="timeline-action" data-action-index="${index}" visible="false" position="${position}" rotation="0 0 ${rotation}" scale="${scale} ${scale} ${scale}">
        <a-cone radius-bottom="0.025" radius-top="0.006" height="0.12" rotation="0 0 -90" color="${color}"></a-cone>
        <a-box width="0.11" height="0.012" depth="0.025" position="0 0 0" color="#e5e7eb"></a-box>
        ${labelMarkup}
      </a-entity>
    `;
  }

  if (action.type === "explosion" || action.type === "bomb-drop") {
    return `
      <a-entity id="${id}" class="timeline-action" data-action-index="${index}" visible="false" position="${position}" rotation="0 0 ${rotation}" scale="${scale} ${scale} ${scale}">
        <a-sphere radius="0.035" color="${color}" opacity="0.85"
          animation="property: scale; from: 0.4 0.4 0.4; to: 2.4 2.4 2.4; dur: 600; dir: alternate; loop: true"></a-sphere>
        ${labelMarkup}
      </a-entity>
    `;
  }

  if (action.type === "hand-guide") {
    return `
      <a-entity id="${id}" class="timeline-action" data-action-index="${index}" visible="false" position="${position}" rotation="0 0 ${rotation}" scale="${scale} ${scale} ${scale}">
        <a-sphere radius="0.026" color="${color}" animation="property: position; dir: alternate; dur: 500; loop: true; to: 0 0 0.05"></a-sphere>
        <a-cone radius-bottom="0.025" radius-top="0.006" height="0.08" position="0 0.04 -0.03" rotation="45 0 0" color="${color}"></a-cone>
        ${labelMarkup}
      </a-entity>
    `;
  }

  return `
    <a-entity id="${id}" class="timeline-action" data-action-index="${index}" visible="false" position="${position}" rotation="0 0 ${rotation}" scale="${scale} ${scale} ${scale}">
      <a-ring radius-inner="0.045" radius-outer="0.055" position="0 0 0" color="${color}" opacity="0.85"
        animation="property: scale; from: 0.8 0.8 0.8; to: 1.8 1.8 1.8; dur: 700; dir: alternate; loop: true"></a-ring>
      <a-sphere radius="0.014" position="0 0 0.04" color="${color}"></a-sphere>
      ${labelMarkup}
    </a-entity>
  `;
}

function flattenActions(timeline) {
  return timeline.flatMap((segment) =>
    (segment.actions || []).map((action) => ({
      ...action,
      segmentTitle: segment.title,
      audioPath: segment.audioPath,
      autoPlayAfterStart: segment.autoPlayAfterStart,
      waitForPointClose: segment.waitForPointClose,
    }))
  );
}

function buildScene(targetUrl, config) {
  const actions = flattenActions(config.timeline);
  return `
    <a-scene
      mindar-image="imageTargetSrc: ${targetUrl}; autoStart: true; uiScanning: yes; uiLoading: yes; filterMinCF: 0.0001; filterBeta: 1; warmupTolerance: 8; missTolerance: 20"
      color-space="sRGB"
      renderer="colorManagement: true; physicallyCorrectLights: true; antialias: true; alpha: true"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      embedded
    >
      <a-assets timeout="30000">
        <img id="mapTargetImage" src="${TARGET_IMAGE}" />
      </a-assets>

      <a-camera
        position="0 0 0"
        look-controls="enabled: false"
        cursor="rayOrigin: mouse; fuse: false"
        raycaster="objects: .hotspot; far: 100"
      ></a-camera>

      <a-entity id="timelineTarget" mindar-image-target="targetIndex: 0">
        ${config.markers.map((marker) => hotspotMarkup({ ...marker, calibration: config.calibration })).join("")}
        ${actions.map((action, index) => actionMarkup(action, config.markers, index, config.calibration)).join("")}
      </a-entity>
    </a-scene>
  `;
}

export default function MapImageARScene() {
  const sceneHostRef = useRef(null);
  const sceneRef = useRef(null);
  const screenPickHandlerRef = useRef(null);
  const timelineTimerRef = useRef(null);
  const timelineStartedRef = useRef(false);
  const playedVoiceIdsRef = useRef(new Set());
  const arConfigRef = useRef(null);
  const actionListRef = useRef([]);
  const audioRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const [loading, setLoading] = useState({
    active: false,
    title: "",
    note: "",
    progress: 0,
    error: "",
  });
  const [activeVideo, setActiveVideo] = useState(null);
  const [running, setRunning] = useState(false);

  const selectPoint = (pointId) => {
    const marker = arConfigRef.current?.markers?.find((item) => item.id === pointId);
    const point = marker
      ? { id: marker.id, title: marker.label, detail: `Dang chon moc ${marker.label}.`, color: marker.color }
      : fallbackPoints.find((item) => item.id === pointId);
    if (!point) return;

    const fallbackVideo = pointVideos[pointId];
    const videoPath = marker?.videoPath || fallbackVideo?.videoPath || "";
    if (videoPath) {
      setActiveVideo({
        title: marker?.videoTitle || fallbackVideo?.title || point.title,
        videoPath,
        pointTitle: point.title,
        pointId: point.id,
        src: mediaPathToUrl(videoPath),
      });
    }
  };

  const stopTimeline = () => {
    if (timelineTimerRef.current) {
      window.clearInterval(timelineTimerRef.current);
      timelineTimerRef.current = null;
    }
    timelineStartedRef.current = false;
    playedVoiceIdsRef.current.clear();
    audioRef.current?.pause();
  };

  const resizeArScene = useCallback(() => {
    const host = sceneHostRef.current;
    const scene = sceneRef.current;
    if (!host || !scene) return;

    const viewport = window.visualViewport;
    const width = Math.round(viewport?.width || window.innerWidth || host.clientWidth);
    const height = Math.round(viewport?.height || window.innerHeight || host.clientHeight);

    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
    scene.style.width = `${width}px`;
    scene.style.height = `${height}px`;

    if (scene.renderer) {
      scene.renderer.setSize(width, height, false);
    }
    if (scene.camera) {
      scene.camera.aspect = width / height;
      scene.camera.updateProjectionMatrix();
    }
    scene.resize?.();
  }, []);

  const attachArResize = useCallback(() => {
    if (resizeHandlerRef.current) return;

    const handler = () => {
      window.requestAnimationFrame(resizeArScene);
    };
    resizeHandlerRef.current = handler;
    window.addEventListener("resize", handler);
    window.visualViewport?.addEventListener("resize", handler);
    window.visualViewport?.addEventListener("scroll", handler);
    handler();
  }, [resizeArScene]);

  const removeArResize = () => {
    const handler = resizeHandlerRef.current;
    if (!handler) return;

    window.removeEventListener("resize", handler);
    window.visualViewport?.removeEventListener("resize", handler);
    window.visualViewport?.removeEventListener("scroll", handler);
    resizeHandlerRef.current = null;
  };

  const playSegmentAudio = async (segment) => {
    if (!segment?.audioPath) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = mediaPathToUrl(segment.audioPath);
    audioRef.current.currentTime = 0;
    try {
      await audioRef.current.play();
    } catch {
      // Mobile browsers may require a prior user gesture. Start AR is the gesture, so this is best-effort.
    }
  };

  const updateTimelineActions = (elapsedSeconds) => {
    const scene = sceneRef.current;
    const config = arConfigRef.current;
    const actions = actionListRef.current;
    if (!scene || !config) return;

    config.timeline.forEach((segment) => {
      const id = segment.id || segment.title;
      const start = Number(segment.at || 0);
      const duration = Math.max(0.1, Number(segment.duration || 0));
      const inRange = elapsedSeconds >= start && elapsedSeconds <= start + duration;
      if (inRange && segment.audioPath && !playedVoiceIdsRef.current.has(id)) {
        playedVoiceIdsRef.current.add(id);
        playSegmentAudio(segment);
      }
    });

    actions.forEach((action, index) => {
      const entity = scene.querySelector(`#timeline-action-${index}`);
      if (!entity) return;

      const start = Number(action.at || 0);
      const duration = Math.max(0.1, Number(action.duration || 1));
      const visible = elapsedSeconds >= start && elapsedSeconds <= start + duration;
      entity.setAttribute("visible", visible);
      if (!visible) return;

      const marker = config.markers.find((item) => item.id === action.pointId) || config.markers[0];
      const actionPosition = parsePair(action.position);
      const points = pathPoints(action);
      const progress = Math.max(0, Math.min(1, (elapsedSeconds - start) / duration));
      const rotationX = Number(action.rotationX || 0);
      const rotationY = Number(action.rotationY || 0);
      const rotationZ = Number(action.rotationZ ?? action.rotation ?? 0);
      const scale = Number(action.scale || 1);
      entity.setAttribute("scale", `${scale} ${scale} ${scale}`);

      if (points.length >= 2 && ["attack-arrow", "airplane", "hand-guide"].includes(action.type)) {
        const point = pointOnPath(points, progress);
        entity.setAttribute("position", pointToAR(point, config.calibration, 0.1));
        entity.setAttribute("rotation", `${rotationX} ${rotationY} ${pathAngle(points, progress) + rotationZ}`);
      } else if (marker) {
        const point = actionPosition || marker;
        entity.setAttribute("position", pointToAR(point, config.calibration, 0.1));
        entity.setAttribute("rotation", `${rotationX} ${rotationY} ${rotationZ}`);
      }
    });
  };

  const startTimelineOnce = () => {
    if (timelineStartedRef.current) return;
    const config = arConfigRef.current;
    if (!config) return;

    timelineStartedRef.current = true;

    const startTime = performance.now();
    updateTimelineActions(0);
    timelineTimerRef.current = window.setInterval(() => {
      updateTimelineActions((performance.now() - startTime) / 1000);
    }, 80);
  };

  const removeScreenPicker = () => {
    const host = sceneHostRef.current;
    const handlers = screenPickHandlerRef.current;
    if (!host || !handlers) return;

    host.removeEventListener("pointerup", handlers.pickHandler);
    host.removeEventListener("touchend", handlers.pickHandler);
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

    const pickHandler = (event) => {
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
      const intersections = raycaster.intersectObjects(targets, true);
      const hit = intersections.find((item) => item.object.el?.dataset?.point);
      const pointId = hit?.object.el?.dataset?.point;
      if (!pointId) return;

      event.preventDefault();
      event.stopPropagation();
      selectPoint(pointId);
    };

    host.addEventListener("pointerup", pickHandler);
    host.addEventListener("touchend", pickHandler, { passive: false });
    screenPickHandlerRef.current = {
      pickHandler,
    };
  };

  const startMindAR = async () => {
    if (running) return;

    const startupIssue = cameraSecurityIssue() || cameraSupportIssue();
    if (startupIssue) {
      setLoading({
        active: true,
        title: "Khong mo duoc camera",
        note: startupIssue,
        progress: 100,
        error: "camera",
      });
      return;
    }

    setRunning(true);
    setLoading({ active: true, title: "Dang tai AR", note: "Nap thu vien camera", progress: 8, error: "" });

    try {
      await loadMindARScripts();
      setLoading({ active: true, title: "Dang tai AR", note: "Nap MindAR thanh cong", progress: 18, error: "" });
      const arConfig = await loadArConfig();
      arConfigRef.current = arConfig;
      actionListRef.current = flattenActions(arConfig.timeline);
      const targetUrl = TARGET_MIND;

      if (!sceneHostRef.current) return;
      setLoading({ active: true, title: "Dang mo camera", note: "Hay chap nhan quyen camera neu duoc hoi", progress: 98, error: "" });
      sceneHostRef.current.innerHTML = buildScene(targetUrl, arConfig);
      sceneRef.current = sceneHostRef.current.querySelector("a-scene");

      sceneRef.current.addEventListener("arReady", () => setLoading((prev) => ({ ...prev, active: false, progress: 100 })));
      sceneRef.current.addEventListener("loaded", () => {
        attachScreenPicker();
        attachArResize();
        window.setTimeout(resizeArScene, 150);
        window.setTimeout(resizeArScene, 500);
      });
      sceneRef.current.addEventListener("targetFound", startTimelineOnce);
      sceneRef.current.querySelector("#timelineTarget")?.addEventListener("targetFound", startTimelineOnce);
      sceneRef.current.addEventListener("arError", () =>
        setLoading({
          active: true,
          title: "Khong mo duoc camera",
          note: cameraSecurityIssue() || "Hay kiem tra quyen camera trong trinh duyet roi thu lai.",
          progress: 100,
          error: "camera",
        })
      );

      sceneHostRef.current.querySelectorAll(".hotspot").forEach((hotspot) => {
        const pointId = hotspot.dataset.point;
        const handleSelect = (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectPoint(pointId);
        };

        hotspot.addEventListener("click", handleSelect);
        hotspot.addEventListener("pointerup", handleSelect);
        hotspot.addEventListener("touchstart", handleSelect, { passive: false });
        hotspot.addEventListener("touchend", handleSelect, { passive: false });
      });
    } catch (error) {
      setLoading({
        active: true,
        title: "Khong khoi dong duoc AR",
        note: error?.message || "Hay thu tai lai trang",
        progress: 100,
        error: "start",
      });
      setRunning(false);
    }
  };

  const stopMindAR = async () => {
    removeArResize();
    removeScreenPicker();
    stopTimeline();
    const scene = sceneRef.current;
    const systems = scene?.systems;
    if (systems?.["mindar-image-system"]) {
      await systems["mindar-image-system"].stop();
    }
    if (sceneHostRef.current) sceneHostRef.current.innerHTML = "";
    sceneRef.current = null;
    setRunning(false);
    setLoading({ active: false, title: "", note: "", progress: 0, error: "" });
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
              MindAR image tracking
            </p>
            <h4 className="mt-3 text-3xl font-black">Quet ban do 2D tren iPhone</h4>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Bam Start AR, cho phep camera, roi dua camera vao ban do mau. App se compile target lan dau nen co the mat vai giay.
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  MindAR
                </p>
                <h4 className="mt-2 text-xl font-black">{loading.title}</h4>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full border border-amber-200/30 bg-amber-300/15 text-sm font-black text-amber-200">
                {loading.progress}%
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  loading.error ? "bg-red-400" : "bg-amber-300"
                }`}
                style={{ width: `${loading.progress}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{loading.note}</p>
          </div>
        </div>
      ) : null}

      <div
        className={`absolute left-3 right-3 z-30 space-y-2 ${
          running ? "top-[calc(env(safe-area-inset-top)+0.75rem)]" : "bottom-3"
        }`}
      >
        <div className="flex flex-wrap gap-2">
          <a
            href={TARGET_IMAGE}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white px-3.5 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-slate-100"
          >
            Map target
          </a>
          <button
            type="button"
            onClick={running ? stopMindAR : startMindAR}
            className="rounded-full bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-amber-200"
          >
            {running ? "Stop AR" : "Start AR + Voice"}
          </button>
          {running ? (
            <button
              type="button"
              onClick={startTimelineOnce}
              className="rounded-full bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-emerald-300"
            >
              Start Voice
            </button>
          ) : null}
        </div>
      </div>

      {activeVideo ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/78 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  {activeVideo.pointTitle}
                </p>
                <h4 className="mt-1 text-xl font-black">{activeVideo.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pointId = activeVideo.pointId;
                  setActiveVideo(null);
                  const followUp = arConfigRef.current?.timeline?.find((segment) => segment.waitForPointClose === pointId);
                  playSegmentAudio(followUp);
                }}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
              >
                Dong
              </button>
            </div>
            <video
              key={activeVideo.src}
              src={activeVideo.src}
              className="aspect-video w-full bg-black"
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
