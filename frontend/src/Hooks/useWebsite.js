import { useState } from "react";
import api from "../Api";

export function useWebsite({ activeChatId, onSuccess, onStart, onFinish, onError }) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [progress, setProgress] = useState("");

  const handleWebsiteSubmit = async () => {
    if (!websiteUrl.trim()) return;
    setWebsiteError("");
    setWebsiteLoading(true);
    setProgress("Starting crawl...");

    const tempId = onStart?.(websiteUrl.trim());

    try {
      const body = { url: websiteUrl.trim() };
      if (activeChatId) body.chatId = activeChatId;

      setProgress("Crawling pages...");
      const { data } = await api.post("/api/website/process", body);

      setProgress("");
      onFinish?.(tempId, data);
      setWebsiteUrl("");
      onSuccess(data);
    } catch (err) {
      setProgress("");
      onError?.(tempId);
      setWebsiteError(
        err.response?.data?.error || "Failed to process website. Try again."
      );
    } finally {
      setWebsiteLoading(false);
    }
  };

  return {
    websiteUrl,
    setWebsiteUrl,
    websiteLoading,
    websiteError,
    websiteProgress: progress,
    handleWebsiteSubmit,
    clearWebsiteError: () => setWebsiteError(""),
  };
}