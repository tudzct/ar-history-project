import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CONFIG_URL,
  actionTypes,
  assetOrientationProfiles,
  defaultAssetByType,
  defaultConfig,
  defaultMapCalibration,
  makeAction,
  makeMarker,
  makeSegment,
  normalizeConfig,
} from './arConfigSchema.js';
import { activeActions, segmentDuration } from './arTimelineEngine.js';
import { pointValue } from './arCoordinates.js';
import TimelineMap3DPreview from './TimelineMap3DPreview.jsx';

const SAVE_URL = '/ar-config/save';

const actionLabels = {
  model: 'Asset cố định',
  airplane: 'Máy bay',
  'attack-arrow': 'Mũi tên tiến công',
  'bomb-drop': 'Thả bom / nổ',
  'highlight-marker': 'Làm sáng mốc',
  'open-video-marker': 'Nhắc mở video',
};

const mapModeLabels = {
  marker: 'Đặt mốc',
  action: 'Đặt asset',
  path: 'Vẽ đường đi',
};

const assetOrientationPresets = {
  airplane: {
    ...assetOrientationProfiles.airplane,
    label: 'Preset A: X 90',
  },
  airplaneFlip: {
    ...assetOrientationProfiles.airplaneFlip,
    label: 'Preset B: X -90 Z 180',
  },
  airplaneOld: {
    ...assetOrientationProfiles.airplaneOld,
    label: 'Preset C: X -90',
  },
  attackArrow: {
    label: 'Mũi tên nằm trên bản đồ, hướng theo đường đi',
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: 0,
    yawOffset: 0,
    followPathRotation: true,
  },
  uprightMarker: {
    label: 'Asset đứng thẳng trên bản đồ',
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: 0,
    yawOffset: 0,
    followPathRotation: false,
  },
};

const airplaneDebugPresets = [
  {
    label: 'A: X 90',
    modelRotationX: 90,
    modelRotationY: 0,
    modelRotationZ: 0,
  },
  {
    label: 'B: X -90 Z 180',
    modelRotationX: -90,
    modelRotationY: 0,
    modelRotationZ: 180,
  },
  {
    label: 'C: X -90',
    modelRotationX: -90,
    modelRotationY: 0,
    modelRotationZ: 0,
  },
  {
    label: 'D: Reset',
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: 0,
  },
  {
    label: 'E: Y 90',
    modelRotationX: 0,
    modelRotationY: 90,
    modelRotationZ: 0,
  },
  {
    label: 'F: Y -90',
    modelRotationX: 0,
    modelRotationY: -90,
    modelRotationZ: 0,
  },
  {
    label: 'G: Z 90',
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: 90,
  },
  {
    label: 'H: Z -90',
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: -90,
  },
  {
    label: 'I: X 90 Z 180',
    modelRotationX: 90,
    modelRotationY: 0,
    modelRotationZ: 180,
  },
  {
    label: 'J: X 90 Y 180',
    modelRotationX: 90,
    modelRotationY: 180,
    modelRotationZ: 0,
  },
];

function fieldClass() {
  return 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-500';
}

function buttonClass(active = false) {
  return `rounded-lg px-3 py-2 text-xs font-black transition ${
    active
      ? 'bg-slate-950 text-white'
      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
  }`;
}

function mediaPathToUrl(filePath = '') {
  const cleanPath = String(filePath)
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!cleanPath) return '';
  if (cleanPath.startsWith('/') || cleanPath.startsWith('http'))
    return cleanPath;
  return `/@fs/${encodeURI(cleanPath.replaceAll('\\', '/'))}`;
}

function transformValue(action, field, fallback = 0) {
  return Number(action?.transform?.[field] ?? fallback);
}

function NumberStepper({ label, value, step = 1, min, max, onChange }) {
  const current = Number(value || 0);
  const update = (next) => {
    const bounded = Math.max(
      min ?? -Infinity,
      Math.min(max ?? Infinity, Number(next)),
    );
    onChange(Number.isFinite(bounded) ? bounded : 0);
  };

  return (
    <label className="grid min-w-0 gap-2 rounded-xl bg-slate-50 p-3">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] gap-2">
        <button
          type="button"
          className="rounded-lg bg-white text-lg font-black text-slate-700 ring-1 ring-slate-200"
          onClick={() => update(current - step)}
        >
          -
        </button>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          className={`${fieldClass()} min-w-0 text-center`}
          value={current}
          onChange={(event) => update(event.target.value)}
        />
        <button
          type="button"
          className="rounded-lg bg-white text-lg font-black text-slate-700 ring-1 ring-slate-200"
          onClick={() => update(current + step)}
        >
          +
        </button>
      </div>
      <input
        type="range"
        min={min ?? -180}
        max={max ?? 180}
        step={step}
        value={current}
        onChange={(event) => update(event.target.value)}
        className="min-w-0 w-full accent-slate-950"
      />
    </label>
  );
}

function Quick3DControls({
  selected,
  activeMarker,
  activeAction,
  activeSegment,
  onUpdateMarker,
  onUpdateAction,
  onUpdateActionTransform,
}) {
  const isAction = selected.kind === 'action' && activeAction;
  const isMarker = selected.kind === 'marker' && activeMarker;
  const isPath =
    selected.kind === 'path' && activeAction?.path?.[selected.pathIndex];
  const pathPoint = isPath ? activeAction.path[selected.pathIndex] : null;

  const patchAction = (patch) =>
    onUpdateAction(selected.segmentIndex, selected.actionIndex, patch);
  const patchPathPoint = (patch) => {
    const nextPath = [...(activeAction.path || [])];
    nextPath[selected.pathIndex] = {
      ...nextPath[selected.pathIndex],
      ...patch,
    };
    patchAction({ path: nextPath });
  };
  const patchActionTransform = (patch) => {
    patchAction({
      transform: {
        ...(activeAction.transform || {}),
        ...patch,
        rotationX:
          patch.modelRotationX ?? activeAction.transform?.rotationX ?? 0,
        rotationY:
          patch.modelRotationY ?? activeAction.transform?.rotationY ?? 0,
        rotationZ: patch.yawOffset ?? activeAction.transform?.rotationZ ?? 0,
      },
    });
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Thông số nhanh
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            {isAction
              ? activeAction.label || actionLabels[activeAction.type]
              : isMarker
                ? activeMarker.label
                : isPath
                  ? `Điểm đường đi ${selected.pathIndex + 1}`
                  : 'Chọn mốc hoặc asset'}
          </h3>
        </div>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
          {isAction ? 'Asset' : isMarker ? 'Mốc' : isPath ? 'Path' : 'Trống'}
        </span>
      </div>

      {!isAction && !isMarker && !isPath ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Bấm trực tiếp vào mốc, asset hoặc điểm đường đi trên bản đồ 3D để
          chỉnh thông số tại đây.
        </p>
      ) : null}

      {isMarker ? (
        <div className="mt-4 grid gap-3">
          <input
            className={fieldClass()}
            value={activeMarker.label}
            onChange={(event) =>
              onUpdateMarker(activeMarker.id, { label: event.target.value })
            }
          />
          <div className="grid gap-3">
            <NumberStepper
              label="X trên bản đồ (%)"
              value={activeMarker.x}
              step={0.1}
              min={0}
              max={100}
              onChange={(value) =>
                onUpdateMarker(activeMarker.id, { x: value })
              }
            />
            <NumberStepper
              label="Y trên bản đồ (%)"
              value={activeMarker.y}
              step={0.1}
              min={0}
              max={100}
              onChange={(value) =>
                onUpdateMarker(activeMarker.id, { y: value })
              }
            />
            <NumberStepper
              label="Độ cao Z"
              value={activeMarker.z}
              step={0.01}
              min={0}
              max={0.6}
              onChange={(value) =>
                onUpdateMarker(activeMarker.id, { z: value })
              }
            />
            <NumberStepper
              label="Mốc size"
              value={activeMarker.scale}
              step={0.05}
              min={0.05}
              max={5}
              onChange={(value) =>
                onUpdateMarker(activeMarker.id, { scale: value })
              }
            />
          </div>
          <input
            className={fieldClass()}
            placeholder="Đường dẫn video khi bấm mốc"
            value={activeMarker.videoPath || ''}
            onChange={(event) =>
              onUpdateMarker(activeMarker.id, { videoPath: event.target.value })
            }
          />
        </div>
      ) : null}

      {isAction ? (
        <div className="mt-4 grid gap-3">
          <input
            className={fieldClass()}
            value={activeAction.label || ''}
            onChange={(event) => patchAction({ label: event.target.value })}
          />
          <div className="grid gap-3">
            <NumberStepper
              label="Bắt đầu (giây)"
              value={activeAction.startAt}
              step={0.1}
              min={0}
              max={segmentDuration(activeSegment)}
              onChange={(value) => patchAction({ startAt: value })}
            />
            <NumberStepper
              label="Thời lượng hiện"
              value={activeAction.duration}
              step={0.1}
              min={0.1}
              max={segmentDuration(activeSegment)}
              onChange={(value) => patchAction({ duration: value })}
            />
            <NumberStepper
              label="X trên bản đồ (%)"
              value={activeAction.position?.x ?? 50}
              step={0.1}
              min={0}
              max={100}
              onChange={(value) =>
                patchAction({
                  position: { ...activeAction.position, x: value },
                })
              }
            />
            <NumberStepper
              label="Y trên bản đồ (%)"
              value={activeAction.position?.y ?? 50}
              step={0.1}
              min={0}
              max={100}
              onChange={(value) =>
                patchAction({
                  position: { ...activeAction.position, y: value },
                })
              }
            />
            <NumberStepper
              label="Độ cao Z"
              value={transformValue(activeAction, 'z', 0.08)}
              step={0.01}
              min={0}
              max={0.8}
              onChange={(value) => onUpdateActionTransform('z', value)}
            />
            <NumberStepper
              label="Phóng to / thu nhỏ"
              value={transformValue(activeAction, 'scale', 1)}
              step={0.05}
              min={0.05}
              max={8}
              onChange={(value) => onUpdateActionTransform('scale', value)}
            />
          </div>

          <div className="grid gap-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Preset hướng asset
            </p>
            <div className="grid gap-2">
              {Object.entries(assetOrientationPresets).map(
                ([presetId, preset]) => (
                  <button
                    key={presetId}
                    type="button"
                    className={buttonClass()}
                    onClick={() => patchActionTransform(preset)}
                  >
                    {preset.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {activeAction.type === 'airplane' ? (
            <div className="grid gap-2 rounded-xl bg-amber-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-900">
                Test nhanh hướng máy bay
              </p>
              <div className="grid grid-cols-2 gap-2">
                {airplaneDebugPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={buttonClass()}
                    onClick={() =>
                      patchActionTransform({
                        modelRotationX: preset.modelRotationX,
                        modelRotationY: preset.modelRotationY,
                        modelRotationZ: preset.modelRotationZ,
                      })
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(activeAction.transform?.showLocalAxes)}
                  onChange={(event) =>
                    onUpdateActionTransform(
                      'showLocalAxes',
                      event.target.checked,
                    )
                  }
                />
                Hiện trục local X/Y/Z trên model khi quét AR
              </label>
            </div>
          ) : null}

          <div className="grid gap-3">
            <NumberStepper
              label="Hướng đi / yaw offset"
              value={transformValue(
                activeAction,
                'yawOffset',
                transformValue(activeAction, 'rotationZ', 0),
              )}
              step={5}
              min={-180}
              max={180}
              onChange={(value) => onUpdateActionTransform('yawOffset', value)}
            />
            <NumberStepper
              label="Sửa trục model X"
              value={transformValue(
                activeAction,
                'modelRotationX',
                transformValue(activeAction, 'rotationX', 0),
              )}
              step={5}
              min={-180}
              max={180}
              onChange={(value) =>
                onUpdateActionTransform('modelRotationX', value)
              }
            />
            <NumberStepper
              label="Sửa trục model Y"
              value={transformValue(
                activeAction,
                'modelRotationY',
                transformValue(activeAction, 'rotationY', 0),
              )}
              step={5}
              min={-180}
              max={180}
              onChange={(value) =>
                onUpdateActionTransform('modelRotationY', value)
              }
            />
            <NumberStepper
              label="Sửa trục model Z"
              value={transformValue(activeAction, 'modelRotationZ', 0)}
              step={5}
              min={-180}
              max={180}
              onChange={(value) =>
                onUpdateActionTransform('modelRotationZ', value)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={buttonClass()}
              onClick={() =>
                onUpdateActionTransform(
                  'yawOffset',
                  transformValue(
                    activeAction,
                    'yawOffset',
                    transformValue(activeAction, 'rotationZ', 0),
                  ) - 15,
                )
              }
            >
              Xoay trái 15°
            </button>
            <button
              type="button"
              className={buttonClass()}
              onClick={() =>
                onUpdateActionTransform(
                  'yawOffset',
                  transformValue(
                    activeAction,
                    'yawOffset',
                    transformValue(activeAction, 'rotationZ', 0),
                  ) + 15,
                )
              }
            >
              Xoay phải 15°
            </button>
            <button
              type="button"
              className={buttonClass()}
              onClick={() => onUpdateActionTransform('modelRotationX', 90)}
            >
              Đặt nằm trên bản đồ (X 90)
            </button>
            <button
              type="button"
              className={buttonClass()}
              onClick={() => onUpdateActionTransform('modelRotationX', 0)}
            >
              Đặt đứng thẳng
            </button>
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(activeAction.transform?.followPathRotation)}
              onChange={(event) =>
                onUpdateActionTransform(
                  'followPathRotation',
                  event.target.checked,
                )
              }
            />
            Tự xoay theo hướng di chuyển trên đường đi
          </label>
        </div>
      ) : null}

      {isPath ? (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <NumberStepper
              label="Điểm đường đi X (%)"
              value={pathPoint.x}
              step={0.1}
              min={0}
              max={100}
              onChange={(value) => patchPathPoint({ x: value })}
            />
            <NumberStepper
              label="Điểm đường đi Y (%)"
              value={pathPoint.y}
              step={0.1}
              min={0}
              max={100}
              onChange={(value) => patchPathPoint({ y: value })}
            />
            <NumberStepper
              label="Điểm đường đi Z"
              value={pathPoint.z ?? transformValue(activeAction, 'z', 0.08)}
              step={0.01}
              min={0}
              max={0.8}
              onChange={(value) => patchPathPoint({ z: value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VoiceTimeline({
  segment,
  selectedActionIndex,
  playTime,
  playing,
  onPlay,
  onScrub,
  onSelectAction,
}) {
  const duration = segmentDuration(segment);
  const active = activeActions(segment, playTime);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Timeline giọng đọc
          </p>
          <h3 className="text-xl font-black text-slate-950">
            {segment?.title || 'Chưa có đoạn giọng đọc'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onPlay}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white"
        >
          {playing ? 'Tạm dừng' : 'Phát thử'}
        </button>
      </div>

      <input
        type="range"
        min="0"
        max={duration}
        step="0.1"
        value={Math.min(playTime, duration)}
        onChange={(event) => onScrub(Number(event.target.value))}
        className="mt-4 w-full accent-slate-950"
      />
      <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
        <span>{playTime.toFixed(1)} giây</span>
        <span>{duration.toFixed(1)} giây</span>
      </div>

      <div className="relative mt-4 h-32 overflow-hidden rounded-xl bg-slate-100">
        <div
          className="absolute inset-y-0 w-0.5 bg-red-500"
          style={{ left: `${(playTime / duration) * 100}%` }}
        />
        {(segment?.actions || []).map((action, index) => {
          const left = (Number(action.startAt || 0) / duration) * 100;
          const width = (Number(action.duration || 1) / duration) * 100;
          const isActive = active.some((item) => item.id === action.id);
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelectAction(index)}
              className={`absolute top-4 h-12 rounded-lg px-3 text-left text-xs font-black shadow-sm ${
                selectedActionIndex === index
                  ? 'bg-slate-950 text-white'
                  : isActive
                    ? 'bg-amber-300 text-slate-950'
                    : 'bg-white text-slate-700'
              }`}
              style={{ left: `${left}%`, width: `${Math.max(8, width)}%` }}
            >
              <span className="block truncate">
                {action.label || actionLabels[action.type] || action.type}
              </span>
              <span className="block text-[10px] opacity-70">
                {Number(action.startAt || 0).toFixed(1)}s -{' '}
                {(
                  Number(action.startAt || 0) + Number(action.duration || 0)
                ).toFixed(1)}
                s
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TimelineEditor() {
  const [state, setState] = useState(() => normalizeConfig(defaultConfig));
  const [selected, setSelected] = useState({
    kind: 'marker',
    markerId: defaultConfig.markers[0].id,
    segmentIndex: 0,
    actionIndex: 0,
  });
  const [mapMode, setMapMode] = useState('marker');
  const [playTime, setPlayTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [mobileUrl, setMobileUrl] = useState('');
  const audioRef = useRef(null);

  const activeSegment =
    state.segments[selected.segmentIndex] || state.segments[0];
  const activeAction = activeSegment?.actions?.[selected.actionIndex] || null;
  const activeMarker =
    state.markers.find((marker) => marker.id === selected.markerId) ||
    state.markers[0];

  useEffect(() => {
    let cancelled = false;
    fetch(`${CONFIG_URL}?t=${Date.now()}`)
      .then((response) => {
        if (!response.ok) throw new Error('Không đọc được cấu hình');
        return response.json();
      })
      .then((config) => {
        if (cancelled) return;
        const normalized = normalizeConfig(config);
        setState(normalized);
        setSelected({
          kind: 'marker',
          markerId: normalized.markers[0]?.id || '',
          segmentIndex: 0,
          actionIndex: 0,
        });
      })
      .catch(() => setSaveStatus('Không đọc được cấu hình file.'));

    fetch('/ar-config/host-info')
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (!info || cancelled) return;
        setMobileUrl(info.httpsUrl || info.url || window.location.origin);
      })
      .catch(() => setMobileUrl(window.location.origin));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing || !activeSegment) return undefined;
    const startedAt = performance.now() - playTime * 1000;
    const timer = window.setInterval(() => {
      const next = (performance.now() - startedAt) / 1000;
      const duration = segmentDuration(activeSegment);
      if (next >= duration) {
        setPlayTime(duration);
        setPlaying(false);
        audioRef.current?.pause();
      } else {
        setPlayTime(Number(next.toFixed(2)));
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [activeSegment, playing, playTime]);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    if (activeSegment?.audioPath)
      audioRef.current.src = mediaPathToUrl(activeSegment.audioPath);
  }, [activeSegment]);

  const patchState = (updater) =>
    setState((current) => normalizeConfig(updater(current)));

  const updateMarker = (markerId, patch) => {
    patchState((current) => ({
      ...current,
      markers: current.markers.map((marker) =>
        marker.id === markerId ? { ...marker, ...patch } : marker,
      ),
    }));
  };

  const updateSegment = (index, patch) => {
    patchState((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) =>
        segmentIndex === index ? { ...segment, ...patch } : segment,
      ),
    }));
  };

  const updateCalibration = (patch) => {
    patchState((current) => ({
      ...current,
      calibration: {
        ...defaultMapCalibration,
        ...(current.calibration || {}),
        ...patch,
      },
    }));
  };

  const updateAction = (segmentIndex, actionIndex, patch) => {
    patchState((current) => ({
      ...current,
      segments: current.segments.map((segment, currentSegmentIndex) => {
        if (currentSegmentIndex !== segmentIndex) return segment;
        return {
          ...segment,
          actions: segment.actions.map((action, currentActionIndex) =>
            currentActionIndex === actionIndex
              ? { ...action, ...patch }
              : action,
          ),
        };
      }),
    }));
  };

  const updateActionTransform = (field, value) => {
    if (!activeAction) return;
    if (field === 'z') {
      updateAction(selected.segmentIndex, selected.actionIndex, {
        position: { ...(activeAction.position || {}), z: value },
        path: (activeAction.path || []).map((point) => ({
          ...point,
          z: value,
        })),
        transform: { ...(activeAction.transform || {}), z: value },
      });
      return;
    }
    const syncPatch = { [field]: value };
    if (field === 'yawOffset' || field === 'rotationZ') {
      syncPatch.yawOffset = value;
      syncPatch.rotationZ = value;
    }
    if (field === 'modelRotationX' || field === 'rotationX') {
      syncPatch.modelRotationX = value;
      syncPatch.rotationX = value;
    }
    if (field === 'modelRotationY' || field === 'rotationY') {
      syncPatch.modelRotationY = value;
      syncPatch.rotationY = value;
    }
    if (field === 'modelRotationZ') {
      syncPatch.modelRotationZ = value;
    }
    updateAction(selected.segmentIndex, selected.actionIndex, {
      transform: { ...(activeAction.transform || {}), ...syncPatch },
    });
  };

  const addMarker = () => {
    const marker = makeMarker(state.markers.length);
    patchState((current) => ({
      ...current,
      markers: [...current.markers, marker],
    }));
    setSelected((current) => ({
      ...current,
      kind: 'marker',
      markerId: marker.id,
    }));
  };

  const addSegment = () => {
    const segment = makeSegment(
      state.segments.length,
      state.markers[0]?.id || '',
    );
    patchState((current) => ({
      ...current,
      segments: [...current.segments, segment],
    }));
    setSelected((current) => ({
      ...current,
      segmentIndex: state.segments.length,
      actionIndex: 0,
    }));
    setPlayTime(0);
  };

  const addAction = (type = 'model') => {
    const markerId = activeMarker?.id || state.markers[0]?.id || '';
    const action = makeAction(type, markerId);
    patchState((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) =>
        segmentIndex === selected.segmentIndex
          ? { ...segment, actions: [...segment.actions, action] }
          : segment,
      ),
    }));
    setSelected((current) => ({
      ...current,
      kind: 'action',
      actionIndex: activeSegment.actions.length,
    }));
  };

  const removeAction = () => {
    if (!activeSegment?.actions?.length) return;
    patchState((current) => ({
      ...current,
      segments: current.segments.map((segment, segmentIndex) =>
        segmentIndex === selected.segmentIndex
          ? {
              ...segment,
              actions: segment.actions.filter(
                (_, index) => index !== selected.actionIndex,
              ),
            }
          : segment,
      ),
    }));
    setSelected((current) => ({
      ...current,
      actionIndex: Math.max(0, current.actionIndex - 1),
    }));
  };

  const handlePlacePoint = (point) => {
    if (mapMode === 'marker' && activeMarker) {
      updateMarker(activeMarker.id, { x: point.x, y: point.y });
      setSelected((current) => ({
        ...current,
        kind: 'marker',
        markerId: activeMarker.id,
      }));
    }
    if (mapMode === 'action' && activeAction) {
      updateAction(selected.segmentIndex, selected.actionIndex, {
        position: { ...(activeAction.position || {}), x: point.x, y: point.y },
      });
      setSelected((current) => ({ ...current, kind: 'action' }));
    }
    if (mapMode === 'path' && activeAction) {
      const z = transformValue(activeAction, 'z', 0.08);
      updateAction(selected.segmentIndex, selected.actionIndex, {
        path: [...(activeAction.path || []), { x: point.x, y: point.y, z }],
      });
      setSelected((current) => ({ ...current, kind: 'action' }));
    }
  };

  const saveConfig = async () => {
    setSaveStatus('Đang lưu cấu hình...');
    try {
      const response = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error || 'Lưu thất bại');
      setSaveStatus(
        'Đã lưu vào public/ar-config/ar-timeline-config.json. Tải lại trên điện thoại để dùng cấu hình mới.',
      );
    } catch (error) {
      setSaveStatus(`Không lưu được: ${error.message}`);
    }
  };

  const playSegment = async () => {
    const nextPlaying = !playing;
    setPlaying(nextPlaying);
    if (!audioRef.current || !activeSegment?.audioPath) return;
    if (nextPlaying) {
      audioRef.current.currentTime = playTime;
      try {
        await audioRef.current.play();
      } catch {
        // Trình duyệt có thể chặn audio local; timeline vẫn chạy để xem animation.
      }
    } else {
      audioRef.current.pause();
    }
  };

  const jsonPreview = useMemo(() => JSON.stringify(state, null, 2), [state]);

  return (
    <div className="grid gap-5 text-slate-950">
      <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full text-center md:w-auto md:text-left">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
              Trình dựng AR lịch sử
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Dựng voice, mốc và asset 3D trên bản đồ
            </h2>
          </div>
          <div className="mx-auto grid w-full gap-2 rounded-xl bg-white/10 p-3 md:mx-0 md:min-w-72 md:w-auto">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
              URL mở trên điện thoại
            </p>
            <input
              className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-950"
              readOnly
              value={mobileUrl || window.location.origin}
            />
            <button
              type="button"
              className="rounded-lg bg-amber-300 px-3 py-2 text-sm font-black text-slate-950"
              onClick={() =>
                navigator.clipboard?.writeText(
                  mobileUrl || window.location.origin,
                )
              }
            >
              Sao chép URL
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Hiệu chỉnh AR thật
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              Căn overlay với bản đồ ngoài đời
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass(Boolean(state.calibration?.showGuides))}
              onClick={() =>
                updateCalibration({
                  showGuides: !state.calibration?.showGuides,
                })
              }
            >
              {state.calibration?.showGuides
                ? 'Ẩn điểm căn AR'
                : 'Hiện điểm căn AR'}
            </button>
            <button
              type="button"
              className={buttonClass()}
              onClick={() => updateCalibration(defaultMapCalibration)}
            >
              Reset căn chỉnh
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <NumberStepper
            label="Dịch X"
            value={state.calibration?.offsetX ?? 0}
            step={0.1}
            min={-30}
            max={30}
            onChange={(value) => updateCalibration({ offsetX: value })}
          />
          <NumberStepper
            label="Dịch Y"
            value={state.calibration?.offsetY ?? 0}
            step={0.1}
            min={-30}
            max={30}
            onChange={(value) => updateCalibration({ offsetY: value })}
          />
          <NumberStepper
            label="Scale X"
            value={state.calibration?.scaleX ?? 1}
            step={0.01}
            min={0.5}
            max={1.5}
            onChange={(value) => updateCalibration({ scaleX: value })}
          />
          <NumberStepper
            label="Scale Y"
            value={state.calibration?.scaleY ?? 1}
            step={0.01}
            min={0.5}
            max={1.5}
            onChange={(value) => updateCalibration({ scaleY: value })}
          />
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-5">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Chế độ đặt trên bản đồ
                </p>
                <p className="text-sm font-semibold text-slate-600">
                  Click lên mặt bản đồ 3D hoặc kéo trực tiếp mốc/asset.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(mapModeLabels).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={buttonClass(mapMode === mode)}
                    onClick={() => setMapMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
              <TimelineMap3DPreview
                state={state}
                activeSegment={activeSegment}
                activeAction={activeAction}
                selected={selected}
                mapMode={mapMode}
                playTime={playTime}
                onSelect={(next) =>
                  setSelected((current) => ({ ...current, ...next }))
                }
                onPlacePoint={handlePlacePoint}
                onUpdateMarker={updateMarker}
                onUpdateAction={updateAction}
                onUpdateActionTransform={updateActionTransform}
              />
              <Quick3DControls
                selected={selected}
                activeMarker={activeMarker}
                activeAction={activeAction}
                activeSegment={activeSegment}
                onUpdateMarker={updateMarker}
                onUpdateAction={updateAction}
                onUpdateActionTransform={updateActionTransform}
              />
            </div>
          </div>

          <VoiceTimeline
            segment={activeSegment}
            selectedActionIndex={selected.actionIndex}
            playTime={playTime}
            playing={playing}
            onPlay={playSegment}
            onScrub={(value) => {
              setPlayTime(value);
              if (audioRef.current) audioRef.current.currentTime = value;
            }}
            onSelectAction={(index) =>
              setSelected((current) => ({
                ...current,
                kind: 'action',
                actionIndex: index,
              }))
            }
          />

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-black">Các đoạn giọng đọc</h3>
                <button
                  type="button"
                  onClick={addSegment}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                >
                  Thêm giọng đọc
                </button>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {state.segments.map((segment, index) => (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => {
                      setSelected((current) => ({
                        ...current,
                        segmentIndex: index,
                        actionIndex: 0,
                      }));
                      setPlayTime(0);
                    }}
                    className={`rounded-xl border p-3 text-left ${selected.segmentIndex === index ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <p className="font-black">{segment.title}</p>
                    <p className="mt-1 truncate text-xs opacity-75">
                      {segment.audioPath || 'Chưa gắn file âm thanh'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-black">Asset 3D</h3>
                <button
                  type="button"
                  onClick={removeAction}
                  className="rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white"
                >
                  Xóa asset
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {actionTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={buttonClass(activeAction?.type === type)}
                    onClick={() => addAction(type)}
                  >
                    Add {actionLabels[type] || type}
                  </button>
                ))}
              </div>
              {activeAction ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Loại asset
                    <select
                      className={fieldClass()}
                      value={activeAction.type}
                      onChange={(event) =>
                        updateAction(
                          selected.segmentIndex,
                          selected.actionIndex,
                          {
                            type: event.target.value,
                            assetPath:
                              defaultAssetByType[event.target.value] ||
                              activeAction.assetPath,
                          },
                        )
                      }
                    >
                      {actionTypes.map((type) => (
                        <option key={type} value={type}>
                          {actionLabels[type] || type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Đường dẫn GLB
                    <input
                      className={fieldClass()}
                      value={activeAction.assetPath || ''}
                      onChange={(event) =>
                        updateAction(
                          selected.segmentIndex,
                          selected.actionIndex,
                          { assetPath: event.target.value },
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-xl font-black">Bảng thông số</h3>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Đoạn giọng đọc đang chọn
              </p>
              <input
                className={fieldClass()}
                value={activeSegment?.title || ''}
                onChange={(event) =>
                  updateSegment(selected.segmentIndex, {
                    title: event.target.value,
                  })
                }
              />
              <input
                className={fieldClass()}
                placeholder="Đường dẫn audio"
                value={activeSegment?.audioPath || ''}
                onChange={(event) =>
                  updateSegment(selected.segmentIndex, {
                    audioPath: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Thời lượng
                  <input
                    type="number"
                    className={fieldClass()}
                    value={activeSegment?.duration || 0}
                    onChange={(event) =>
                      updateSegment(selected.segmentIndex, {
                        duration: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Mốc sáng sau giọng đọc
                  <select
                    className={fieldClass()}
                    value={activeSegment?.nextMarkerId || ''}
                    onChange={(event) =>
                      updateSegment(selected.segmentIndex, {
                        nextMarkerId: event.target.value,
                      })
                    }
                  >
                    <option value="">Không có</option>
                    {state.markers.map((marker) => (
                      <option key={marker.id} value={marker.id}>
                        {marker.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Mốc trên bản đồ
                </p>
                <button
                  type="button"
                  onClick={addMarker}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                >
                  Add mốc
                </button>
              </div>
              <select
                className={fieldClass()}
                value={activeMarker?.id || ''}
                onChange={(event) =>
                  setSelected((current) => ({
                    ...current,
                    kind: 'marker',
                    markerId: event.target.value,
                  }))
                }
              >
                {state.markers.map((marker) => (
                  <option key={marker.id} value={marker.id}>
                    {marker.label}
                  </option>
                ))}
              </select>
              {activeMarker ? (
                <>
                  <input
                    className={fieldClass()}
                    value={activeMarker.label}
                    onChange={(event) =>
                      updateMarker(activeMarker.id, {
                        label: event.target.value,
                      })
                    }
                  />
                  <input
                    className={fieldClass()}
                    placeholder="Đường dẫn video khi bấm mốc"
                    value={activeMarker.videoPath || ''}
                    onChange={(event) =>
                      updateMarker(activeMarker.id, {
                        videoPath: event.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      className={fieldClass()}
                      value={activeMarker.x}
                      onChange={(event) =>
                        updateMarker(activeMarker.id, {
                          x: Number(event.target.value),
                        })
                      }
                    />
                    <input
                      type="number"
                      step="0.1"
                      className={fieldClass()}
                      value={activeMarker.y}
                      onChange={(event) =>
                        updateMarker(activeMarker.id, {
                          y: Number(event.target.value),
                        })
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      className={fieldClass()}
                      value={activeMarker.z}
                      onChange={(event) =>
                        updateMarker(activeMarker.id, {
                          z: Number(event.target.value),
                        })
                      }
                    />
                    <input
                      type="number"
                      step="0.1"
                      className={fieldClass()}
                      value={activeMarker.scale}
                      onChange={(event) =>
                        updateMarker(activeMarker.id, {
                          scale: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    Order: X %, Y %, Độ cao Z, marker size.
                  </p>
                </>
              ) : null}
            </div>

            {activeAction ? (
              <div className="grid gap-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Asset đang chọn
                </p>
                <input
                  className={fieldClass()}
                  value={activeAction.label || ''}
                  onChange={(event) =>
                    updateAction(selected.segmentIndex, selected.actionIndex, {
                      label: event.target.value,
                    })
                  }
                />
                <select
                  className={fieldClass()}
                  value={activeAction.pointId || ''}
                  onChange={(event) =>
                    updateAction(selected.segmentIndex, selected.actionIndex, {
                      pointId: event.target.value,
                    })
                  }
                >
                  {state.markers.map((marker) => (
                    <option key={marker.id} value={marker.id}>
                      {marker.label}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Xuất hiện ở giây
                    <input
                      type="number"
                      step="0.1"
                      className={fieldClass()}
                      value={activeAction.startAt}
                      onChange={(event) =>
                        updateAction(
                          selected.segmentIndex,
                          selected.actionIndex,
                          { startAt: Number(event.target.value) },
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Hiện trong bao lâu
                    <input
                      type="number"
                      step="0.1"
                      className={fieldClass()}
                      value={activeAction.duration}
                      onChange={(event) =>
                        updateAction(
                          selected.segmentIndex,
                          selected.actionIndex,
                          { duration: Number(event.target.value) },
                        )
                      }
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    className={fieldClass()}
                    value={activeAction.position?.x ?? 50}
                    onChange={(event) =>
                      updateAction(
                        selected.segmentIndex,
                        selected.actionIndex,
                        {
                          position: {
                            ...activeAction.position,
                            x: Number(event.target.value),
                          },
                        },
                      )
                    }
                  />
                  <input
                    type="number"
                    step="0.1"
                    className={fieldClass()}
                    value={activeAction.position?.y ?? 50}
                    onChange={(event) =>
                      updateAction(
                        selected.segmentIndex,
                        selected.actionIndex,
                        {
                          position: {
                            ...activeAction.position,
                            y: Number(event.target.value),
                          },
                        },
                      )
                    }
                  />
                  <input
                    type="number"
                    step="0.01"
                    className={fieldClass()}
                    value={
                      activeAction.position?.z ??
                      transformValue(activeAction, 'z', 0.08)
                    }
                    onChange={(event) =>
                      updateActionTransform('z', Number(event.target.value))
                    }
                  />
                </div>
                <p className="text-xs font-bold text-slate-500">
                  Asset position: X %, Y %, Độ cao Z relative to map surface.
                </p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <input
                    type="number"
                    step="0.01"
                    className={fieldClass()}
                    value={transformValue(activeAction, 'z', 0.08)}
                    onChange={(event) =>
                      updateActionTransform('z', Number(event.target.value))
                    }
                  />
                  <input
                    type="number"
                    step="0.1"
                    className={fieldClass()}
                    value={transformValue(activeAction, 'scale', 1)}
                    onChange={(event) =>
                      updateActionTransform('scale', Number(event.target.value))
                    }
                  />
                  <input
                    type="number"
                    step="1"
                    className={fieldClass()}
                    value={transformValue(
                      activeAction,
                      'modelRotationX',
                      transformValue(activeAction, 'rotationX', 0),
                    )}
                    onChange={(event) =>
                      updateActionTransform(
                        'modelRotationX',
                        Number(event.target.value),
                      )
                    }
                  />
                  <input
                    type="number"
                    step="1"
                    className={fieldClass()}
                    value={transformValue(
                      activeAction,
                      'yawOffset',
                      transformValue(activeAction, 'rotationZ', 0),
                    )}
                    onChange={(event) =>
                      updateActionTransform(
                        'yawOffset',
                        Number(event.target.value),
                      )
                    }
                  />
                </div>
                <p className="text-xs font-bold text-slate-500">
                  Order: Độ cao Z, scale, rotate X, rotate Z.
                </p>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(
                      activeAction.transform?.followPathRotation,
                    )}
                    onChange={(event) =>
                      updateActionTransform(
                        'followPathRotation',
                        event.target.checked,
                      )
                    }
                  />
                  Tự xoay theo hướng di chuyển trên đường đi
                </label>
                <div className="rounded-lg bg-white p-3 text-xs font-bold text-slate-500">
                  Position: {pointValue(activeAction.position)} | Số điểm đường
                  đi: {activeAction.path?.length || 0}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black">Lưu cấu hình / JSON</h3>
            <button
              type="button"
              onClick={saveConfig}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-black text-slate-950"
            >
              Lưu cấu hình
            </button>
          </div>
          {saveStatus ? (
            <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm text-amber-100">
              {saveStatus}
            </p>
          ) : null}
          <pre className="mt-4 max-h-[640px] overflow-auto rounded-xl bg-black/40 p-4 text-xs leading-5 text-slate-200">
            {jsonPreview}
          </pre>
        </div>
      </div>
    </div>
  );
}
