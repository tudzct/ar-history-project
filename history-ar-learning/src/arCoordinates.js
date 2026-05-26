// The .mind target uses the map in its upright (clockwise-rotated) orientation.
export const TARGET_WIDTH = 1491;
export const TARGET_HEIGHT = 1419;
export const TARGET_ASPECT = TARGET_HEIGHT / TARGET_WIDTH;

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function percentToAR(x, y, z = 0, calibration = {}) {
  const local = percentPointToMapLocal({ x, y, z }, calibration);
  return `${local.x.toFixed(3)} ${local.y.toFixed(3)} ${local.z.toFixed(3)}`;
}

export function percentPointToMapLocal(point, calibration = {}, fallbackZ = 0) {
  const scaleX = Number(calibration.scaleX ?? 1);
  const scaleY = Number(calibration.scaleY ?? 1);
  const offsetX = Number(calibration.offsetX ?? 0);
  const offsetY = Number(calibration.offsetY ?? 0);
  const normalizedX = (Number(point?.x ?? 50) - 50) * scaleX + 50 + offsetX;
  const normalizedY = (Number(point?.y ?? 50) - 50) * scaleY + 50 + offsetY;
  return {
    x: normalizedX / 100 - 0.5,
    y: (0.5 - normalizedY / 100) * TARGET_ASPECT,
    z: Number(point?.z ?? fallbackZ ?? 0),
  };
}

export function mapLocalToPercentPoint(local, calibration = {}) {
  const scaleX = Number(calibration.scaleX ?? 1) || 1;
  const scaleY = Number(calibration.scaleY ?? 1) || 1;
  const offsetX = Number(calibration.offsetX ?? 0);
  const offsetY = Number(calibration.offsetY ?? 0);
  const normalizedX = (Number(local?.x ?? 0) + 0.5) * 100;
  const normalizedY = (0.5 - Number(local?.y ?? 0) / TARGET_ASPECT) * 100;
  return {
    x: Number(clamp((normalizedX - 50 - offsetX) / scaleX + 50).toFixed(1)),
    y: Number(clamp((normalizedY - 50 - offsetY) / scaleY + 50).toFixed(1)),
    z: Number(local?.z ?? 0),
  };
}

export function pointToAR(point, calibration = {}, fallbackZ = 0) {
  return percentToAR(point?.x ?? 50, point?.y ?? 50, point?.z ?? fallbackZ, calibration);
}

export function parsePoint(value) {
  if (!value) return null;
  if (typeof value === "object") {
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z ?? 0);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y, z: Number.isFinite(z) ? z : 0 } : null;
  }
  const [x, y, z = 0] = String(value).split(",").map((item) => Number(item.trim()));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y, z: Number.isFinite(z) ? z : 0 } : null;
}

export function pointValue(point) {
  const z = Number(point?.z ?? 0);
  return `${Number(point?.x ?? 50).toFixed(1)},${Number(point?.y ?? 50).toFixed(1)}${z ? `,${z.toFixed(2)}` : ""}`;
}

export function pathPoints(action) {
  const path = Array.isArray(action?.path) ? action.path.map(parsePoint).filter(Boolean) : [];
  const from = parsePoint(action?.from);
  const to = parsePoint(action?.to);
  return path.length >= 2 ? path : from && to ? [from, to] : path;
}

export function pointOnPath(points, progress) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const length = Math.hypot(next.x - point.x, next.y - point.y, (next.z || 0) - (point.z || 0));
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
        z: (segment.point.z || 0) + ((segment.next.z || 0) - (segment.point.z || 0)) * local,
      };
    }
    distance -= segment.length;
  }
  return points[points.length - 1];
}

export function pathAngle(points, progress, calibration = {}) {
  if (points.length < 2) return 0;
  const ahead = pointOnPath(points, Math.min(1, progress + 0.01));
  const behind = pointOnPath(points, Math.max(0, progress - 0.01));
  if (!ahead || !behind) return 0;
  const aheadLocal = percentPointToMapLocal(ahead, calibration);
  const behindLocal = percentPointToMapLocal(behind, calibration);
  return Math.atan2(aheadLocal.y - behindLocal.y, aheadLocal.x - behindLocal.x) * (180 / Math.PI);
}
