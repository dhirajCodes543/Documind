import { useEffect, useRef, useState, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  NewspaperIcon,
  XMarkIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import ArticleCard from "./Articlecard";
import api from "../Api";

const SESSION_KEY = "documind_news_searches";

function saveSearches(s) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}
function loadSearches() {
  try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

// ── Collapsible topic block ────────────────────────────────────────────────
function TopicSection({ search, onChatWith, onRemove, resolvingArticleId }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="flex items-center gap-2 flex-1 text-left group min-w-0"
        >
          <NewspaperIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-white capitalize truncate">{search.topic}</span>
          <span className="text-[10px] text-zinc-600 shrink-0 ml-1">{search.articles.length} articles</span>
          <span className="ml-auto shrink-0 text-zinc-600 group-hover:text-zinc-400 transition">
            {collapsed ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronUpIcon className="w-3.5 h-3.5" />}
          </span>
        </button>
        <button
          onClick={() => onRemove(search.topic)}
          className="ml-3 shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
          title="Remove topic"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-4 bg-zinc-950/40">
          {search.articles.map((article, idx) => (
            <ArticleCard
              key={article.id ?? idx}
              article={article}
              index={idx + 1}
              onChatWith={onChatWith}
              isResolving={resolvingArticleId === article.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LatestNews({ onClose, onChatWithUrl }) {
  const [searches, setSearches] = useState(() => loadSearches());
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvingArticleId, setResolvingArticleId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { saveSearches(searches); }, [searches]);

  // Focus search on open
  useEffect(() => { inputRef.current?.focus(); }, []);

  const fetchNews = useCallback(async (rawTopic) => {
    const cleaned = rawTopic.trim();
    if (!cleaned) return;

    if (searches.some((s) => s.topic.toLowerCase() === cleaned.toLowerCase())) {
      setError(`"${cleaned}" is already loaded.`);
      setSearchInput("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/news/latest", { params: { topic: cleaned } });
      if (data.success) {
        setSearches((prev) => [{ topic: cleaned, articles: data.data.articles, fetchedAt: Date.now() }, ...prev]);
        setSearchInput("");
      } else {
        setError(data.message || "Failed to fetch news.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch. Try again.");
    } finally {
      setLoading(false);
    }
  }, [searches]);

  const removeTopic = (topic) => setSearches((prev) => prev.filter((s) => s.topic !== topic));
  const clearAll = () => { setSearches([]); sessionStorage.removeItem(SESSION_KEY); };

  const handleChatWith = async (article) => {
    try {
      setResolvingArticleId(article.id);
      setError("");

      const { data } = await api.post("/api/news/resolve-link", {
        title: article.title,
      });
      // console.log(data)
      if (!data?.success) {
        setError(data?.message || "Could not resolve article link.");
        return;
      }

      const candidateLinks = data?.data?.links || [];
      const firstLink = candidateLinks[0] || "";

      if (!firstLink) {
        setError("No article link found.");
        return;
      }

      onChatWithUrl(firstLink, article.title, candidateLinks);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resolve article.");
    } finally {
      setResolvingArticleId(null);
    }
  };

  const totalArticles = searches.reduce((sum, s) => sum + s.articles.length, 0);

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <NewspaperIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Latest News</h2>
              <p className="text-zinc-500 text-[11px]">
                {totalArticles > 0 ? `${totalArticles} articles across ${searches.length} topic${searches.length > 1 ? "s" : ""}` : "Search a topic to load headlines"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-500 transition active:scale-95 cursor-pointer">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left sidebar: search ── */}
          <div className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950/60 flex flex-col p-4 gap-4 overflow-y-auto">
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Search topic</p>
              <div className="relative mb-2">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && !loading && fetchNews(searchInput)}
                  placeholder="AI, cricket, politics…"
                  disabled={loading}
                  className="w-full h-9 bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition disabled:opacity-50"
                />
              </div>
              <button
                onClick={() => fetchNews(searchInput)}
                disabled={!searchInput.trim() || loading}
                className="w-full h-9 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    Fetching…
                  </>
                ) : "Search"}
              </button>
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>

            {/* Loaded topics list */}
            {searches.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Loaded topics</p>
                <div className="space-y-1">
                  {searches.map((s) => (
                    <div key={s.topic} className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      <span className="text-xs text-zinc-300 capitalize truncate flex-1">{s.topic}</span>
                      <span className="text-[10px] text-zinc-600 shrink-0">{s.articles.length}</span>
                      <button
                        onClick={() => removeTopic(s.topic)}
                        className="shrink-0 p-0.5 text-zinc-600 hover:text-red-400 transition cursor-pointer"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {searches.length > 1 && (
                  <button onClick={clearAll} className="mt-3 text-[10px] text-zinc-600 hover:text-red-400 transition cursor-pointer w-full text-left">
                    Clear all
                  </button>
                )}
              </div>
            )}

            {/* Tip */}
            <div className="mt-auto pt-4 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-700 leading-4">
                All searches persist until you close this tab. Click <span className="text-zinc-500">Chat with this article</span> on any card to open a chat.
              </p>
            </div>
          </div>

          {/* ── Right: articles ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {searches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <NewspaperIcon className="w-7 h-7 text-zinc-700" />
                </div>
                <p className="text-zinc-500 text-sm font-medium">No searches yet</p>
                <p className="text-zinc-700 text-xs mt-1.5 max-w-xs leading-5">
                  Use the search panel on the left to find headlines on any topic.
                </p>
              </div>
            ) : (
              searches.map((search) => (
                <TopicSection
                  key={search.topic}
                  search={search}
                  onChatWith={handleChatWith}
                  onRemove={removeTopic}
                  resolvingArticleId={resolvingArticleId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}