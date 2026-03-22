import { useState } from "react";
import api from "../Api";

export function usePdfUpload({ activeChatId, onSuccess }) {
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handlePdfSelect = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    setUploadError("");
    setUploading(true);

    const tempId = `temp-${Date.now()}`;
    setUploadedPdfs((prev) => [
      ...prev,
      { id: tempId, name: file.name, uploading: true },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (activeChatId) formData.append("chatId", activeChatId);

      const { data } = await api.post("/api/document/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // ✅ Replace temp entry with real one
      setUploadedPdfs((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { id: data.documentId, name: data.filename, uploading: false, isYoutube: false }
            : p
        )
      );

      onSuccess(data);
    } catch (err) {
      setUploadedPdfs((prev) => prev.filter((p) => p.id !== tempId));
      setUploadError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetPdfs = (valueOrFn) => {
    setUploadedPdfs(typeof valueOrFn === "function" ? valueOrFn : valueOrFn);
  };

  const clearError = () => setUploadError("");

  return {
    uploadedPdfs,
    uploading,
    uploadError,
    handlePdfSelect,
    resetPdfs,
    clearError,
  };
}