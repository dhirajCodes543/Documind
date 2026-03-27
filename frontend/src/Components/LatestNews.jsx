import { useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  NewspaperIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import api from "../Api";

// ── Markdown renderer (unchanged) ──────────────────────────────────────────
const mdComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>
  ),
  li: ({ children }) => <li className="text-zinc-300">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-white mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-white mb-1.5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-white mb-1">{children}</h3>
  ),
  code: ({ children }) => (
    <code className="bg-zinc-900 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500 pl-3 text-zinc-400 italic">
      {children}
    </blockquote>
  ),
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatPubDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;

  const now = new Date();
  const diff = Math.floor((now - d) / 60000);

  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Article card ───────────────────────────────────────────────────────────
function ArticleCard({ article, index }) {
  // Summarize is disabled for now
  const isDisabled = true;

  return (
    <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3 hover:border-zinc-700 transition-all duration-200 shadow-md">
      <div className="flex gap-3">
        <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-300 font-medium">
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm md:text-base text-white font-semibold leading-snug flex-1 pr-2">
              {article.title}
            </p>

            {article.link ? (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:text-white hover:border-zinc-500 active:scale-95 active:bg-zinc-700 transition-all duration-150"
                title="Open article"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            ) : null}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {article.source && article.source !== "Unknown" && (
              <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
                {article.source}
              </span>
            )}

            {article.pubDate && (
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {formatPubDate(article.pubDate)}
              </span>
            )}
          </div>

          {article.contentSnippet && (
            <p className="text-xs text-zinc-400 mt-2 leading-6 line-clamp-2">
              {article.contentSnippet}
            </p>
          )}

          <button
            disabled={isDisabled}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-500 cursor-not-allowed transition-all duration-150"
            title="Summarization feature coming soon"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Summarize (coming soon)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Summary panel (kept but won't be used until feature is enabled) ────────
function SummaryPanel({ summary, article, onClose }) {
  return (
    <div className="bg-zinc-900/95 border border-indigo-500/25 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
            <SparklesIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Summary</p>
            <p className="text-xs text-zinc-300 truncate">{article?.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 active:scale-95 active:text-zinc-100 transition-all duration-150 shrink-0"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="text-xs text-zinc-200 leading-6">
        <ReactMarkdown components={mdComponents}>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Main component with sidebar (summarization disabled) ───────────────────
export default function LatestNews({ onClose }) {
  const [topic, setTopic] = useState("");
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newTopicInput, setNewTopicInput] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState(""); // dropdown selection

  // Summary state – kept but won't be triggered
  const [summary, setSummary] = useState(null);
  const [summaryArticle, setSummaryArticle] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const overlayScrollRef = useRef(null);

  const fetchNews = async (rawTopic) => {
    const cleanedTopic = rawTopic.trim();
    if (!cleanedTopic) return;

    setLoading(true);
    setError("");
    setSummary(null);
    setSummaryArticle(null);
    setSummaryError("");

    try {
      const { data } = await api.get("/api/news/latest", {
        params: { topic: cleanedTopic },
      });

      if (data.success) {
        setNewsData(data.data);
        setTopic(cleanedTopic);
        setNewTopicInput("");
        setSelectedArticleId(data.data.articles?.[0]?.id?.toString() || "");

        requestAnimationFrame(() => {
          if (overlayScrollRef.current) {
            overlayScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
          }
        });
      } else {
        setError(data.message || "Failed to fetch news.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch news. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Summarization functions are kept but won't be called (buttons disabled)
  // They will be enabled later when the feature is built
  const summarizeArticle = async (article) => {
    // placeholder – not used now
    console.log("Summarize called for", article);
  };

  const summarizeById = async (id) => {
    // placeholder – not used now
    console.log("Summarize by ID", id);
  };

  const resetToSearch = () => {
    setNewsData(null);
    setTopic("");
    setSummary(null);
    setSummaryArticle(null);
    setError("");
    setSummaryError("");
    setSelectedArticleId("");
    setNewTopicInput("");
  };

  const truncateTitle = (title, maxLen = 50) => {
    if (title.length <= maxLen) return title;
    return title.slice(0, maxLen) + "…";
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                <NewspaperIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-base">Latest News</h2>
                <p className="text-zinc-500 text-[11px]">Search and summarize recent headlines</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-500 active:scale-95 active:bg-zinc-800 transition-all duration-150"
              title="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main area: sidebar + content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar (inputs) */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/50 p-4 overflow-y-auto">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
                  What would you like to do?
                </p>

                {/* Summarize section with dropdown – fully disabled */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <span className="text-sm text-zinc-300">Summarize an article by ID</span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedArticleId}
                      onChange={(e) => setSelectedArticleId(e.target.value)}
                      disabled={true} // permanently disabled
                      className="flex-1 h-9 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-sm text-white opacity-50 cursor-not-allowed"
                    >
                      {!newsData ? (
                        <option>No articles loaded</option>
                      ) : (
                        newsData.articles.map((article) => (
                          <option key={article.id} value={article.id}>
                            ID: {article.id} - {truncateTitle(article.title)}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      disabled={true}
                      className="h-9 px-4 rounded-lg text-xs font-medium bg-zinc-700 text-zinc-500 cursor-not-allowed"
                      title="Summarization feature coming soon"
                    >
                      Summarize (soon)
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Summarization will be available soon.
                  </p>
                </div>

                <div className="my-4 flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] text-zinc-600">or</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* New search section – fully functional */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <MagnifyingGlassIcon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-zinc-300">Get news on a different topic</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTopicInput.trim() && !loading) {
                          fetchNews(newTopicInput.trim());
                        }
                      }}
                      placeholder="e.g. AI, elections, startups..."
                      disabled={loading}
                      className="flex-1 h-9 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    />
                    <button
                      onClick={() => {
                        if (newTopicInput.trim()) fetchNews(newTopicInput.trim());
                      }}
                      disabled={!newTopicInput.trim() || loading}
                      className={`h-9 px-4 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 ${
                        !newTopicInput.trim() || loading
                          ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                          : "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                      }`}
                    >
                      {loading ? "..." : "Search"}
                    </button>
                  </div>
                </div>

                {/* Quick reset button when news loaded */}
                {newsData && (
                  <button
                    onClick={resetToSearch}
                    className="mt-4 w-full text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 py-2 rounded-lg transition-all duration-150 active:scale-[0.98] active:bg-zinc-800/50"
                  >
                    Clear & start over
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div
            ref={overlayScrollRef}
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            {!newsData && !loading ? (
              <div className="flex flex-col items-center justify-center min-h-full text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3">
                  <NewspaperIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-white font-semibold text-lg">No news loaded</h3>
                <p className="text-zinc-500 text-sm mt-1 max-w-sm">
                  Use the sidebar to search for a topic and get the latest headlines.
                </p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center min-h-full gap-3">
                <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-xs">Fetching latest news…</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <h2 className="text-white font-semibold text-xl">
                    Latest on: <span className="text-indigo-400">{newsData.topic}</span>
                  </h2>
                  <p className="text-zinc-500 text-xs mt-1">{newsData.total} articles found</p>
                </div>

                <div className="space-y-3">
                  {newsData.articles.map((article, idx) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      index={idx + 1}
                    />
                  ))}
                </div>

                {/* Summary area is disabled, so no summaries will appear */}
                {(summary || summarizing) && (
                  <div>
                    {summarizing ? (
                      <div className="bg-zinc-900/95 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        <p className="text-xs text-zinc-300">Summarizing article…</p>
                      </div>
                    ) : (
                      <SummaryPanel
                        summary={summary}
                        article={summaryArticle}
                        onClose={() => {
                          setSummary(null);
                          setSummaryArticle(null);
                        }}
                      />
                    )}
                  </div>
                )}

                {summaryError && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2 text-center">
                    {summaryError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}