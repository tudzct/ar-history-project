import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal, UserRound } from "lucide-react";
import { chatWithVideoStream, fetchMessages } from "./api.js";
import TimestampSources from "./TimestampSources.jsx";

export default function VideoChatPanel({ selectedVideo, onJump, hidePlayer = false }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [playerStart, setPlayerStart] = useState(0);
  const messagesContainerRef = useRef(null);

  const playerParams = new URLSearchParams({
    rel: "0",
    start: String(Math.floor(playerStart || 0)),
    autoplay: playerStart > 0 ? "1" : "0",
  });
  const playerSrc = selectedVideo?.youtubeVideoId
    ? `https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?${playerParams.toString()}`
    : "";
  const messageIds = useMemo(() => messages.map((message) => message._id).join("|"), [messages]);

  function handleJump(seconds) {
    if (typeof onJump === "function") {
      onJump(seconds);
      return;
    }

    setPlayerStart(seconds);
  }

  useEffect(() => {
    let ignore = false;

    async function loadMessages() {
      if (!selectedVideo?._id) {
        setMessages([]);
        return;
      }

      setIsLoadingMessages(true);
      setError("");
      setPlayerStart(0);

      try {
        const data = await fetchMessages(selectedVideo._id);

        if (!ignore) {
          setMessages(data.messages || []);
        }
      } catch (apiError) {
        if (!ignore) {
          setError(apiError.message);
        }
      } finally {
        if (!ignore) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [selectedVideo?._id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messageIds, isLoadingMessages]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!selectedVideo?._id || !trimmedQuestion || selectedVideo.status !== "INDEXED") {
      return;
    }

    const localUserMessage = {
      _id: `local-user-${Date.now()}`,
      role: "USER",
      content: trimmedQuestion,
      sources: [],
    };

    setMessages((current) => [...current, localUserMessage]);
    setQuestion("");
    setError("");
    setIsSubmitting(true);

    const assistantId = `local-assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      {
        _id: assistantId,
        role: "ASSISTANT",
        content: "",
        sources: [],
      },
    ]);

    try {
      await chatWithVideoStream(selectedVideo._id, trimmedQuestion, {
        onChunk: (chunk) => {
          setMessages((current) =>
            current.map((message) =>
              message._id === assistantId ? { ...message, content: `${message.content}${chunk}` } : message
            )
          );
        },
        onDone: (event) => {
          setMessages((current) =>
            current.map((message) =>
              message._id === assistantId
                ? {
                    ...message,
                    content: event.answer || message.content,
                    sources: event.sources || [],
                  }
                : message
            )
          );
        },
      });
    } catch (apiError) {
      setMessages((current) =>
        current.map((message) =>
          message._id === assistantId && !message.content
            ? { ...message, content: "Xin lỗi, mình gặp lỗi khi phản hồi. Bạn thử lại nhé." }
            : message
        )
      );
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!selectedVideo) {
    return (
      <section className="grid min-h-[520px] place-items-center rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div>
          <Bot className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-xl font-black text-slate-950">Chọn một video để hỏi đáp</h3>
          <p className="mt-2 text-sm text-slate-500">Video cần được index trước khi chatbot có thể trả lời.</p>
        </div>
      </section>
    );
  }

  function renderMessageContent(content) {
    const lines = String(content || "").split("\n");

    return (
      <div className="space-y-2 whitespace-pre-wrap">
        {lines.map((line, lineIndex) => {
          const chunks = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={`${lineIndex}-${line}`}>
              {chunks.map((chunk, chunkIndex) => {
                const match = chunk.match(/^\*\*([^*]+)\*\*$/);
                if (match) {
                  return <strong key={`${lineIndex}-${chunkIndex}`}>{match[1]}</strong>;
                }
                return <span key={`${lineIndex}-${chunkIndex}`}>{chunk}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  }

  const chatContent = (
    <div className="flex h-[640px] flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">ChatBot</h3>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
            {selectedVideo.status}
          </span>
        </div>
        {selectedVideo.status !== "INDEXED" ? (
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Video chưa index xong nên chưa thể chat.
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>

      <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {isLoadingMessages ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải lịch sử chat...
          </div>
        ) : null}

        {!isLoadingMessages && messages.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
            Hãy hỏi một câu về nội dung trong video.
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "USER";

          return (
            <div
              key={message._id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser ? (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-white">
                  <Bot className="h-4 w-4" />
                </div>
              ) : null}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                  isUser
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                }`}
              >
                {renderMessageContent(message.content)}
                {!isUser ? (
                  <TimestampSources sources={message.sources} onJump={handleJump} />
                ) : null}
              </div>
              {isUser ? (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
                  <UserRound className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Hỏi về nội dung trong video..."
            disabled={isSubmitting || selectedVideo.status !== "INDEXED"}
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSubmitting || !question.trim() || selectedVideo.status !== "INDEXED"}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            title="Gửi câu hỏi"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  );

  if (hidePlayer) {
    return <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">{chatContent}</section>;
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-0 xl:grid-cols-[1fr_0.9fr]">
        <div className="bg-slate-950">
          <iframe
            key={playerSrc}
            className="aspect-video w-full"
            src={playerSrc}
            title={selectedVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className="p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">AI Video Tutor</p>
            <h3 className="mt-2 text-2xl font-black">{selectedVideo.title}</h3>
            <p className="mt-2 text-sm text-slate-300">
              {selectedVideo.totalChunks || 0} transcript chunks
              {selectedVideo.relatedMarkerId ? ` · Marker ${selectedVideo.relatedMarkerId}` : ""}
            </p>
          </div>
        </div>
        {chatContent}
      </div>
    </section>
  );
}
