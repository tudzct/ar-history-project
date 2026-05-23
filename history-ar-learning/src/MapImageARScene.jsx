import { useRef, useState } from "react";

const TARGET_IMAGE = "/ar-targets/dien_bien_phu_map.jpg";
const TARGET_WIDTH = 1419;
const TARGET_HEIGHT = 1491;
const TARGET_ASPECT = 1491 / 1419;
const POINT_OFFSET = [-0.035, -0.035];

const scripts = [
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image.prod.js",
  "https://aframe.io/releases/1.2.0/aframe.min.js",
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.1.4/dist/mindar-image-aframe.prod.js",
];

const points = [
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
let targetPromise;

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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot load target image"));
    image.src = src;
  });
}

async function compileTarget(setLoading) {
  if (targetPromise) return targetPromise;

  targetPromise = (async () => {
    const Compiler = window.MINDAR?.Compiler || window.MINDAR?.IMAGE?.Compiler;
    if (!Compiler) {
      const keys = window.MINDAR ? Object.keys(window.MINDAR).join(", ") : "no MINDAR global";
      throw new Error(`MindAR compiler is not ready (${keys})`);
    }

    setLoading({ active: true, title: "Chuan bi ban do", note: "Dang tao target AR lan dau", progress: 20 });
    const image = await loadImage(TARGET_IMAGE);
    const compiler = new Compiler();
    await compiler.compileImageTargets([image], (progress) => {
      setLoading({
        active: true,
        title: "Dang nap ban do",
        note: "Lan dau co the mat vai giay",
        progress: Math.max(25, Math.round(progress * 100)),
      });
    });
    setLoading({ active: true, title: "Hoan tat target", note: "Dang khoi tao camera", progress: 96 });
    const buffer = await compiler.exportData();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    return URL.createObjectURL(blob);
  })();

  return targetPromise;
}

function pixelToAR([x, y], offset = [0, 0], z = 0) {
  const arX = x / TARGET_WIDTH - 0.5 + POINT_OFFSET[0] + offset[0];
  const arY = (0.5 - y / TARGET_HEIGHT) * TARGET_ASPECT + POINT_OFFSET[1] + offset[1];
  return `${arX.toFixed(3)} ${arY.toFixed(3)} ${z}`;
}

function hotspotMarkup(point) {
  const position = pixelToAR(point.pixel, point.offset);
  return `
    <a-entity class="hotspot" data-point="${point.id}" position="${position}">
      <a-circle class="hotspot" data-point="${point.id}" radius="0.012" position="0 0 0.0005" color="${point.color}" opacity="0.92"></a-circle>
      <a-ring class="hotspot" data-point="${point.id}" radius-inner="0.018" radius-outer="0.021" position="0 0 0.0006" color="${point.color}" opacity="0.9"></a-ring>
    </a-entity>
  `;
}

function buildScene(targetUrl) {
  return `
    <a-scene
      mindar-image="imageTargetSrc: ${targetUrl}; autoStart: true; uiScanning: yes; uiLoading: yes; filterMinCF: 0.0001; filterBeta: 0.001"
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
        raycaster="objects: .hotspot"
      ></a-camera>

      <a-entity mindar-image-target="targetIndex: 0">
        ${points.map(hotspotMarkup).join("")}
      </a-entity>
    </a-scene>
  `;
}

export default function MapImageARScene() {
  const sceneHostRef = useRef(null);
  const sceneRef = useRef(null);
  const [loading, setLoading] = useState({
    active: false,
    title: "",
    note: "",
    progress: 0,
    error: "",
  });
  const [selected, setSelected] = useState(points[0]);
  const [running, setRunning] = useState(false);

  const startMindAR = async () => {
    if (running) return;

    setRunning(true);
    setLoading({ active: true, title: "Dang tai AR", note: "Nap thu vien camera", progress: 8, error: "" });

    try {
      await loadMindARScripts();
      setLoading({ active: true, title: "Dang tai AR", note: "Nap MindAR thanh cong", progress: 18, error: "" });
      const targetUrl = await compileTarget(setLoading);

      if (!sceneHostRef.current) return;
      setLoading({ active: true, title: "Dang mo camera", note: "Hay chap nhan quyen camera neu duoc hoi", progress: 98, error: "" });
      sceneHostRef.current.innerHTML = buildScene(targetUrl);
      sceneRef.current = sceneHostRef.current.querySelector("a-scene");

      sceneRef.current.addEventListener("arReady", () => setLoading((prev) => ({ ...prev, active: false, progress: 100 })));
      sceneRef.current.addEventListener("arError", () =>
        setLoading({
          active: true,
          title: "Khong mo duoc camera",
          note: "Hay kiem tra HTTPS va quyen camera",
          progress: 100,
          error: "camera",
        })
      );

      sceneHostRef.current.querySelectorAll(".hotspot").forEach((hotspot) => {
        hotspot.addEventListener("click", () => {
          const point = points.find((item) => item.id === hotspot.dataset.point);
          if (point) setSelected(point);
        });
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
    <div className="relative min-h-[560px] overflow-hidden rounded-[1.5rem] bg-slate-950">
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

      <div ref={sceneHostRef} className="absolute inset-0 z-0 [&_a-scene]:h-full [&_a-scene]:w-full" />

      {loading.active ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/72 p-6 text-white backdrop-blur-sm">
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

      <div className="absolute bottom-4 left-4 right-4 z-30 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-950 shadow-lg backdrop-blur">
          <p className="text-sm font-black">{selected.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{selected.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={TARGET_IMAGE}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-slate-100"
          >
            Map target
          </a>
          <button
            type="button"
            onClick={running ? stopMindAR : startMindAR}
            className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-200"
          >
            {running ? "Stop AR" : "Start AR"}
          </button>
        </div>
      </div>
    </div>
  );
}
