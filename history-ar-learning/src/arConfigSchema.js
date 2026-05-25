import { parsePoint, pointValue } from "./arCoordinates.js";

export const MAP_IMAGE = "/ar-targets/dien_bien_phu_map.jpg";
export const CONFIG_URL = "/ar-config/ar-timeline-config.json";

export const actionTypes = [
  "model",
  "airplane",
  "attack-arrow",
  "bomb-drop",
  "highlight-marker",
  "open-video-marker",
];

const actionLabels = {
  model: "Asset cố định",
  airplane: "Máy bay",
  "attack-arrow": "Mũi tên tiến công",
  "bomb-drop": "Thả bom / nổ",
  "highlight-marker": "Làm sáng mốc",
  "open-video-marker": "Nhắc mở video",
};

export const defaultAssetByType = {
  airplane: "/ar-assets/airplane.glb",
  "attack-arrow": "/ar-assets/attack-arrow.glb",
  "open-video-marker": "/ar-assets/flag-marker.glb",
  "highlight-marker": "/ar-assets/flag-marker.glb",
};

export const defaultMapCalibration = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
};

export const defaultMarkers = [
  { id: "him-lam", label: "Him Lam", x: 30.9, y: 62.6, z: 0.02, scale: 0.25, color: "#ef4444", videoPath: "" },
  { id: "muong-thanh", label: "Muong Thanh", x: 21.8, y: 78.8, z: 0.02, scale: 0.25, color: "#f59e0b", videoPath: "" },
  { id: "tan-thanh", label: "Tan Thanh", x: 23.9, y: 70.5, z: 0.02, scale: 0.25, color: "#8b5cf6", videoPath: "" },
  { id: "thanh-minh", label: "Thanh Minh", x: 50.7, y: 48.9, z: 0.02, scale: 0.25, color: "#22c55e", videoPath: "" },
  { id: "ta-leng", label: "Ta Leng", x: 54.9, y: 75.6, z: 0.02, scale: 0.25, color: "#38bdf8", videoPath: "" },
];

export const defaultConfig = {
  version: 2,
  calibration: defaultMapCalibration,
  markers: defaultMarkers,
  segments: [
    {
      id: "intro",
      title: "Mở đầu chiến dịch",
      audioPath: "",
      startAt: 0,
      duration: 30,
      nextMarkerId: "him-lam",
      actions: [
        {
          id: "intro-plane",
          type: "airplane",
          label: "Máy bay bay qua thung lũng",
          assetPath: "/ar-assets/airplane.glb",
          startAt: 2,
          duration: 10,
          pointId: "him-lam",
          position: { x: 30.9, y: 62.6, z: 0.16 },
          path: [
            { x: 78, y: 82, z: 0.16 },
            { x: 52, y: 72, z: 0.16 },
            { x: 30.9, y: 62.6, z: 0.16 },
          ],
          transform: {
            z: 0.16,
            scale: 1,
            rotationX: -90,
            rotationY: 0,
            rotationZ: 0,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            followPathRotation: true,
          },
        },
      ],
    },
  ],
};

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

export function makeMarker(index = 0) {
  return {
    id: `moc-${index + 1}`,
    label: `Moc ${index + 1}`,
    x: 50,
    y: 50,
    z: 0.02,
    scale: 0.35,
    color: "#ef4444",
    videoPath: "",
  };
}

export function makeSegment(index = 0, markerId = "") {
  return {
    id: uid("segment"),
    title: `Giọng đọc ${index + 1}`,
    audioPath: "",
    startAt: 0,
    duration: 30,
    nextMarkerId: markerId,
    actions: [],
  };
}

export function makeAction(type = "model", markerId = "") {
  return {
    id: uid("action"),
    type,
    label: actionLabels[type] || type,
    assetPath: defaultAssetByType[type] || "",
    startAt: 0,
    duration: 5,
    pointId: markerId,
    position: { x: 50, y: 50, z: type === "airplane" ? 0.16 : 0.08 },
    path: type === "airplane" || type === "attack-arrow" || type === "bomb-drop" ? [
      { x: 35, y: 65, z: type === "airplane" ? 0.16 : 0.08 },
      { x: 55, y: 50, z: type === "airplane" ? 0.16 : 0.08 },
    ] : [],
    transform: {
      z: type === "airplane" ? 0.16 : 0.08,
      scale: 1,
      rotationX: type === "airplane" ? -90 : 0,
      rotationY: 0,
      rotationZ: 0,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      followPathRotation: ["airplane", "attack-arrow", "bomb-drop"].includes(type),
    },
  };
}

function normalizeMarker(marker, index) {
  return {
    ...makeMarker(index),
    ...marker,
    z: Number(marker?.z ?? marker?.height ?? 0.02),
    scale: Number(marker?.scale ?? marker?.markerScale ?? 0.35),
  };
}

function normalizeTransform(action) {
  const point = parsePoint(action?.position) || parsePoint(action?.from) || { x: 50, y: 50, z: 0.08 };
  return {
    z: Number(action?.transform?.z ?? action?.height ?? point.z ?? 0.08),
    scale: Number(action?.transform?.scale ?? action?.scale ?? 1),
    rotationX: Number(action?.transform?.rotationX ?? action?.rotationX ?? 0),
    rotationY: Number(action?.transform?.rotationY ?? action?.rotationY ?? 0),
    rotationZ: Number(action?.transform?.rotationZ ?? action?.rotationZ ?? action?.rotation ?? 0),
    offsetX: Number(action?.transform?.offsetX ?? action?.modelOffsetX ?? 0),
    offsetY: Number(action?.transform?.offsetY ?? action?.modelOffsetY ?? 0),
    offsetZ: Number(action?.transform?.offsetZ ?? action?.modelOffsetZ ?? 0),
    followPathRotation: Boolean(action?.transform?.followPathRotation ?? ["airplane", "attack-arrow", "bomb-drop"].includes(action?.type)),
  };
}

function normalizeAction(action = {}, markerId = "") {
  const typeMap = {
    "pulse-ring": "highlight-marker",
    highlight: "highlight-marker",
    "show-label": "highlight-marker",
    "open-point": "open-video-marker",
    "play-video": "open-video-marker",
  };
  const type = typeMap[action.type] || action.type || "model";
  const transform = normalizeTransform(action);
  const position = parsePoint(action.position) || { x: 50, y: 50, z: transform.z };
  const path = Array.isArray(action.path)
    ? action.path.map(parsePoint).filter(Boolean)
    : [parsePoint(action.from), parsePoint(action.to)].filter(Boolean);
  return {
    ...makeAction(type, markerId),
    ...action,
    type,
    id: action.id || uid("action"),
    label: action.label || actionLabels[type] || type,
    assetPath: action.assetPath || defaultAssetByType[type] || "",
    startAt: Number(action.startAt ?? action.at ?? 0),
    duration: Number(action.duration ?? 5),
    pointId: action.pointId || markerId,
    position: { ...position, z: Number(position.z ?? transform.z) },
    path: path.map((point) => ({ ...point, z: Number(point.z ?? transform.z) })),
    transform,
  };
}

function normalizeSegment(segment = {}, index = 0, markerId = "") {
  return {
    ...makeSegment(index, markerId),
    ...segment,
    id: segment.id || uid("segment"),
    startAt: Number(segment.startAt ?? segment.at ?? 0),
    duration: Number(segment.duration ?? 30),
    nextMarkerId: segment.nextMarkerId || segment.waitForPointClose || "",
    actions: (segment.actions || []).map((action) => normalizeAction(action, action.pointId || markerId)),
  };
}

export function normalizeConfig(config = {}) {
  const markers = (config.markers?.length ? config.markers : defaultMarkers).map(normalizeMarker);
  const sourceSegments = config.segments?.length ? config.segments : config.timeline?.length ? config.timeline : defaultConfig.segments;
  return {
    version: 2,
    calibration: { ...defaultMapCalibration, ...(config.calibration || {}) },
    markers,
    segments: sourceSegments.map((segment, index) => normalizeSegment(segment, index, markers[0]?.id || "")),
  };
}

export function serializePoint(point) {
  return pointValue(point);
}
