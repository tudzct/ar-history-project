import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Info, Shield, Crosshair } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WEAPONS = [
  {
    id: "mosin",
    name: "Mosin-Nagant M91",
    type: "Súng trường nạp đạn thủ công",
    description: "Khẩu súng trường huyền thoại gắn liền với quân đội Xô Viết, được trang bị rộng rãi cho bộ đội Việt Minh trong chiến dịch Điện Biên Phủ. Súng bắn tỉa với độ chính xác cao và sức sát thương lớn, nổi tiếng qua những trận đánh bắn tỉa chiến hào.",
    path: "/ar-assets/weapons/mosin_nagant_m91.glb",
  },
  {
    id: "ak47",
    name: "AK-47",
    type: "Súng trường tấn công",
    description: "Mặc dù AK-47 không phổ biến trong giai đoạn Điện Biên Phủ (1954) bằng các loại vũ khí khác, nhưng nó là biểu tượng cực kỳ quan trọng của quân đội Việt Nam trong các giai đoạn kháng chiến sau này nhờ khả năng hoạt động cực kỳ bền bỉ trong điều kiện khắc nghiệt.",
    path: "/ar-assets/weapons/ak47.glb",
  },
  {
    id: "ar15",
    name: "AR-15",
    type: "Súng trường tấn công",
    description: "Góp mặt chủ yếu vào giai đoạn Chiến tranh Việt Nam sau này. Trọng lượng nhẹ, tốc độ bắn nhanh nhưng đòi hỏi bảo trì thường xuyên. Đại diện cho vũ khí bộ binh của phe đối phương.",
    path: "/ar-assets/weapons/ar15.glb",
  },
];

function WeaponModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function WeaponGalleryPanel() {
  const [activeId, setActiveId] = useState(WEAPONS[0].id);
  const activeWeapon = WEAPONS.find((w) => w.id === activeId);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      {/* Cột danh sách và thông tin */}
      <div className="flex flex-col gap-6">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="flex items-center gap-2 text-2xl font-black text-slate-950">
            <Shield className="h-6 w-6 text-amber-600" />
            Vũ khí lịch sử
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Khám phá chi tiết các loại vũ khí nổi bật. Bạn có thể dùng chuột hoặc tay để xoay, phóng to, thu nhỏ mô hình 3D.
          </p>

          <div className="mt-6 space-y-3">
            {WEAPONS.map((weapon) => {
              const isActive = weapon.id === activeId;
              return (
                <button
                  key={weapon.id}
                  onClick={() => setActiveId(weapon.id)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <p className="font-bold">{weapon.name}</p>
                    <p className={`text-xs mt-1 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {weapon.type}
                    </p>
                  </div>
                  {isActive && <Crosshair className="h-5 w-5 text-amber-300" />}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeWeapon.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-[2rem] bg-amber-50 p-6 shadow-sm ring-1 ring-amber-200/50"
          >
            <div className="flex items-center gap-2 font-bold text-amber-900 mb-3">
              <Info className="h-5 w-5" />
              Thông tin chi tiết
            </div>
            <p className="text-sm leading-7 text-amber-800">
              {activeWeapon.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cột hiển thị 3D */}
      <div className="relative min-h-[500px] overflow-hidden rounded-[2rem] bg-slate-900 shadow-sm">
        <div className="absolute left-6 top-6 z-10">
          <span className="inline-block rounded-full bg-white/10 px-4 py-2 text-xs font-bold tracking-widest text-white backdrop-blur">
            MÔ HÌNH 3D TƯƠNG TÁC
          </span>
        </div>
        
        {/* React Three Fiber Canvas */}
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50, near: 0.1, far: 1000 }}>
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#334155" wireframe />
              </mesh>
            }
          >
            <Stage 
              environment="city" 
              intensity={0.6} 
              contactShadow={{ opacity: 0.7, blur: 2, resolution: 512 }}
              adjustCamera={1.2}
            >
              <WeaponModel url={activeWeapon.path} />
            </Stage>
          </Suspense>
          <OrbitControls 
            makeDefault
            autoRotate 
            autoRotateSpeed={1} 
            enablePan={false}
            enableZoom={true}
          />
        </Canvas>

        <div className="absolute bottom-6 left-0 right-0 z-10 text-center">
           <p className="text-xs font-medium text-slate-400">
             Kéo thả để xoay • Cuộn để zoom
           </p>
        </div>
      </div>
    </div>
  );
}
