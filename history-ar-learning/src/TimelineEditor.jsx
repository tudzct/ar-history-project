import { useEffect, useMemo, useRef, useState } from "react";
import { actionTypes, defaultArMarkers, defaultArTimeline, defaultMapCalibration, MAP_IMAGE } from "./arTimelineConfig.js";
import TimelineMap3DPreview from "./TimelineMap3DPreview.jsx";

const CONFIG_URL = "/ar-config/ar-timeline-config.json";
const MIN_TIMELINE_SECONDS = 30;
const defaultAssetByType = {
  "attack-arrow": "/ar-assets/attack-arrow.glb",
  airplane: "/ar-assets/airplane.glb",
  "open-point": "/ar-assets/flag-marker.glb",
  "show-label": "/ar-assets/flag-marker.glb",
};

function makeState(markers = defaultArMarkers, timeline = defaultArTimeline, calibration = defaultMapCalibration) {
  return {
    calibration: { ...defaultMapCalibration, ...calibration },
    markers: markers.map((marker) => ({ markerScale: 1, videoPath: "", ...marker })),
    timeline: timeline.map((segment) => ({
      ...segment,
      actions: (segment.actions || []).map((action) => ({
        position: "",
        path: Array.isArray(action.path) ? action.path : [],
        rotation: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
        ...action,
      })),
    })),
  };
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function makeMarker(index) {
  return {
    id: `moc-${index + 1}`,
    label: `Moc ${index + 1}`,
    x: 50,
    y: 50,
    color: "#ef4444",
    markerScale: 1,
    videoPath: "",
  };
}

function makeAction(markerId = "him-lam") {
  return {
    id: uid("action"),
    type: "pulse-ring",
    at: 0,
    duration: 5,
    pointId: markerId,
    label: "",
    color: "#ef4444",
    assetPath: "",
    position: "",
    from: "",
    to: "",
    path: [],
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  };
}

function makeSegment(index, markerId) {
  return {
    id: uid("segment"),
    title: `Doan ${index + 1}`,
    at: index * 10,
    duration: 10,
    audioPath: "/audio/new-segment.mp3",
    narration: "",
    autoPlayAfterStart: index === 0,
    waitForPointClose: "",
    actions: [makeAction(markerId)],
  };
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
      {children}
    </label>
  );
}

function inputClass() {
  return "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-500";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parsePair(value) {
  if (!value) return null;
  const [x, y] = value.split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function pairValue(point) {
  if (!point) return "";
  return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
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
  let distance = clamp(progress, 0, 1) * total;
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

function mediaPathToUrl(filePath = "") {
  const cleanPath = String(filePath).trim().replace(/^["']|["']$/g, "");
  if (!cleanPath) return "";
  if (cleanPath.startsWith("/") || cleanPath.startsWith("http")) return cleanPath;
  return `/@fs/${encodeURI(cleanPath.replaceAll("\\", "/"))}`;
}

function effectiveAssetPath(action) {
  return action?.assetPath || defaultAssetByType[action?.type] || "";
}

function actionIcon(type) {
  const icons = {
    "pulse-ring": "◎",
    highlight: "●",
    "attack-arrow": "➜",
    "hand-guide": "☝",
    airplane: "✈",
    "bomb-drop": "◆",
    explosion: "✹",
    "show-label": "T",
    "open-point": "↗",
    "play-video": "▶",
  };
  return icons[type] || "◆";
}

function actionDescription(type) {
  const descriptions = {
    "pulse-ring": "Vong tron danh dau moc trong khoang thoi gian.",
    highlight: "Lam noi bat mot moc neo.",
    "attack-arrow": "Mui ten tien cong dong tu From den To.",
    "hand-guide": "Tro tay huong dan nguoi dung bam vao moc.",
    airplane: "May bay 3D bay theo duong From-To.",
    "bomb-drop": "Bom roi xuong moc dang chon.",
    explosion: "Hieu ung no tai moc.",
    "show-label": "Hien chu thuyet minh tai moc.",
    "open-point": "Yeu cau nguoi dung bam vao moc/video.",
    "play-video": "Mo video gan voi moc.",
  };
  return descriptions[type] || "Hieu ung tuy chinh.";
}

export default function TimelineEditor() {
  const [state, setState] = useState(makeState);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [activeActionIndex, setActiveActionIndex] = useState(0);
  const [activeMarkerId, setActiveMarkerId] = useState(defaultArMarkers[0]?.id || "");
  const [mapMode, setMapMode] = useState("marker");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const audioRef = useRef(null);

  const activeSegment = state.timeline[activeSegmentIndex] || state.timeline[0];
  const activeAction = activeSegment?.actions?.[activeActionIndex] || activeSegment?.actions?.[0];
  const activeMarker = state.markers.find((marker) => marker.id === activeMarkerId) || state.markers[0];
  const actionMarker = state.markers.find((marker) => marker.id === activeAction?.pointId);

  const timelineClips = useMemo(() => {
    const clips = state.timeline.flatMap((segment, segmentIndex) => [
      {
        id: `${segment.id}-voice`,
        kind: "voice",
        title: segment.title,
        at: Number(segment.at || 0),
        duration: Number(segment.duration || 0),
        color: "#0f172a",
        segmentIndex,
      },
      ...(segment.actions || []).map((action, actionIndex) => ({
        ...action,
        kind: "animation",
        title: action.label || action.type,
        segmentIndex,
        actionIndex,
      })),
    ]);

    const lanes = [];
    return clips
      .sort((a, b) => Number(a.at || 0) - Number(b.at || 0))
      .map((clip) => {
        const start = Number(clip.at || 0);
        const end = start + Number(clip.duration || 0);
        let lane = lanes.findIndex((laneEnd) => start >= laneEnd);
        if (lane === -1) {
          lane = lanes.length;
          lanes.push(end);
        } else {
          lanes[lane] = end;
        }
        return { ...clip, lane };
      });
  }, [state.timeline]);

  const timelineDuration = useMemo(() => {
    const maxActionEnd = timelineClips.reduce((max, clip) => {
      return Math.max(max, Number(clip.at || 0) + Number(clip.duration || 0));
    }, 0);
    return Math.max(MIN_TIMELINE_SECONDS, Math.ceil(maxActionEnd + 5));
  }, [timelineClips]);

  const laneCount = useMemo(() => Math.max(1, ...timelineClips.map((clip) => clip.lane + 1)), [timelineClips]);

  const visibleActions = useMemo(() => {
    return state.timeline.flatMap((segment, segmentIndex) =>
      (segment.actions || [])
        .map((action, actionIndex) => ({ ...action, segmentIndex, actionIndex, segmentTitle: segment.title }))
        .filter((action) => playTime >= Number(action.at || 0) && playTime <= Number(action.at || 0) + Number(action.duration || 0))
    );
  }, [playTime, state.timeline]);

  const jsonPreview = useMemo(() => JSON.stringify(state, null, 2), [state]);
  const mapPreviewActions = useMemo(() => {
    const selected =
      activeAction &&
      activeSegment
        ? {
            ...activeAction,
            segmentIndex: activeSegmentIndex,
            actionIndex: activeActionIndex,
            segmentTitle: activeSegment.title,
            isSelectedPreview: true,
          }
        : null;
    const keys = new Set(visibleActions.map((action) => `${action.segmentIndex}:${action.actionIndex}`));
    return selected && !keys.has(`${selected.segmentIndex}:${selected.actionIndex}`)
      ? [...visibleActions, selected]
      : visibleActions.map((action) =>
          selected && action.segmentIndex === selected.segmentIndex && action.actionIndex === selected.actionIndex
            ? { ...action, isSelectedPreview: true }
            : action
        );
  }, [activeAction, activeActionIndex, activeSegment, activeSegmentIndex, visibleActions]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${CONFIG_URL}?t=${Date.now()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Cannot load AR config");
        return response.json();
      })
      .then((config) => {
        if (cancelled) return;
        const nextState = makeState(config.markers || defaultArMarkers, config.timeline || defaultArTimeline, config.calibration);
        setState(nextState);
        setActiveMarkerId(nextState.markers[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setSaveStatus("Khong doc duoc file config, dang dung mau mac dinh");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const startedAt = performance.now() - playTime * 1000;
    const timer = window.setInterval(() => {
      const nextTime = (performance.now() - startedAt) / 1000;
      if (nextTime >= timelineDuration) {
        setPlayTime(timelineDuration);
        setIsPlaying(false);
      } else {
        setPlayTime(Number(nextTime.toFixed(2)));
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [isPlaying, playTime, timelineDuration]);

  useEffect(() => {
    const startSegment = state.timeline.find((segment) => segment.autoPlayAfterStart) || state.timeline[0];
    if (audioRef.current && startSegment?.audioPath) {
      audioRef.current.src = startSegment.audioPath;
    }
  }, [state.timeline]);

  const setMarkers = (updater) => {
    setState((current) => ({ ...current, markers: updater(current.markers) }));
  };

  const setTimeline = (updater) => {
    setState((current) => ({ ...current, timeline: updater(current.timeline) }));
  };

  const updateCalibration = (field, value) => {
    setState((current) => ({
      ...current,
      calibration: { ...defaultMapCalibration, ...current.calibration, [field]: value },
    }));
  };

  const updateMarker = (markerId, field, value) => {
    setMarkers((markers) =>
      markers.map((marker) => (marker.id === markerId ? { ...marker, [field]: value } : marker))
    );
  };

  const updateSegment = (field, value) => {
    setTimeline((timeline) =>
      timeline.map((segment, index) =>
        index === activeSegmentIndex ? { ...segment, [field]: value } : segment
      )
    );
  };

  const updateSegmentByIndex = (segmentIndex, field, value) => {
    setTimeline((timeline) =>
      timeline.map((segment, index) => (index === segmentIndex ? { ...segment, [field]: value } : segment))
    );
  };

  const updateActionByIndex = (segmentIndex, actionIndex, field, value) => {
    setTimeline((timeline) =>
      timeline.map((segment, currentSegmentIndex) => {
        if (currentSegmentIndex !== segmentIndex) return segment;
        return {
          ...segment,
          actions: segment.actions.map((action, currentActionIndex) =>
            currentActionIndex === actionIndex ? { ...action, [field]: value } : action
          ),
        };
      })
    );
  };

  const updateAction = (field, value) => {
    updateActionByIndex(activeSegmentIndex, activeActionIndex, field, value);
  };

  const addMarker = () => {
    setMarkers((markers) => {
      const marker = makeMarker(markers.length);
      setActiveMarkerId(marker.id);
      return [...markers, marker];
    });
  };

  const removeMarker = () => {
    if (state.markers.length <= 1 || !activeMarker) return;
    const nextMarker = state.markers.find((marker) => marker.id !== activeMarker.id);
    setMarkers((markers) => markers.filter((marker) => marker.id !== activeMarker.id));
    setActiveMarkerId(nextMarker?.id || "");
  };

  const addSegment = () => {
    setTimeline((timeline) => {
      const next = [...timeline, makeSegment(timeline.length, state.markers[0]?.id)];
      setActiveSegmentIndex(next.length - 1);
      setActiveActionIndex(0);
      return next;
    });
  };

  const removeSegment = () => {
    if (state.timeline.length <= 1) return;
    setTimeline((timeline) => timeline.filter((_, index) => index !== activeSegmentIndex));
    setActiveSegmentIndex((index) => Math.max(0, index - 1));
    setActiveActionIndex(0);
  };

  const addAction = () => {
    setTimeline((timeline) =>
      timeline.map((segment, index) => {
        if (index !== activeSegmentIndex) return segment;
        const nextActions = [...segment.actions, makeAction(state.markers[0]?.id)];
        setActiveActionIndex(nextActions.length - 1);
        return { ...segment, actions: nextActions };
      })
    );
  };

  const removeAction = () => {
    if (!activeSegment || activeSegment.actions.length <= 1) return;
    setTimeline((timeline) =>
      timeline.map((segment, segmentIndex) =>
        segmentIndex === activeSegmentIndex
          ? { ...segment, actions: segment.actions.filter((_, index) => index !== activeActionIndex) }
          : segment
      )
    );
    setActiveActionIndex((index) => Math.max(0, index - 1));
  };

  const saveConfig = async () => {
    setSaveStatus("Dang luu vao file cau hinh...");
    setSaveOk(false);
    try {
      const response = await fetch("/ar-config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Save failed");
      setSaveStatus("Da luu vao public/ar-config/ar-timeline-config.json");
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 2200);
    } catch (error) {
      setSaveStatus(`Khong luu duoc: ${error.message}`);
      setSaveOk(false);
    }
  };

  const resetDraft = () => {
    setState(makeState());
    setActiveSegmentIndex(0);
    setActiveActionIndex(0);
    setActiveMarkerId(defaultArMarkers[0].id);
    setPlayTime(0);
    setIsPlaying(false);
  };

  const pointFromEvent = (event, element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: Number(clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100).toFixed(1)),
      y: Number(clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100).toFixed(1)),
    };
  };

  const handleMapPointerDown = (event) => {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event, event.currentTarget);

    if (mapMode === "marker" && activeMarker) {
      setDragTarget({ type: "marker", markerId: activeMarker.id });
      updateMarker(activeMarker.id, "x", point.x);
      updateMarker(activeMarker.id, "y", point.y);
    }
    if (mapMode === "from") {
      setDragTarget({ type: "from" });
      updateAction("from", pairValue(point));
    }
    if (mapMode === "to") {
      setDragTarget({ type: "to" });
      updateAction("to", pairValue(point));
    }
    if (mapMode === "path") {
      const nextPath = [...(activeAction?.path || []), pairValue(point)];
      updateAction("path", nextPath);
      setDragTarget({ type: "path-point", index: nextPath.length - 1 });
    }
  };

  const handleMapPointerMove = (event) => {
    if (!dragTarget) return;
    const point = pointFromEvent(event, event.currentTarget);
    if (dragTarget.type === "marker") {
      updateMarker(dragTarget.markerId, "x", point.x);
      updateMarker(dragTarget.markerId, "y", point.y);
    }
    if (dragTarget.type === "from") updateAction("from", pairValue(point));
    if (dragTarget.type === "to") updateAction("to", pairValue(point));
    if (dragTarget.type === "path-point") {
      const nextPath = [...(activeAction?.path || [])];
      nextPath[dragTarget.index] = pairValue(point);
      updateAction("path", nextPath);
    }
  };

  const handleMapPointerUp = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragTarget(null);
  };

  const startMapHandleDrag = (event, target) => {
    event.preventDefault();
    event.stopPropagation();
    const mapElement = event.currentTarget.closest("[data-map-canvas='true']");
    if (!mapElement) return;

    const move = (moveEvent) => {
      const point = pointFromEvent(moveEvent, mapElement);
      if (target.type === "marker") {
        updateMarker(target.markerId, "x", point.x);
        updateMarker(target.markerId, "y", point.y);
      }
      if (target.type === "from") updateAction("from", pairValue(point));
      if (target.type === "to") updateAction("to", pairValue(point));
      if (target.type === "path-point") {
        const nextPath = [...(activeAction?.path || [])];
        nextPath[target.index] = pairValue(point);
        updateAction("path", nextPath);
      }
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    move(event);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startAnimationDrag = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    selectAction(action.segmentIndex, action.actionIndex);

    const mapElement = event.currentTarget.closest("[data-map-canvas='true']");
    if (!mapElement) return;

    const from = parsePair(action.from);
    const to = parsePair(action.to);
    const points = pathPoints(action);
    const position = parsePair(action.position);
    const isPathAction = ["attack-arrow", "airplane", "hand-guide"].includes(action.type) && (points.length >= 2 || (from && to));
    const startPoint = pointFromEvent(event, mapElement);
    const startPosition = position || startPoint;
    const startFrom = from ? { ...from } : null;
    const startTo = to ? { ...to } : null;
    const startPath = points.length ? points.map((point) => ({ ...point })) : [];

    const move = (moveEvent) => {
      const point = pointFromEvent(moveEvent, mapElement);
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;

      if (isPathAction && startPath.length >= 2) {
        updateActionByIndex(
          action.segmentIndex,
          action.actionIndex,
          "path",
          startPath.map((point) =>
            pairValue({
              x: clamp(point.x + dx, 0, 100),
              y: clamp(point.y + dy, 0, 100),
            })
          )
        );
        return;
      }

      if (isPathAction && startFrom && startTo) {
        const nextFrom = {
          x: clamp(startFrom.x + dx, 0, 100),
          y: clamp(startFrom.y + dy, 0, 100),
        };
        const nextTo = {
          x: clamp(startTo.x + dx, 0, 100),
          y: clamp(startTo.y + dy, 0, 100),
        };
        updateActionByIndex(action.segmentIndex, action.actionIndex, "from", pairValue(nextFrom));
        updateActionByIndex(action.segmentIndex, action.actionIndex, "to", pairValue(nextTo));
        return;
      }

      const nextPosition = {
        x: clamp(startPosition.x + dx, 0, 100),
        y: clamp(startPosition.y + dy, 0, 100),
      };
      updateActionByIndex(action.segmentIndex, action.actionIndex, "position", pairValue(nextPosition));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const getActionPoint = (action) => {
    const marker = state.markers.find((item) => item.id === action.pointId);
    const points = pathPoints(action);
    const position = parsePair(action.position);
    const progress = clamp((playTime - Number(action.at || 0)) / Math.max(0.1, Number(action.duration || 1)), 0, 1);
    if (["attack-arrow", "airplane", "hand-guide"].includes(action.type) && points.length >= 2) {
      return pointOnPath(points, progress);
    }
    return position || marker || { x: 50, y: 50 };
  };

  const startAnimationRotate = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    selectAction(action.segmentIndex, action.actionIndex);

    const mapElement = event.currentTarget.closest("[data-map-canvas='true']");
    if (!mapElement) return;
    const rect = mapElement.getBoundingClientRect();
    const center = getActionPoint(action);
    const centerX = rect.left + (center.x / 100) * rect.width;
    const centerY = rect.top + (center.y / 100) * rect.height;
    const startRotation = Number(action.rotationZ ?? action.rotation ?? 0);
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);

    const move = (moveEvent) => {
      const nextAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
      updateActionByIndex(action.segmentIndex, action.actionIndex, "rotationZ", Number((startRotation + nextAngle - startAngle).toFixed(1)));
      updateActionByIndex(action.segmentIndex, action.actionIndex, "rotation", Number((startRotation + nextAngle - startAngle).toFixed(1)));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startAnimationScale = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    selectAction(action.segmentIndex, action.actionIndex);

    const startX = event.clientX;
    const startScale = Number(action.scale || 1);

    const move = (moveEvent) => {
      const nextScale = clamp(startScale + (moveEvent.clientX - startX) / 90, 0.1, 8);
      updateActionByIndex(action.segmentIndex, action.actionIndex, "scale", Number(nextScale.toFixed(2)));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const selectAction = (segmentIndex, actionIndex) => {
    setActiveSegmentIndex(segmentIndex);
    setActiveActionIndex(actionIndex);
  };

  const startClipDrag = (event, segmentIndex, actionIndex, mode = "move") => {
    event.preventDefault();
    event.stopPropagation();
    selectAction(segmentIndex, actionIndex);

    const track = event.currentTarget.closest("[data-timeline-track='true']");
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const action = state.timeline[segmentIndex]?.actions?.[actionIndex];
    const startAt = Number(action?.at || 0);
    const startDuration = Number(action?.duration || 1);
    const startX = event.clientX;

    const move = (moveEvent) => {
      const deltaSeconds = ((moveEvent.clientX - startX) / rect.width) * timelineDuration;

      if (mode === "move") {
        const nextAt = Number(clamp(startAt + deltaSeconds, 0, timelineDuration).toFixed(1));
        updateActionByIndex(segmentIndex, actionIndex, "at", nextAt);
        setPlayTime(nextAt);
      }

      if (mode === "resize-left") {
        const nextAt = Number(clamp(startAt + deltaSeconds, 0, startAt + startDuration - 0.5).toFixed(1));
        const nextDuration = Number(clamp(startDuration + startAt - nextAt, 0.5, timelineDuration).toFixed(1));
        updateActionByIndex(segmentIndex, actionIndex, "at", nextAt);
        updateActionByIndex(segmentIndex, actionIndex, "duration", nextDuration);
        setPlayTime(nextAt);
      }

      if (mode === "resize-right") {
        const nextDuration = Number(clamp(startDuration + deltaSeconds, 0.5, timelineDuration - startAt).toFixed(1));
        updateActionByIndex(segmentIndex, actionIndex, "duration", nextDuration);
      }
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startVoiceClipDrag = (event, segmentIndex, mode = "move") => {
    event.preventDefault();
    event.stopPropagation();
    setActiveSegmentIndex(segmentIndex);
    setActiveActionIndex(0);

    const track = event.currentTarget.closest("[data-timeline-track='true']");
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const segment = state.timeline[segmentIndex];
    const startAt = Number(segment?.at || 0);
    const startDuration = Number(segment?.duration || 1);
    const startX = event.clientX;

    const move = (moveEvent) => {
      const deltaSeconds = ((moveEvent.clientX - startX) / rect.width) * timelineDuration;
      if (mode === "move") {
        const nextAt = Number(clamp(startAt + deltaSeconds, 0, timelineDuration).toFixed(1));
        updateSegmentByIndex(segmentIndex, "at", nextAt);
        setPlayTime(nextAt);
      }
      if (mode === "resize-left") {
        const nextAt = Number(clamp(startAt + deltaSeconds, 0, startAt + startDuration - 0.5).toFixed(1));
        const nextDuration = Number(clamp(startDuration + startAt - nextAt, 0.5, timelineDuration).toFixed(1));
        updateSegmentByIndex(segmentIndex, "at", nextAt);
        updateSegmentByIndex(segmentIndex, "duration", nextDuration);
      }
      if (mode === "resize-right") {
        const nextDuration = Number(clamp(startDuration + deltaSeconds, 0.5, timelineDuration - startAt).toFixed(1));
        updateSegmentByIndex(segmentIndex, "duration", nextDuration);
      }
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const playPreview = async () => {
    const startSegment = state.timeline.find((segment) => segment.autoPlayAfterStart) || state.timeline[0];
    setPlayTime(0);
    setIsPlaying(true);
    if (audioRef.current && startSegment?.audioPath) {
      audioRef.current.src = startSegment.audioPath;
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
      } catch {
        setSaveStatus("Trinh duyet chan audio tu dong, bam Play audio trong control neu can nghe.");
      }
    }
  };

  const pausePreview = () => {
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="grid gap-6">
        <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">Dien Bien Phu AR</p>
              <h3 className="mt-1 text-2xl font-black">Visual timeline editor</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={playPreview} className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">
                Chay thu
              </button>
              <button type="button" onClick={pausePreview} className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
                Tam dung
              </button>
              <button type="button" onClick={saveConfig} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">
                Luu tong the
              </button>
            </div>
          </div>
          {saveOk ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-emerald-600">V</span>
              Da luu thanh cong
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 rounded-[1.5rem] bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-slate-950">
                {playTime.toFixed(1)}s / {timelineDuration}s
              </span>
              <input
                type="range"
                min="0"
                max={timelineDuration}
                step="0.1"
                value={playTime}
                onChange={(event) => {
                  setIsPlaying(false);
                  audioRef.current?.pause();
                  setPlayTime(Number(event.target.value));
                }}
                className="min-w-60 flex-1 accent-amber-300"
              />
            </div>
            <audio ref={audioRef} controls className="w-full" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["marker", "Keo moc neo"],
              ["from", "Keo diem bat dau"],
              ["to", "Keo diem ket thuc"],
              ["path", "Ve duong bay"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMapMode(key)}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  mapMode === key ? "bg-amber-300 text-slate-950" : "bg-white/10 text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            data-map-canvas="true"
            role="application"
            tabIndex={0}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={handleMapPointerUp}
            onPointerCancel={handleMapPointerUp}
            className="relative mt-5 touch-none overflow-hidden rounded-[1.5rem] bg-slate-900"
          >
            <img src={MAP_IMAGE} alt="Dien Bien Phu map" className="block w-full select-none" draggable="false" />

            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="editor-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                  <path d="M0,0 L8,4 L0,8 Z" fill={activeAction?.color || "#22c55e"} />
                </marker>
              </defs>
              {pathPoints(activeAction).length >= 2 ? (
                <polyline
                  points={pathPoints(activeAction).map((point) => `${point.x},${point.y}`).join(" ")}
                  stroke={activeAction.color || "#22c55e"}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd="url(#editor-arrow)"
                  fill="none"
                  opacity="0.9"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {state.markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                onPointerDown={(event) => {
                  setActiveMarkerId(marker.id);
                  updateAction("pointId", marker.id);
                  startMapHandleDrag(event, { type: "marker", markerId: marker.id });
                }}
                className={`absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-black text-white shadow-lg ${
                  marker.id === activeMarker?.id ? "border-white ring-4 ring-white/45" : "border-white/70"
                }`}
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  backgroundColor: marker.color,
                  transform: `translate(-50%, -50%) scale(${Number(marker.markerScale || 1)})`,
                }}
                title={marker.label}
              >
                {state.markers.findIndex((item) => item.id === marker.id) + 1}
              </button>
            ))}

            {activeAction?.from ? (
              <button
                type="button"
                onPointerDown={(event) => startMapHandleDrag(event, { type: "from" })}
                className="absolute z-20 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-emerald-500 text-[10px] font-black text-white shadow-lg"
                style={{ left: `${parsePair(activeAction.from)?.x || 0}%`, top: `${parsePair(activeAction.from)?.y || 0}%` }}
                title="Keo diem bat dau"
              >
                F
              </button>
            ) : null}

            {activeAction?.to ? (
              <button
                type="button"
                onPointerDown={(event) => startMapHandleDrag(event, { type: "to" })}
                className="absolute z-20 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-red-500 text-[10px] font-black text-white shadow-lg"
                style={{ left: `${parsePair(activeAction.to)?.x || 0}%`, top: `${parsePair(activeAction.to)?.y || 0}%` }}
                title="Keo diem ket thuc"
              >
                T
              </button>
            ) : null}

            {(activeAction?.path || []).map((value, index) => {
              const point = parsePair(value);
              if (!point) return null;
              return (
                <button
                  key={`${activeAction.id}-path-${index}`}
                  type="button"
                  onPointerDown={(event) => startMapHandleDrag(event, { type: "path-point", index })}
                  className="absolute z-20 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-500 text-[10px] font-black text-white shadow-lg"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={`Diem duong bay ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}

            {mapPreviewActions.map((action) => {
              const marker = state.markers.find((item) => item.id === action.pointId);
              const points = pathPoints(action);
              const position = parsePair(action.position);
              const progress = clamp((playTime - Number(action.at || 0)) / Math.max(0.1, Number(action.duration || 1)), 0, 1);
              const movingPoint = points.length >= 2 ? pointOnPath(points, progress) : marker;
              const point = ["attack-arrow", "airplane", "hand-guide"].includes(action.type) && points.length >= 2 ? movingPoint : position || marker;
              if (!point) return null;

              return (
                <div
                  key={`${action.segmentIndex}-${action.id}`}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => startAnimationDrag(event, action)}
                  className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-move touch-none text-center ${action.isSelectedPreview ? "ring-4 ring-amber-300/80" : ""}`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    transform: `translate(-50%, -50%) rotate(${Number(action.rotationZ ?? action.rotation ?? 0)}deg) scale(${Number(action.scale || 1)})`,
                    opacity: action.isSelectedPreview && !visibleActions.some((item) => item.segmentIndex === action.segmentIndex && item.actionIndex === action.actionIndex) ? 0.72 : 1,
                  }}
                >
                  {effectiveAssetPath(action) ? (
                    <div className="grid h-28 w-28 place-items-center rounded-2xl border-4 border-amber-300/80 bg-slate-950/20 shadow-2xl">
                      <model-viewer
                        src={mediaPathToUrl(effectiveAssetPath(action))}
                        autoplay
                        animation-name="*"
                        camera-orbit="0deg 70deg 2.2m"
                        interaction-prompt="none"
                        disable-zoom
                        disable-pan
                        style={{ width: "112px", height: "112px", pointerEvents: "none" }}
                        orientation={`${action.rotationX ?? 0}deg ${action.rotationY ?? 0}deg ${action.rotationZ ?? action.rotation ?? 0}deg`}
                        scale={`${action.scale ?? 1} ${action.scale ?? 1} ${action.scale ?? 1}`}
                      />
                    </div>
                  ) : (
                    <>
                      {["pulse-ring", "highlight", "open-point"].includes(action.type) ? (
                        <div
                          className="h-20 w-20 rounded-full border-4 border-dashed"
                          style={{ borderColor: action.color, boxShadow: `0 0 28px ${action.color}` }}
                        />
                      ) : null}
                      <div
                        className="mx-auto grid h-12 min-w-12 place-items-center rounded-full px-3 text-2xl font-black text-white shadow-2xl"
                        style={{ backgroundColor: action.color || "#ef4444" }}
                      >
                        {actionIcon(action.type)}
                      </div>
                    </>
                  )}
                  {action.label ? (
                    <div className="mt-1 max-w-40 rounded-xl bg-slate-950/85 px-3 py-2 text-xs font-black text-white">
                      {action.label}
                    </div>
                  ) : null}
                  {action.isSelectedPreview ? (
                    <>
                      <button
                        type="button"
                        onPointerDown={(event) => startAnimationRotate(event, action)}
                        className="absolute -right-8 -top-8 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-sky-500 text-xs font-black text-white shadow-lg"
                        title="Keo de xoay animation"
                      >
                        R
                      </button>
                      <button
                        type="button"
                        onPointerDown={(event) => startAnimationScale(event, action)}
                        className="absolute -bottom-8 -right-8 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-emerald-500 text-xs font-black text-white shadow-lg"
                        title="Keo ngang de phong to thu nho"
                      >
                        S
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}

            {actionMarker ? (
              <div
                className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-dashed"
                style={{ left: `${actionMarker.x}%`, top: `${actionMarker.y}%`, borderColor: activeAction?.color || actionMarker.color }}
              />
            ) : null}
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 text-white">
              <div>
                <h3 className="text-lg font-black">Map 3D de can tuong quan</h3>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  Xoay/zoom bang chuot, xem moc neo 3D va duong bay theo dung ti le map.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">
                {activeAction?.label || activeAction?.type || "Animation"}
              </span>
            </div>
            <TimelineMap3DPreview
              state={state}
              activeAction={activeAction}
              activeMarkerId={activeMarker?.id}
              playTime={playTime}
              onSelectMarker={(markerId) => {
                setActiveMarkerId(markerId);
                updateAction("pointId", markerId);
              }}
              onUpdateMarker={updateMarker}
              onUpdateAction={updateAction}
            />
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-950">Timeline chay thu</h3>
            <div className="flex gap-2">
              <button type="button" onClick={addAction} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                Them animation
              </button>
              <button type="button" onClick={removeAction} className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white">
                Xoa animation
              </button>
            </div>
          </div>
          <div className="relative mt-5 overflow-x-auto rounded-2xl bg-slate-100 p-4">
            <div className="relative min-w-[720px]" style={{ height: `${Math.max(220, laneCount * 52 + 80)}px` }}>
              {Array.from({ length: Math.floor(timelineDuration / 5) + 1 }).map((_, index) => (
                <div key={index} className="absolute top-0 h-full border-l border-slate-300/70" style={{ left: `${(index * 5 / timelineDuration) * 100}%` }}>
                  <span className="ml-1 text-xs font-bold text-slate-500">{index * 5}s</span>
                </div>
              ))}
              <div className="absolute top-0 z-20 h-full w-0.5 bg-red-500" style={{ left: `${(playTime / timelineDuration) * 100}%` }} />

              <div data-timeline-track="true" className="absolute left-36 right-0 top-8 rounded-xl bg-white" style={{ height: `${laneCount * 52 + 12}px` }}>
                {Array.from({ length: laneCount }).map((_, lane) => (
                  <div key={lane} className="absolute left-0 right-0 border-t border-slate-200" style={{ top: `${lane * 52 + 6}px` }} />
                ))}
                {timelineClips.map((clip) => {
                  const left = (Number(clip.at || 0) / timelineDuration) * 100;
                  const width = Math.max(4, (Number(clip.duration || 1) / timelineDuration) * 100);
                  const top = clip.lane * 52 + 12;
                  const isActive =
                    clip.kind === "voice"
                      ? clip.segmentIndex === activeSegmentIndex
                      : clip.segmentIndex === activeSegmentIndex && clip.actionIndex === activeActionIndex;
                  return (
                    <button
                      key={`${clip.kind}-${clip.segmentIndex}-${clip.actionIndex ?? "voice"}`}
                      type="button"
                      onClick={() => {
                        if (clip.kind === "voice") {
                          setActiveSegmentIndex(clip.segmentIndex);
                          setActiveActionIndex(0);
                        } else {
                          selectAction(clip.segmentIndex, clip.actionIndex);
                        }
                      }}
                      onPointerDown={(event) =>
                        clip.kind === "voice"
                          ? startVoiceClipDrag(event, clip.segmentIndex)
                          : startClipDrag(event, clip.segmentIndex, clip.actionIndex)
                      }
                      className={`absolute h-10 rounded-xl px-4 text-left text-xs font-black text-white shadow ${isActive ? "ring-4 ring-slate-950/30" : ""}`}
                      style={{ left: `${left}%`, top: `${top}px`, width: `${width}%`, backgroundColor: clip.kind === "voice" ? "#0f172a" : clip.color || "#ef4444" }}
                      title={clip.title}
                    >
                      <span
                        className="absolute left-0 top-0 h-full w-3 cursor-ew-resize rounded-l-xl bg-black/25"
                        onPointerDown={(event) =>
                          clip.kind === "voice"
                            ? startVoiceClipDrag(event, clip.segmentIndex, "resize-left")
                            : startClipDrag(event, clip.segmentIndex, clip.actionIndex, "resize-left")
                        }
                      />
                      <span className="pointer-events-none block truncate">
                        {clip.kind === "voice" ? "VOICE" : actionIcon(clip.type)} {clip.title}
                      </span>
                      <span
                        className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r-xl bg-black/25"
                        onPointerDown={(event) =>
                          clip.kind === "voice"
                            ? startVoiceClipDrag(event, clip.segmentIndex, "resize-right")
                            : startClipDrag(event, clip.segmentIndex, clip.actionIndex, "resize-right")
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-black">Cac doan voice/audio</h3>
            <button type="button" onClick={addSegment} className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">
              Them doan
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {state.timeline.map((segment, index) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => {
                  setActiveSegmentIndex(index);
                  setActiveActionIndex(0);
                }}
                className={`rounded-2xl border p-4 text-left ${
                  index === activeSegmentIndex ? "border-amber-300 bg-white text-slate-950" : "border-white/10 bg-white/5"
                }`}
              >
                <p className="font-black">{segment.title}</p>
                <p className="mt-1 truncate text-xs opacity-75">{segment.audioPath}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={saveConfig} className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">
              Luu tong the
            </button>
            <button type="button" onClick={resetDraft} className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
              Reset mau
            </button>
            <button type="button" onClick={removeSegment} className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white">
              Xoa doan
            </button>
          </div>
          {saveStatus ? <p className="mt-3 text-sm leading-6 text-amber-100">{saveStatus}</p> : null}
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xl font-black text-slate-950">Noi dung doan voice</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Ten doan">
              <input className={inputClass()} value={activeSegment?.title || ""} onChange={(event) => updateSegment("title", event.target.value)} />
            </Field>
            <Field label="Bat dau o giay">
              <input type="number" className={inputClass()} value={activeSegment?.at ?? 0} onChange={(event) => updateSegment("at", Number(event.target.value))} />
            </Field>
            <Field label="Ket thuc sau giay">
              <input type="number" className={inputClass()} value={activeSegment?.duration ?? 10} onChange={(event) => updateSegment("duration", Number(event.target.value))} />
            </Field>
            <Field label="Audio path">
              <input className={inputClass()} value={activeSegment?.audioPath || ""} onChange={(event) => updateSegment("audioPath", event.target.value)} />
            </Field>
            <Field label="Phat khi tracking map lan dau">
              <select className={inputClass()} value={activeSegment?.autoPlayAfterStart ? "yes" : "no"} onChange={(event) => updateSegment("autoPlayAfterStart", event.target.value === "yes")}>
                <option value="yes">Co</option>
                <option value="no">Khong</option>
              </select>
            </Field>
            <Field label="Phat sau khi dong moc">
              <select className={inputClass()} value={activeSegment?.waitForPointClose || ""} onChange={(event) => updateSegment("waitForPointClose", event.target.value)}>
                <option value="">Khong gan su kien dong moc</option>
                {state.markers.map((marker) => (
                  <option key={marker.id} value={marker.id}>
                    {marker.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Ghi chu loi dan">
                <textarea className={`${inputClass()} min-h-20 resize-y`} value={activeSegment?.narration || ""} onChange={(event) => updateSegment("narration", event.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-950">Animation dang chon</h3>
              <p className="mt-1 text-sm text-slate-500">{actionDescription(activeAction?.type)}</p>
            </div>
          </div>

          {activeAction ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Loai animation">
                <select className={inputClass()} value={activeAction.type} onChange={(event) => updateAction("type", event.target.value)}>
                  {actionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Diem neo">
                <select className={inputClass()} value={activeAction.pointId} onChange={(event) => updateAction("pointId", event.target.value)}>
                  {state.markers.map((marker) => (
                    <option key={marker.id} value={marker.id}>
                      {marker.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bat dau o giay">
                <input type="number" className={inputClass()} value={activeAction.at} onChange={(event) => updateAction("at", Number(event.target.value))} />
              </Field>
              <Field label="Ket thuc sau giay">
                <input type="number" className={inputClass()} value={activeAction.duration} onChange={(event) => updateAction("duration", Number(event.target.value))} />
              </Field>
              <Field label="Huong xoay do">
                <input type="number" className={inputClass()} value={activeAction.rotationZ ?? activeAction.rotation ?? 0} onChange={(event) => { updateAction("rotationZ", Number(event.target.value)); updateAction("rotation", Number(event.target.value)); }} />
              </Field>
              <Field label="Lat ngua / sap X">
                <input type="number" className={inputClass()} value={activeAction.rotationX ?? 0} onChange={(event) => updateAction("rotationX", Number(event.target.value))} />
              </Field>
              <Field label="Lat ngang Y">
                <input type="number" className={inputClass()} value={activeAction.rotationY ?? 0} onChange={(event) => updateAction("rotationY", Number(event.target.value))} />
              </Field>
              <Field label="Phong to thu nho">
                <input type="number" step="0.1" min="0.1" className={inputClass()} value={activeAction.scale ?? 1} onChange={(event) => updateAction("scale", Number(event.target.value))} />
              </Field>
              <div className="md:col-span-2 grid gap-3 rounded-2xl bg-slate-50 p-4">
                <Field label="Keo huong xoay">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={activeAction.rotationZ ?? activeAction.rotation ?? 0}
                    onChange={(event) => { updateAction("rotationZ", Number(event.target.value)); updateAction("rotation", Number(event.target.value)); }}
                    className="accent-slate-950"
                  />
                </Field>
                <Field label="Keo lat ngua/sap X">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={activeAction.rotationX ?? 0}
                    onChange={(event) => updateAction("rotationX", Number(event.target.value))}
                    className="accent-slate-950"
                  />
                </Field>
                <Field label="Keo lat ngang Y">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={activeAction.rotationY ?? 0}
                    onChange={(event) => updateAction("rotationY", Number(event.target.value))}
                    className="accent-slate-950"
                  />
                </Field>
                <Field label="Keo kich thuoc">
                  <input
                    type="range"
                    min="0.2"
                    max="4"
                    step="0.1"
                    value={activeAction.scale ?? 1}
                    onChange={(event) => updateAction("scale", Number(event.target.value))}
                    className="accent-slate-950"
                  />
                </Field>
              </div>
              <Field label="Nhan hien thi">
                <input className={inputClass()} value={activeAction.label} onChange={(event) => updateAction("label", event.target.value)} />
              </Field>
              <Field label="Mau">
                <input className={inputClass()} value={activeAction.color} onChange={(event) => updateAction("color", event.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Asset 3D path">
                  <input className={inputClass()} value={activeAction.assetPath} onChange={(event) => updateAction("assetPath", event.target.value)} />
                </Field>
                <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                  Dang dung asset: {effectiveAssetPath(activeAction) || "chua co asset, se hien icon tam"}
                </p>
              </div>
              {effectiveAssetPath(activeAction) ? (
                <div className="md:col-span-2 overflow-hidden rounded-2xl bg-slate-950 p-3">
                  <model-viewer
                    src={mediaPathToUrl(effectiveAssetPath(activeAction))}
                    camera-controls
                    autoplay
                    animation-name="*"
                    style={{ width: "100%", height: "260px", background: "#020617" }}
                    orientation={`${activeAction.rotationX ?? 0}deg ${activeAction.rotationY ?? 0}deg ${activeAction.rotationZ ?? activeAction.rotation ?? 0}deg`}
                    scale={`${activeAction.scale ?? 1} ${activeAction.scale ?? 1} ${activeAction.scale ?? 1}`}
                  />
                </div>
              ) : null}
              <div className="md:col-span-2">
                <Field label="Vi tri rieng cua animation x,y">
                  <input className={inputClass()} value={activeAction.position || ""} onChange={(event) => updateAction("position", event.target.value)} />
                </Field>
              </div>
              <Field label="From x,y">
                <input className={inputClass()} value={activeAction.from} onChange={(event) => updateAction("from", event.target.value)} />
              </Field>
              <Field label="To x,y">
                <input className={inputClass()} value={activeAction.to} onChange={(event) => updateAction("to", event.target.value)} />
              </Field>
              <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Duong bay nhieu diem</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">Bam che do Ve duong bay tren map, moi lan bam se them 1 diem. Keo tung diem de sua.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMapMode("path")}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
                    >
                      Ve duong bay
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAction("path", [...(activeAction.path || []), activeAction.to || activeAction.from || activeAction.position || "50,50"])}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 ring-1 ring-slate-200"
                    >
                      Them diem
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAction("path", (activeAction.path || []).slice(0, -1))}
                      className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white"
                    >
                      Xoa diem cuoi
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {(activeAction.path || []).map((value, index) => (
                    <div key={`${activeAction.id}-path-input-${index}`} className="grid gap-2 md:grid-cols-[90px_1fr_auto] md:items-center">
                      <span className="text-sm font-black text-slate-600">Diem {index + 1}</span>
                      <input
                        className={inputClass()}
                        value={value}
                        onChange={(event) => {
                          const nextPath = [...(activeAction.path || [])];
                          nextPath[index] = event.target.value;
                          updateAction("path", nextPath);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateAction("path", (activeAction.path || []).filter((_, currentIndex) => currentIndex !== index))}
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-red-600 ring-1 ring-slate-200"
                      >
                        Xoa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Neu co duong bay nhieu diem, AR se uu tien chay theo cac diem nay. Neu khong co, no se dung From-To.
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xl font-black text-slate-950">Can chinh tracking map</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Field label="Offset X">
              <input type="number" step="0.01" className={inputClass()} value={state.calibration?.offsetX ?? 0} onChange={(event) => updateCalibration("offsetX", Number(event.target.value))} />
            </Field>
            <Field label="Offset Y">
              <input type="number" step="0.01" className={inputClass()} value={state.calibration?.offsetY ?? 0} onChange={(event) => updateCalibration("offsetY", Number(event.target.value))} />
            </Field>
            <Field label="Scale X">
              <input type="number" step="0.01" className={inputClass()} value={state.calibration?.scaleX ?? 1} onChange={(event) => updateCalibration("scaleX", Number(event.target.value))} />
            </Field>
            <Field label="Scale Y">
              <input type="number" step="0.01" className={inputClass()} value={state.calibration?.scaleY ?? 1} onChange={(event) => updateCalibration("scaleY", Number(event.target.value))} />
            </Field>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-950">Diem neo tren map</h3>
            <div className="flex gap-2">
              <button type="button" onClick={addMarker} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
                Them moc
              </button>
              <button type="button" onClick={removeMarker} className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white">
                Xoa moc
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Moc dang chon">
              <select className={inputClass()} value={activeMarker?.id || ""} onChange={(event) => setActiveMarkerId(event.target.value)}>
                {state.markers.map((marker) => (
                  <option key={marker.id} value={marker.id}>
                    {marker.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ten moc">
              <input className={inputClass()} value={activeMarker?.label || ""} onChange={(event) => updateMarker(activeMarker.id, "label", event.target.value)} />
            </Field>
            <Field label="Ma moc">
              <input className={inputClass()} value={activeMarker?.id || ""} onChange={(event) => updateMarker(activeMarker.id, "id", event.target.value)} />
            </Field>
            <Field label="Mau moc">
              <input className={inputClass()} value={activeMarker?.color || ""} onChange={(event) => updateMarker(activeMarker.id, "color", event.target.value)} />
            </Field>
            <Field label="Size coc 3D">
              <input type="number" step="0.1" min="0.1" className={inputClass()} value={activeMarker?.markerScale ?? 1} onChange={(event) => updateMarker(activeMarker.id, "markerScale", Number(event.target.value))} />
            </Field>
            <Field label="Keo size coc">
              <input
                type="range"
                min="0.2"
                max="5"
                step="0.1"
                value={activeMarker?.markerScale ?? 1}
                onChange={(event) => updateMarker(activeMarker.id, "markerScale", Number(event.target.value))}
                className="accent-slate-950"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Video path cua moc">
                <input className={inputClass()} value={activeMarker?.videoPath || ""} onChange={(event) => updateMarker(activeMarker.id, "videoPath", event.target.value)} />
              </Field>
            </div>
            <Field label="X %">
              <input type="number" className={inputClass()} value={activeMarker?.x || 0} onChange={(event) => updateMarker(activeMarker.id, "x", Number(event.target.value))} />
            </Field>
            <Field label="Y %">
              <input type="number" className={inputClass()} value={activeMarker?.y || 0} onChange={(event) => updateMarker(activeMarker.id, "y", Number(event.target.value))} />
            </Field>
          </div>
        </div>

        <details className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
          <summary className="cursor-pointer text-xl font-black">JSON dang luu</summary>
          <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-black/40 p-4 text-xs leading-5 text-slate-200">
            {jsonPreview}
          </pre>
        </details>
      </div>
    </div>
  );
}
