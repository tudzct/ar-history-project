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
  Swords,
  ShieldUser,
} from "lucide-react";
import MapImageARScene from "./MapImageARScene.jsx";
import TimelineEditor from "./TimelineEditor.jsx";
import WeaponGalleryPanel from "./WeaponGalleryPanel.jsx";
import VideoAITutorPage from "./pages/VideoAITutorPage.jsx";
import VideoLessonChatPanel from "./components/ai/VideoLessonChatPanel.jsx";

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
  videoUrl: "https://www.youtube.com/embed/a6ucOeP11Gk?rel=0",
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
          <h1 className="max-w-3xl text-2xl font-black tracking-tight md:text-4xl">
            Học lịch sử như đang bước vào chính sự kiện.
          </h1>
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
  const [playerStart, setPlayerStart] = useState(0);
  const playerParams = new URLSearchParams({
    rel: "0",
    start: String(Math.floor(playerStart || 0)),
    autoplay: playerStart > 0 ? "1" : "0",
  });
  const playerSrc = dienBienPhu.videoUrl
    ? `${dienBienPhu.videoUrl.split("?")[0]}?${playerParams.toString()}`
    : "";

  return (
    <div className="space-y-6">
      <div className="grid items-center gap-6 lg:grid-cols-[7fr_3fr]">
        <div className="overflow-hidden rounded-[2rem] bg-slate-950 shadow-sm">
          {dienBienPhu.videoUrl ? (
            <iframe
              key={playerSrc}
              className="aspect-video w-full"
              src={playerSrc}
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
        <VideoLessonChatPanel youtubeUrl={dienBienPhu.videoUrl} onJumpToTime={(seconds) => setPlayerStart(seconds)} />
      </div>
    </div>
  );
}

function QuizPanel() {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ranking, setRanking] = useState([
    { name: "Lan", score: 3 },
    { name: "Minh", score: 2 },
    { name: "Huy", score: 2 },
  ]);
  const score = useMemo(
    () => quizQuestions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0),
    [answers]
  );
  const currentQuestion = quizQuestions[currentIndex];
  const pickedAnswer = answers[currentIndex];
  const isLastQuestion = currentIndex === quizQuestions.length - 1;
  const sortedRanking = useMemo(() => [...ranking].sort((a, b) => b.score - a.score), [ranking]);
  const confetti = Array.from({ length: 28 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 13) % 88)}%`,
    delay: `${(index % 9) * 0.12}s`,
    color: ["#facc15", "#38bdf8", "#fb7185", "#22c55e", "#a78bfa"][index % 5],
  }));
  const submitQuiz = () => {
    setSubmitted(true);
    setRanking((prev) => [...prev.filter((item) => item.name !== "Bạn"), { name: "Bạn", score }]);
  };
  const restartQuiz = () => {
    setStarted(false);
    setSubmitted(false);
    setCurrentIndex(0);
    setAnswers({});
  };

  if (!started) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-sm">
          <Trophy className="h-12 w-12 text-amber-300" />
          <h3 className="mt-5 text-3xl font-semibold">Quiz kiểm tra</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Trả lời lần lượt từng câu hỏi. Đến câu cuối, bấm Submit để tính điểm và cập nhật ranking.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            Bắt đầu làm quiz
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h4 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ranking
          </h4>
          <div className="mt-5 grid gap-3">
            {sortedRanking.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                <span>#{index + 1} {item.name}</span>
                <span>{item.score}/{quizQuestions.length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-sm">
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="quiz-confetti"
            style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color }}
          />
        ))}
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Sparkles className="h-12 w-12 text-amber-300" />
            <h3 className="mt-5 text-4xl font-semibold">Chúc mừng!</h3>
            <p className="mt-3 text-lg text-slate-200">Bạn đạt {score}/{quizQuestions.length} điểm.</p>
            <button
              type="button"
              onClick={restartQuiz}
              className="mt-8 rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Làm lại
            </button>
          </div>
          <div className="rounded-[1.5rem] bg-white/10 p-5">
            <h4 className="text-xl font-semibold">Ranking</h4>
            <div className="mt-5 grid gap-3">
              {sortedRanking.map((item, index) => (
                <div key={item.name} className={`flex items-center justify-between rounded-2xl p-4 text-sm font-medium ${item.name === "Bạn" ? "bg-amber-300 text-slate-950" : "bg-white/10 text-white"}`}>
                  <span>#{index + 1} {item.name}</span>
                  <span>{item.score}/{quizQuestions.length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
        <Trophy className="h-10 w-10 text-amber-300" />
        <h3 className="mt-4 text-3xl font-semibold">Quiz kiểm tra</h3>
        <div className="mt-8 rounded-[1.5rem] bg-white/10 p-5">
          <p className="text-sm text-slate-300">Tiến độ</p>
          <p className="mt-2 text-5xl font-semibold">{currentIndex + 1}/{quizQuestions.length}</p>
          <p className="mt-3 text-sm text-amber-200">Chọn đáp án rồi chuyển sang câu tiếp theo.</p>
        </div>
        <div className="mt-5 rounded-[1.5rem] bg-white/10 p-5">
          <p className="text-sm font-medium text-slate-200">Ranking</p>
          <div className="mt-3 grid gap-2">
            {sortedRanking.slice(0, 3).map((item, index) => (
              <div key={item.name} className="flex justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
                <span>#{index + 1} {item.name}</span>
                <span>{item.score}/{quizQuestions.length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-orange-600">Câu {currentIndex + 1}</p>
        <h4 className="mt-3 text-2xl font-semibold text-slate-950">{currentQuestion.question}</h4>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {currentQuestion.options.map((option, optionIndex) => {
            const picked = pickedAnswer === optionIndex;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))}
                className={`flex min-h-16 items-center justify-between rounded-2xl border p-4 text-left text-sm font-medium transition ${
                  picked ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option}
                {picked ? <CheckCircle2 className="h-5 w-5" /> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            disabled={currentIndex === 0}
            className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Câu trước
          </button>
          {isLastQuestion ? (
            <button
              type="button"
              onClick={submitQuiz}
              disabled={pickedAnswer === undefined}
              className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((index) => Math.min(quizQuestions.length - 1, index + 1))}
              disabled={pickedAnswer === undefined}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Câu tiếp theo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ARPanel() {
  return (
    <div className="grid gap-6">
      <div className="hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
    ["gallery", "Vũ khí", Swords],
    ["ar-editor", "AR Editor", Layers3],
    ["ai-video", "AI Bot Admin", ShieldUser],
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
            <div className="flex flex-wrap justify-center gap-2 md:flex-nowrap md:justify-start md:overflow-x-auto">
              {tabs.map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition md:shrink-0 ${
                    tab === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {key === "ai-video" ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${
                        tab === key ? "bg-amber-300 text-slate-950" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Admin
                    </span>
                  ) : null}
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
              {tab === "ai-video" ? <VideoAITutorPage /> : null}
              {tab === "quiz" ? <QuizPanel /> : null}
              {tab === "ar" ? <ARPanel /> : null}
              {tab === "gallery" ? <WeaponGalleryPanel /> : null}
              {tab === "ar-editor" ? <TimelineEditor /> : null}
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
