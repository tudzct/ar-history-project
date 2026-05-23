import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle,
  Trophy,
  Map,
  Clock3,
  Boxes,
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  Target,
  Brain,
  Layers3,
  Search,
  Lock,
  ArrowLeft,
} from "lucide-react";
import MapImageARScene from "./MapImageARScene.jsx";

const courses = [
  {
    id: "dien-bien-phu",
    title: "Chiến dịch Điện Biên Phủ",
    period: "1953 - 1954",
    status: "Đang học",
    progress: 68,
    accent: "from-amber-500 to-orange-600",
    image:
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=1200&auto=format&fit=crop",
    description:
      "Tìm hiểu bối cảnh, diễn biến, chiến thuật và ý nghĩa lịch sử của chiến thắng Điện Biên Phủ.",
    lessons: 5,
    quiz: 12,
    ar: true,
  },
  {
    id: "bach-dang",
    title: "Trận Bạch Đằng",
    period: "938",
    status: "Sắp mở",
    progress: 0,
    accent: "from-sky-500 to-blue-700",
    description: "Mô phỏng địa hình sông nước, cọc gỗ và chiến thuật thủy chiến.",
    lessons: 4,
    quiz: 8,
    ar: true,
    locked: true,
  },
  {
    id: "tay-son",
    title: "Phong trào Tây Sơn",
    period: "1771 - 1802",
    status: "Sắp mở",
    progress: 0,
    accent: "from-emerald-500 to-teal-700",
    description: "Theo dõi hành trình khởi nghĩa, thống nhất đất nước và các trận đánh lớn.",
    lessons: 6,
    quiz: 10,
    ar: true,
    locked: true,
  },
];

const dienBienPhu = {
  title: "Chiến dịch Điện Biên Phủ",
  subtitle: "Bài học mẫu hoàn chỉnh",
  videoUrl: "",
  summary:
    "Một khóa học ngắn giúp người học hiểu vì sao Điện Biên Phủ trở thành chiến thắng có ý nghĩa lớn trong lịch sử Việt Nam hiện đại.",
  learningGoals: [
    "Nắm được bối cảnh trước chiến dịch",
    "Theo dõi các giai đoạn chính theo timeline",
    "Hiểu vai trò của địa hình, hậu cần và chiến thuật",
    "Kiểm tra kiến thức bằng quiz tương tác",
  ],
  timeline: [
    {
      date: "Cuối 1953",
      title: "Hình thành tập đoàn cứ điểm",
      text: "Pháp xây dựng Điện Biên Phủ thành cứ điểm mạnh nhằm kiểm soát khu vực Tây Bắc và tạo lợi thế quân sự.",
      tag: "Bối cảnh",
    },
    {
      date: "13/03/1954",
      title: "Mở màn chiến dịch",
      text: "Quân ta bắt đầu tiến công, tập trung vào các cứ điểm quan trọng để phá thế phòng thủ ban đầu.",
      tag: "Giai đoạn 1",
    },
    {
      date: "30/03 - 26/04/1954",
      title: "Tấn công các cứ điểm phía Đông",
      text: "Chiến sự diễn ra quyết liệt, hai bên giằng co từng vị trí. Đây là giai đoạn thể hiện rõ vai trò công sự và hỏa lực.",
      tag: "Giai đoạn 2",
    },
    {
      date: "01/05 - 07/05/1954",
      title: "Tổng công kích",
      text: "Quân ta mở đợt tấn công cuối, siết chặt vòng vây và giành thắng lợi vào ngày 07/05/1954.",
      tag: "Kết thúc",
    },
  ],
};

const quizQuestions = [
  {
    question: "Chiến dịch Điện Biên Phủ kết thúc vào ngày nào?",
    options: ["13/03/1954", "30/04/1954", "07/05/1954", "02/09/1954"],
    answer: 2,
    explain: "Chiến dịch kết thúc thắng lợi vào ngày 07/05/1954.",
  },
  {
    question: "Yếu tố nào được nhấn mạnh trong mô phỏng AR của bài học này?",
    options: ["Thời trang", "Địa hình và cứ điểm", "Âm nhạc", "Thương mại"],
    answer: 1,
    explain: "AR có thể dùng để mô phỏng địa hình, cứ điểm, đường tiến công và vòng vây.",
  },
  {
    question: "Timeline trong bài học giúp người học làm gì?",
    options: [
      "Theo dõi diễn biến theo thời gian",
      "Đăng nhập tài khoản",
      "Mua khóa học",
      "Tạo backend",
    ],
    answer: 0,
    explain: "Timeline giúp chia nhỏ sự kiện lịch sử theo mốc thời gian dễ hiểu.",
  },
];

function ProgressBar({ value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-900 transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Pill({ children, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

function CourseCard({ course, onOpen }) {
  return (
    <motion.button
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => !course.locked && onOpen(course.id)}
      className="group relative overflow-hidden rounded-[2rem] bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-xl"
    >
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${course.accent}`} />
      <div className="relative flex min-h-[260px] flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <Pill icon={Clock3}>{course.period}</Pill>
            <Pill icon={course.locked ? Lock : Sparkles}>{course.status}</Pill>
          </div>
          <div className="rounded-[1.5rem] bg-white/95 p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-950">{course.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-50 p-3">
                <BookOpen className="mx-auto h-5 w-5 text-slate-700" />
                <p className="mt-1 text-xs text-slate-500">Bài học</p>
                <p className="font-bold">{course.lessons}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <Brain className="mx-auto h-5 w-5 text-slate-700" />
                <p className="mt-1 text-xs text-slate-500">Quiz</p>
                <p className="font-bold">{course.quiz}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <Boxes className="mx-auto h-5 w-5 text-slate-700" />
                <p className="mt-1 text-xs text-slate-500">AR</p>
                <p className="font-bold">Có</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tiến độ</span>
            <span>{course.progress}%</span>
          </div>
          <ProgressBar value={course.progress} />
          <div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-900">
            <span>{course.locked ? "Xem trước nội dung" : "Vào khóa học"}</span>
            <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function Hero({ onStart }) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl md:p-10">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
      <div className="absolute -bottom-28 left-20 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Web-app học lịch sử bằng video, quiz, timeline và AR
          </div>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Học lịch sử như đang bước vào chính sự kiện.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            Bản FE mẫu này tập trung vào trải nghiệm người học: chọn khóa học, xem video, theo dõi diễn biến bằng timeline, làm quiz và có sẵn khu vực để gắn mô phỏng AR sau này.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-100"
            >
              Xem bài Điện Biên Phủ
              <ChevronRight className="h-5 w-5" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold text-white/90 transition hover:bg-white/10">
              <PlayCircle className="h-5 w-5" />
              Xem demo giao diện
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="rounded-[1.5rem] bg-slate-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">AR Preview</p>
                  <p className="font-bold">Mô phỏng cứ điểm</p>
                </div>
                <Boxes className="h-6 w-6 text-amber-300" />
              </div>
              <div className="grid h-72 grid-cols-6 gap-2 rounded-2xl bg-[radial-gradient(circle_at_center,_#334155,_#0f172a_65%)] p-4">
                {Array.from({ length: 30 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.015 }}
                    className={`rounded-xl ${
                      [4, 10, 11, 17, 22].includes(index)
                        ? "bg-orange-400/80 shadow-lg shadow-orange-500/20"
                        : [7, 8, 13, 19, 20, 25].includes(index)
                        ? "bg-emerald-400/70"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Khu vực này sau có thể thay bằng WebXR, model 3D hoặc scene AR thật.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelinePanel() {
  const [active, setActive] = useState(0);
  const selected = dienBienPhu.timeline[active];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <Clock3 className="h-5 w-5" />
          Timeline chiến dịch
        </h3>
        <div className="mt-6 space-y-3">
          {dienBienPhu.timeline.map((item, index) => (
            <button
              key={item.date}
              onClick={() => setActive(index)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                active === index
                  ? "border-slate-900 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">{item.date}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    active === index ? "bg-white/15 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {item.tag}
                </span>
              </div>
              <p className="mt-2 font-semibold">{item.title}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white">
          <p className="text-sm font-semibold text-white/80">{selected.date}</p>
          <h3 className="mt-2 text-3xl font-black">{selected.title}</h3>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="p-6"
          >
            <p className="text-base leading-8 text-slate-600">{selected.text}</p>
            <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                <Map className="h-5 w-5" />
                Bản đồ tương tác tượng trưng
              </div>
              <div className="relative h-72 overflow-hidden rounded-2xl bg-slate-200">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,_#fcd34d,_transparent_22%),radial-gradient(circle_at_70%_55%,_#fb923c,_transparent_18%),radial-gradient(circle_at_50%_80%,_#64748b,_transparent_25%)]" />
                <div className="absolute left-[28%] top-[30%] rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                  Cứ điểm
                </div>
                <div className="absolute bottom-[24%] right-[18%] rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  Hướng tiến công
                </div>
                <div className="absolute left-[42%] top-[50%] h-24 w-24 rounded-full border-4 border-dashed border-red-600/70" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function VideoPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="overflow-hidden rounded-[2rem] bg-slate-950 shadow-sm">
        {dienBienPhu.videoUrl ? (
          <iframe
            className="aspect-video w-full"
            src={dienBienPhu.videoUrl}
            title="Video bài học"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#334155,_#020617_70%)] p-8 text-center text-white">
            <PlayCircle className="h-16 w-16 text-amber-300" />
            <h3 className="mt-5 text-2xl font-black">Video bài học Điện Biên Phủ</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Hiện đang dùng placeholder. Khi có video, chỉ cần gắn link iframe hoặc video URL trực tiếp trong FE.
            </p>
          </div>
        )}
      </div>
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-xl font-bold text-slate-950">Nội dung video</h3>
        <div className="mt-5 space-y-4">
          {[
            ["00:00", "Bối cảnh lịch sử"],
            ["02:15", "Vì sao chọn Điện Biên Phủ?"],
            ["05:40", "Các giai đoạn chính"],
            ["09:10", "Ý nghĩa chiến thắng"],
          ].map(([time, title]) => (
            <div key={time} className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              <span className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">{time}</span>
              <span className="font-semibold text-slate-700">{title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizPanel() {
  const [answers, setAnswers] = useState({});
  const score = useMemo(
    () => quizQuestions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0),
    [answers]
  );
  const completed = Object.keys(answers).length === quizQuestions.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
        <Trophy className="h-10 w-10 text-amber-300" />
        <h3 className="mt-4 text-3xl font-black">Quiz kiểm tra</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Logic quiz chạy hoàn toàn ở FE. Có thể thay câu hỏi trong mảng dữ liệu mà không cần backend.
        </p>
        <div className="mt-8 rounded-[1.5rem] bg-white/10 p-5">
          <p className="text-sm text-slate-300">Điểm hiện tại</p>
          <p className="mt-2 text-5xl font-black">
            {score}/{quizQuestions.length}
          </p>
          {completed ? (
            <p className="mt-3 text-sm text-emerald-300">Bạn đã hoàn thành quiz.</p>
          ) : (
            <p className="mt-3 text-sm text-amber-200">Hãy chọn đáp án cho tất cả câu hỏi.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {quizQuestions.map((q, qIndex) => (
          <div key={q.question} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h4 className="font-bold text-slate-950">
              Câu {qIndex + 1}. {q.question}
            </h4>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {q.options.map((option, optionIndex) => {
                const picked = answers[qIndex] === optionIndex;
                const isCorrect = q.answer === optionIndex;
                const answered = answers[qIndex] !== undefined;
                return (
                  <button
                    key={option}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }))}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left text-sm font-semibold transition ${
                      picked && isCorrect
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : picked && !isCorrect
                        ? "border-red-500 bg-red-50 text-red-800"
                        : answered && isCorrect
                        ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {option}
                    {picked && isCorrect ? <CheckCircle2 className="h-5 w-5" /> : null}
                    {picked && !isCorrect ? <XCircle className="h-5 w-5" /> : null}
                  </button>
                );
              })}
            </div>
            {answers[qIndex] !== undefined ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {q.explain}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ARPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="flex items-center gap-2 text-2xl font-black text-slate-950">
          <Boxes className="h-6 w-6" />
          Khu vực mô phỏng AR
        </h3>
        <p className="mt-4 leading-8 text-slate-600">
          Đây là chỗ giữ sẵn để sau này tích hợp mô phỏng AR. Trước mắt FE có nút, layout, trạng thái và nội dung hướng dẫn để người dùng hiểu tính năng này sẽ làm gì.
        </p>
        <div className="mt-6 grid gap-3">
          {[
            "Gắn model 3D địa hình lòng chảo Điện Biên Phủ",
            "Hiển thị vị trí cứ điểm, đường tiến công và vòng vây",
            "Cho phép xoay, phóng to, xem từng lớp thông tin",
            "Sau này tích hợp WebXR hoặc thư viện AR riêng",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800">
          Mở chế độ AR demo
          <Layers3 className="h-5 w-5" />
        </button>
      </div>
      <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">MindAR Image Tracking</p>
            <h3 className="text-2xl font-black">Điện Biên Phủ 3D Map</h3>
          </div>
          <Target className="h-8 w-8 text-amber-300" />
        </div>
        <div className="mt-6">
          <MapImageARScene />
        </div>
      </div>
    </div>
  );
}

function LessonView({ onBack }) {
  const [tab, setTab] = useState("overview");
  const tabs = [
    ["overview", "Tổng quan", BookOpen],
    ["video", "Video", PlayCircle],
    ["timeline", "Timeline", Clock3],
    ["quiz", "Quiz", Brain],
    ["ar", "AR", Boxes],
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại khóa học
        </button>

        <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-900 p-6 text-white md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
                  {dienBienPhu.subtitle}
                </p>
                <h1 className="mt-3 text-4xl font-black md:text-6xl">{dienBienPhu.title}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{dienBienPhu.summary}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Tiến độ bài học</p>
                <p className="mt-1 text-4xl font-black">68%</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white p-3">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition ${
                    tab === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "overview" ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="text-2xl font-black">Mục tiêu bài học</h2>
                    <div className="mt-5 grid gap-3">
                      {dienBienPhu.learningGoals.map((goal) => (
                        <div key={goal} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="font-medium text-slate-700">{goal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="text-2xl font-black">Lộ trình học</h2>
                    <div className="mt-5 space-y-4">
                      {[
                        ["1", "Xem video tổng quan"],
                        ["2", "Theo dõi timeline"],
                        ["3", "Khám phá mô phỏng AR"],
                        ["4", "Làm quiz củng cố"],
                      ].map(([step, text]) => (
                        <div key={step} className="flex items-center gap-4">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 font-bold text-white">
                            {step}
                          </div>
                          <p className="font-semibold text-slate-700">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              {tab === "video" ? <VideoPanel /> : null}
              {tab === "timeline" ? <TimelinePanel /> : null}
              {tab === "quiz" ? <QuizPanel /> : null}
              {tab === "ar" ? <ARPanel /> : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Dashboard({ onOpenLesson }) {
  const [search, setSearch] = useState("");
  const filtered = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">History AR Learning</p>
              <h2 className="text-xl font-black">Lịch sử sống động</h2>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm khóa học..."
              className="w-full rounded-full border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </nav>

        <Hero onStart={() => onOpenLesson("dien-bien-phu")} />

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Khóa học</p>
              <h2 className="mt-2 text-3xl font-black">Chọn chủ đề lịch sử</h2>
            </div>
            <p className="hidden max-w-md text-right text-sm leading-6 text-slate-500 md:block">
              Mỗi khóa học có thể đại diện cho một giai đoạn, một nhân vật, một chiến dịch hoặc một trận đánh.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} onOpen={onOpenLesson} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HistoryARLearningApp() {
  const [screen, setScreen] = useState("dashboard");

  return screen === "lesson" ? (
    <LessonView onBack={() => setScreen("dashboard")} />
  ) : (
    <Dashboard onOpenLesson={() => setScreen("lesson")} />
  );
}
