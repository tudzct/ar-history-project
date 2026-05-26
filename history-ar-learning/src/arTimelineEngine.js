import { pathAngle, pathPoints, pointOnPath, parsePoint } from "./arCoordinates.js";

export function segmentDuration(segment) {
  const actionEnd = (segment.actions || []).reduce((max, action) => {
    return Math.max(max, Number(action.startAt || 0) + Number(action.duration || 0));
  }, 0);
  return Math.max(1, Number(segment.duration || 0), actionEnd + 1);
}

export function totalDuration(segments) {
  return Math.max(30, (segments || []).reduce((sum, segment) => sum + segmentDuration(segment), 0));
}

export function getActionPoint(action, marker, elapsed) {
  const duration = Math.max(0.1, Number(action.duration || 1));
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const points = pathPoints(action);
  if (points.length >= 2) return pointOnPath(points, progress);
  return parsePoint(action.position) || marker || { x: 50, y: 50, z: action.transform?.z || 0.08 };
}

export function getActionYaw(action, elapsed, calibration = {}) {
  const transform = action.transform || {};
  const duration = Math.max(0.1, Number(action.duration || 1));
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const points = pathPoints(action);
  const baseYaw = Number(transform.yawOffset ?? transform.rotationZ ?? action.rotation ?? 0);
  if (transform.followPathRotation && points.length >= 2) {
    return pathAngle(points, progress, calibration) + baseYaw;
  }
  return baseYaw;
}

export function getActionModelRotation(action) {
  const transform = action.transform || {};
  return {
    x: Number(transform.modelRotationX ?? transform.rotationX ?? 0),
    y: Number(transform.modelRotationY ?? transform.rotationY ?? 0),
    z: Number(transform.modelRotationZ ?? 0),
  };
}

export function getActionRotation(action, elapsed, calibration = {}) {
  const modelRotation = getActionModelRotation(action);
  return {
    x: modelRotation.x,
    y: modelRotation.y,
    z: getActionYaw(action, elapsed, calibration),
  };
}

export function resolveActionMapPose(action, marker, elapsed = 0, calibration = {}) {
  const transform = action?.transform || {};
  const basePoint = getActionPoint(action, marker, elapsed);
  const position = {
    ...basePoint,
    x: Number(basePoint?.x ?? 50) + Number(transform.offsetX || 0),
    y: Number(basePoint?.y ?? 50) + Number(transform.offsetY || 0),
    z: Number(basePoint?.z ?? transform.z ?? 0.08) + Number(transform.offsetZ || 0),
  };
  return {
    position,
    yaw: getActionYaw(action, elapsed, calibration),
    modelRotation: getActionModelRotation(action),
    rotation: getActionRotation(action, elapsed, calibration),
    scale: Number(transform.scale || 1),
  };
}

export function activeActions(segment, elapsed) {
  return (segment?.actions || []).filter((action) => {
    const start = Number(action.startAt || 0);
    const duration = Math.max(0.1, Number(action.duration || 1));
    return elapsed >= start && (elapsed <= start + duration || action.transform?.holdAfterEnd);
  });
}
