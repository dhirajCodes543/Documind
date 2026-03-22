import { useState } from "react";
import api from "../Api";

export function useYoutube({ activeChatId, onSuccess, onStart, onFinish, onError }) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;
    setYoutubeError("");
    setYoutubeLoading(true);

    // ✅ Show uploading badge in topbar immediately
    const tempId = onStart?.(youtubeUrl.trim());

    try {
      const body = { url: youtubeUrl.trim() };
      if (activeChatId) body.chatId = activeChatId;

      const { data } = await api.post("/api/youtube/process", body);

      // ✅ Replace temp badge with real one
      onFinish?.(tempId, data);

      setYoutubeUrl("");
      onSuccess(data);
    } catch (err) {
      // ✅ Remove temp badge on error
      onError?.(tempId);
      setYoutubeError(
        err.response?.data?.error || "Failed to process video. Try again."
      );
    } finally {
      setYoutubeLoading(false);
    }
  };

  return {
    youtubeUrl,
    setYoutubeUrl,
    youtubeLoading,
    youtubeError,
    handleYoutubeSubmit,
    clearYoutubeError: () => setYoutubeError(""),
  };
}