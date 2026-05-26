import * as THREE from "three";
import {
  mapLocalToPercentPoint,
  percentPointToMapLocal,
} from "./arCoordinates.js";

export function percentToAFrameVector(point, calibration = {}, fallbackZ = 0) {
  return percentPointToMapLocal(point, calibration, fallbackZ);
}

export function percentToAFramePosition(point, calibration = {}, fallbackZ = 0) {
  const local = percentToAFrameVector(point, calibration, fallbackZ);
  return `${local.x.toFixed(4)} ${local.y.toFixed(4)} ${local.z.toFixed(4)}`;
}

export function percentToThreeVector(point, calibration = {}, fallbackZ = 0) {
  const local = percentPointToMapLocal(point, calibration, fallbackZ);
  return new THREE.Vector3(local.x, local.z, -local.y);
}

export function threeVectorToPercent(vec3, calibration = {}) {
  return mapLocalToPercentPoint(
    { x: vec3.x, y: -vec3.z, z: vec3.y },
    calibration
  );
}

export function yawToAFrameRotation(yawDeg = 0) {
  return `0 0 ${Number(yawDeg || 0).toFixed(3)}`;
}

export function yawToThreeEuler(yawDeg = 0) {
  return new THREE.Euler(0, THREE.MathUtils.degToRad(Number(yawDeg || 0)), 0);
}

export function modelRotationToAFrame(rotation = {}) {
  return `${Number(rotation.x || 0).toFixed(3)} ${Number(rotation.y || 0).toFixed(3)} ${Number(rotation.z || 0).toFixed(3)}`;
}

export function modelRotationToThreeQuaternion(rotation = {}) {
  const arEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(Number(rotation.x || 0)),
    THREE.MathUtils.degToRad(Number(rotation.y || 0)),
    THREE.MathUtils.degToRad(Number(rotation.z || 0)),
    "XYZ"
  );

  // Runtime A-Frame/MindAR: map is X/Y, height is Z.
  // Preview Three.js: map is X/-Z, height is Y, so the target faces the camera from above.
  // Convert an A-Frame local rotation into the preview coordinate space.
  const arMatrix = new THREE.Matrix4().makeRotationFromEuler(arEuler);
  const arToThreeBasis = new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1
  );

  const threeMatrix = arToThreeBasis
    .clone()
    .multiply(arMatrix)
    .multiply(arToThreeBasis.clone().invert());

  return new THREE.Quaternion().setFromRotationMatrix(threeMatrix);
}

export function modelRotationToThreeEuler(rotation = {}) {
  return new THREE.Euler().setFromQuaternion(modelRotationToThreeQuaternion(rotation));
}
