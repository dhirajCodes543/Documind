import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../Authcontext";
import { useChatHistory } from "../Hooks/useChatHistory";
import { useMessages } from "../Hooks/useMessages";
import { usePdfUpload } from "../Hooks/usePdfUpload";
import { useYoutube } from "../Hooks/useYoutube";
import { useWebsite } from "../Hooks/useWebsite";
import Sidebar from "../Components/Sidebar";
import Topbar from "../Components/Topbar";
import MessageList from "../Components/MessageList";
import InputBar from "../Components/InputBar";
import UploadGate from "../Components/UploadGate";

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { chatId: urlChatId } = useParams();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [input, setInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);

  const fileInputRef = useRef(null);

  const { chatHistory, historyLoading, prependChat, setChatHistory, removeChat } =
    useChatHistory();

  const {
    messages,
    isTyping,
    sendError,
    setSendError,
    sendMessage,
    loadMessages,
    appendMessage,
    clearMessages,
  } = useMessages();

  const {
    uploadedPdfs,
    uploading,
    uploadError,
    handlePdfSelect,
    resetPdfs,
    clearError,
  } = usePdfUpload({
    activeChatId,
    onSuccess: (data) => handleSourceSuccess(data, false, false),
  });

  const {
    youtubeUrl,
    setYoutubeUrl,
    youtubeLoading,
    youtubeError,
    handleYoutubeSubmit,
    clearYoutubeError,
  } = useYoutube({
    activeChatId,
    onSuccess: (data) => handleSourceSuccess(data, true, false),
    onStart: () => {
      const tempId = `temp-yt-${Date.now()}`;
      resetPdfs((prev) => [
        ...prev,
        { id: tempId, name: "Processing video…", uploading: true, isYoutube: true },
      ]);
      return tempId;
    },
    onFinish: (tempId, data) => {
      resetPdfs((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
              id: data.documentId,
              name: data.filename,
              uploading: false,
              isYoutube: true,
            }
            : p
        )
      );
    },
    onError: (tempId) => {
      resetPdfs((prev) => prev.filter((p) => p.id !== tempId));
    },
  });

  const {
    websiteUrl,
    setWebsiteUrl,
    websiteLoading,
    websiteError,
    websiteProgress,
    handleWebsiteSubmit,
    clearWebsiteError,
  } = useWebsite({
    activeChatId,
    onSuccess: (data) => handleSourceSuccess(data, false, true),
    onStart: () => {
      const tempId = `temp-web-${Date.now()}`;
      resetPdfs((prev) => [
        ...prev,
        {
          id: tempId,
          name: "Crawling website…",
          uploading: true,
          isWebsite: true,
        },
      ]);
      return tempId;
    },
    onFinish: (tempId, data) => {
      resetPdfs((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
              id: data.documentId,
              name: `${data.filename} (${data.pagesScraped} pages)`,
              uploading: false,
              isWebsite: true,
            }
            : p
        )
      );
    },
    onError: (tempId) => {
      resetPdfs((prev) => prev.filter((p) => p.id !== tempId));
    },
  });

  // ── Shared success handler ─────────────────────────────────────────────
  const handleSourceSuccess = (data, isYoutube = false, isWebsite = false) => {
    if (!activeChatId) {
      navigate(`/chat/${data.chatId}`);
      prependChat({
        id: data.chatId,
        title: data.filename,
        createdAt: new Date().toISOString(),
        documents: [
          {
            id: data.documentId,
            filename: data.filename,
            isYoutube,
            isWebsite,
          },
        ],
      });
    } else {
      setChatHistory((prev) =>
        prev.map((c) =>
          c.id === data.chatId
            ? {
              ...c,
              documents: [
                ...(c.documents ?? []),
                {
                  id: data.documentId,
                  filename: data.filename,
                  isYoutube,
                  isWebsite,
                },
              ],
            }
            : c
        )
      );
    }

    setActiveChatId(data.chatId);
    setPdf({ name: data.filename });

    appendMessage({
      role: "assistant",
      text:
        messages.length === 0
          ? isYoutube
            ? `🎬 I've loaded the transcript for **${data.filename}**. Ask me anything about it!`
            : isWebsite
              ? `🌐 I've crawled **${data.pagesScraped} pages** from **${data.filename}**. Ask me anything about the site!`
              : `📄 I've loaded **${data.filename}**. Ask me anything about it!`
          : isYoutube
            ? `🎬 Also loaded **${data.filename}**. Feel free to ask about any of your sources!`
            : isWebsite
              ? `🌐 Also crawled **${data.pagesScraped} pages** from **${data.filename}**!`
              : `📄 Also loaded **${data.filename}**. Feel free to ask about any of your sources!`,
      id: Date.now(),
    });
  };

  // ── Load chat from URL param ───────────────────────────────────────────
  useEffect(() => {
    if (!urlChatId) return;
    if (urlChatId === activeChatId) return;
    if (historyLoading) return;

    setActiveChatId(urlChatId);
    clearMessages();
    setSendError("");
    clearError();
    clearYoutubeError();
    clearWebsiteError();

    const found = chatHistory.find((c) => c.id === urlChatId);
    if (found) {
      setPdf({ name: found.title });
      resetPdfs(
        (found.documents ?? []).map((d) => ({
          id: d.id,
          name: d.filename,
          uploading: false,
          isYoutube: d.isYoutube ?? false,
          isWebsite: d.isWebsite ?? false,
        }))
      );
    }

    loadMessages(urlChatId);
  }, [urlChatId, chatHistory, historyLoading]);

  // ── New chat ───────────────────────────────────────────────────────────
  const startNewChat = () => {
    setPdf(null);
    resetPdfs([]);
    clearMessages();
    setInput("");
    setActiveChatId(null);
    setSendError("");
    clearError();
    clearYoutubeError();
    clearWebsiteError();
    setShowYoutubeInput(false);
    setShowWebsiteInput(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    navigate("/chat");
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;
    await logout();
    navigate("/signin");
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">

      {/* Always-present hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          handlePdfSelect(e.target.files[0]);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        chatHistory={chatHistory}
        historyLoading={historyLoading}
        activeChatId={activeChatId}
        user={user}
        onNewChat={startNewChat}
        onLogout={handleLogout}
        onDeleteChat={removeChat} // ✅
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          uploadedPdfs={uploadedPdfs}
          onClear={startNewChat}
        />

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {!pdf ? (
            <UploadGate
              uploading={uploading}
              dragOver={dragOver}
              uploadError={uploadError}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handlePdfSelect(e.dataTransfer.files[0]);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
              youtubeUrl={youtubeUrl}
              setYoutubeUrl={setYoutubeUrl}
              onYoutubeSubmit={handleYoutubeSubmit}
              youtubeLoading={youtubeLoading}
              youtubeError={youtubeError}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              onWebsiteSubmit={handleWebsiteSubmit}
              websiteLoading={websiteLoading}
              websiteError={websiteError}
              websiteProgress={websiteProgress}
            />
          ) : (
            <MessageList
              messages={messages}
              isTyping={isTyping}
              user={user}
            />
          )}
        </div>

        <InputBar
          pdf={pdf}
          input={input}
          setInput={setInput}
          onSend={() => sendMessage(activeChatId, input, setInput)}
          isTyping={isTyping}
          activeChatId={activeChatId}
          onAttach={() => fileInputRef.current?.click()}
          onAttachYoutube={() => setShowYoutubeInput(true)}
          onAttachWebsite={() => setShowWebsiteInput(true)}
          sendError={sendError}
          uploadError={uploadError}
          onVoiceReply={({ userText, assistantText }) => {
            if (userText)
              appendMessage({ role: "user", text: userText, id: Date.now() });
            if (assistantText)
              appendMessage({
                role: "assistant",
                text: assistantText,
                id: Date.now() + 1,
              });
          }}
        />
      </div>

      {/* ── YouTube URL modal ────────────────────────────────────────── */}
      {showYoutubeInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <span className="text-red-400">▶</span> Add YouTube Video
            </h3>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !youtubeLoading) {
                    handleYoutubeSubmit();
                    setShowYoutubeInput(false);
                  }
                  if (e.key === "Escape") setShowYoutubeInput(false);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={youtubeLoading}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/70 transition"
              />
              <button
                onClick={() => {
                  handleYoutubeSubmit();
                  setShowYoutubeInput(false);
                }}
                disabled={youtubeLoading || !youtubeUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition cursor-pointer"
              >
                {youtubeLoading ? "…" : "Go"}
              </button>
            </div>
            {youtubeError && (
              <p className="text-xs text-red-400 mt-2">{youtubeError}</p>
            )}
            <button
              onClick={() => setShowYoutubeInput(false)}
              className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Website URL modal ────────────────────────────────────────── */}
      {showWebsiteInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
              <span className="text-emerald-400">🌐</span> Crawl a Website
            </h3>
            <p className="text-zinc-500 text-xs mb-4">
              We'll crawl up to 10 pages within the same subdirectory
            </p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !websiteLoading) {
                    handleWebsiteSubmit();
                    setShowWebsiteInput(false);
                  }
                  if (e.key === "Escape") setShowWebsiteInput(false);
                }}
                placeholder="https://docs.python.org/3/tutorial/"
                disabled={websiteLoading}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 transition"
              />
              <button
                onClick={() => {
                  handleWebsiteSubmit();
                  setShowWebsiteInput(false);
                }}
                disabled={websiteLoading || !websiteUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition cursor-pointer"
              >
                {websiteLoading ? "…" : "Crawl"}
              </button>
            </div>
            {websiteError && (
              <p className="text-xs text-red-400 mt-2">{websiteError}</p>
            )}
            <button
              onClick={() => setShowWebsiteInput(false)}
              className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}