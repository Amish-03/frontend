import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  Eye,
  FileText,
  FileCode,
  FileSpreadsheet,
  File,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Share2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2,
  FolderSearch,
  RefreshCw,
} from "lucide-react";
import { formatBytes, formatDate, copyToClipboard } from "../utils/helpers";
import {
  retrieveFileById,
  deleteTest1File,
  generateCustomPresignedUrl,
  TARGET_FOLDER,
} from "../services/s3Service";

export default function RetrieveSection({
  initialId = "",
  recentIds = [],
  onFileDeleted,
  onOpenCorsModal,
}) {
  const [searchId, setSearchId] = useState(initialId);
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedFile, setRetrievedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [presignedDuration, setPresignedDuration] = useState("3600");
  const [customPresignedUrl, setCustomPresignedUrl] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);

  // Sync initialId if passed from parent
  useEffect(() => {
    if (initialId) {
      setSearchId(initialId);
      handleFetchFile(initialId);
    }
  }, [initialId]);

  const handleFetchFile = async (idToFetch) => {
    const id = (idToFetch || searchId).trim();
    if (!id) {
      setErrorMessage("Please enter an ID to retrieve.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setRetrievedFile(null);
    setCustomPresignedUrl("");

    try {
      const data = await retrieveFileById(id);
      setRetrievedFile(data);
      setCustomPresignedUrl(data.presignedUrl);
    } catch (err) {
      console.error("Retrieve error:", err);
      let msg = err.message || "Failed to retrieve file from S3.";
      if (err.name === "TypeError" && msg.includes("Failed to fetch")) {
        msg = "CORS / Network Error: Direct browser access to S3 blocked. Please make sure CORS is enabled in your S3 Bucket permissions.";
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!retrievedFile || !retrievedFile.blob) return;
    const url = URL.createObjectURL(retrievedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = retrievedFile.originalFilename || `retrieved_${retrievedFile.customId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateCustomPresigned = async (durationSec) => {
    if (!retrievedFile) return;
    try {
      const url = await generateCustomPresignedUrl(
        retrievedFile.s3Key,
        parseInt(durationSec, 10)
      );
      setCustomPresignedUrl(url);
    } catch (err) {
      console.error("Presigned URL error:", err);
    }
  };

  const handleDelete = async () => {
    if (!retrievedFile) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${retrievedFile.originalFilename}" (ID: ${retrievedFile.customId}) from "${TARGET_FOLDER}"?`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteTest1File(retrievedFile.s3Key);
      setRetrievedFile(null);
      if (onFileDeleted) onFileDeleted(retrievedFile.customId);
      alert(`Successfully deleted file from ${TARGET_FOLDER}`);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyPresigned = async () => {
    if (!customPresignedUrl) return;
    await copyToClipboard(customPresignedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyTextContent = async () => {
    if (!retrievedFile?.textContent) return;
    await copyToClipboard(retrievedFile.textContent);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const isImage = (type) => type?.startsWith("image/");
  const isAudio = (type) => type?.startsWith("audio/");
  const isVideo = (type) => type?.startsWith("video/");
  const isPdf = (type, name) => type?.includes("pdf") || name?.endsWith(".pdf");

  return (
    <div className="section-card glass-card">
      {/* Section Header */}
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="icon-badge cyan">
            <FolderSearch size={22} />
          </div>
          <div>
            <h2 className="section-title">2. Retrieve File by ID from {TARGET_FOLDER}</h2>
            <p className="section-subtitle">
              Fetch, preview, inspect, and download any file previously uploaded to the <code className="font-mono text-cyan font-bold">test1/</code> folder
            </p>
          </div>
        </div>
      </div>

      <div className="retrieve-container">
        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFetchFile();
          }}
          className="search-form"
        >
          <div className="search-bar-wrapper">
            <Search size={20} className="search-icon text-cyan" />
            <input
              type="text"
              className="search-input font-mono"
              placeholder="Enter Custom ID (e.g., doc_123456)..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary search-btn"
              disabled={!searchId.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Retrieve from S3</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Recent IDs pills */}
        {recentIds && recentIds.length > 0 && (
          <div className="recent-ids-row">
            <span className="recent-label">Recent IDs in {TARGET_FOLDER}:</span>
            <div className="recent-pills">
              {recentIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`pill-btn font-mono ${searchId === id ? "active" : ""}`}
                  onClick={() => {
                    setSearchId(id);
                    handleFetchFile(id);
                  }}
                >
                  #{id}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="error-banner animate-fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong>Retrieval Failed:</strong> {errorMessage}
                {errorMessage.includes("CORS") && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={onOpenCorsModal}
                    >
                      <span>Click here to view S3 CORS Configuration Guide</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Retrieved File Display */}
        {retrievedFile && (
          <div className="retrieved-file-card animate-fade-in">
            {/* Header / Info bar */}
            <div className="retrieved-header">
              <div className="flex items-center gap-3">
                <div className="file-icon-lg">
                  {retrievedFile.contentType.includes("json") ? (
                    <FileCode size={30} className="text-cyan" />
                  ) : retrievedFile.contentType.includes("text") ? (
                    <FileText size={30} className="text-amber" />
                  ) : (
                    <File size={30} className="text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="retrieved-filename" title={retrievedFile.originalFilename}>
                      {retrievedFile.originalFilename}
                    </h3>
                    <span className="badge badge-cyan font-mono">ID: {retrievedFile.customId}</span>
                  </div>
                  <div className="retrieved-meta-tags">
                    <span className="meta-tag">{formatBytes(retrievedFile.size)}</span>
                    <span className="meta-tag font-mono">{retrievedFile.contentType}</span>
                    <span className="meta-tag">
                      Modified: {formatDate(retrievedFile.lastModified)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownload}
                  title="Download file to your local computer"
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  title="Delete from test1/ folder"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* S3 Key & Details Grid */}
            <div className="details-grid glass-inset">
              <div className="details-col">
                <span className="detail-label">S3 Key Path:</span>
                <code className="detail-val font-mono" title={retrievedFile.s3Key}>
                  {retrievedFile.s3Key}
                </code>
              </div>
              <div className="details-col">
                <span className="detail-label">S3 ETag:</span>
                <code className="detail-val font-mono">{retrievedFile.eTag || "N/A"}</code>
              </div>
              <div className="details-col">
                <span className="detail-label">Target Folder:</span>
                <span className="detail-val font-mono text-cyan">{TARGET_FOLDER}</span>
              </div>
            </div>

            {/* In-Browser Preview Section */}
            <div className="preview-container">
              <div className="preview-header">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-cyan" />
                  <span className="font-semibold text-sm">In-Browser File Content Preview</span>
                </div>
                {retrievedFile.textContent && (
                  <button
                    type="button"
                    className="btn-copy-xs"
                    onClick={handleCopyTextContent}
                  >
                    {copiedText ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    <span>{copiedText ? "Copied Content" : "Copy Content"}</span>
                  </button>
                )}
              </div>

              <div className="preview-body">
                {isImage(retrievedFile.contentType) ? (
                  <div className="image-preview-wrapper">
                    <img
                      src={retrievedFile.blobUrl}
                      alt={retrievedFile.originalFilename}
                      className="preview-image"
                    />
                  </div>
                ) : isAudio(retrievedFile.contentType) ? (
                  <div className="media-preview-wrapper">
                    <audio controls src={retrievedFile.blobUrl} className="w-full" />
                  </div>
                ) : isVideo(retrievedFile.contentType) ? (
                  <div className="media-preview-wrapper">
                    <video controls src={retrievedFile.blobUrl} className="preview-video" />
                  </div>
                ) : isPdf(retrievedFile.contentType, retrievedFile.originalFilename) ? (
                  <div className="pdf-preview-wrapper">
                    <iframe
                      src={retrievedFile.blobUrl}
                      title="PDF Preview"
                      className="preview-iframe"
                    />
                  </div>
                ) : retrievedFile.textContent !== null ? (
                  <div className="text-preview-wrapper">
                    <pre className="text-preview-code font-mono">
                      {retrievedFile.textContent}
                    </pre>
                  </div>
                ) : (
                  <div className="binary-preview-placeholder">
                    <File size={36} className="text-muted" />
                    <p className="text-sm text-muted mt-2">
                      Binary file ({retrievedFile.contentType}) preview not rendered inline.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mt-3"
                      onClick={handleDownload}
                    >
                      <Download size={14} />
                      <span>Download to View ({formatBytes(retrievedFile.size)})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pre-signed URL Generator Widget */}
            <div className="presigned-url-card glass-inset">
              <div className="presigned-header">
                <div className="flex items-center gap-2">
                  <Share2 size={16} className="text-amber" />
                  <span className="font-semibold text-sm">AWS S3 Pre-signed Access URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted" />
                  <span className="text-xs text-muted">Expires in:</span>
                  <select
                    className="select-duration font-mono text-xs"
                    value={presignedDuration}
                    onChange={(e) => {
                      setPresignedDuration(e.target.value);
                      handleGenerateCustomPresigned(e.target.value);
                    }}
                  >
                    <option value="300">5 Minutes</option>
                    <option value="900">15 Minutes</option>
                    <option value="3600">1 Hour</option>
                    <option value="86400">24 Hours</option>
                  </select>
                </div>
              </div>

              {customPresignedUrl && (
                <div className="presigned-url-row">
                  <input
                    type="text"
                    readOnly
                    value={customPresignedUrl}
                    className="presigned-input font-mono text-xs"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyPresigned}
                    title="Copy pre-signed URL"
                  >
                    {copiedLink ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                  <a
                    href={customPresignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-brand btn-sm"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            {/* Raw Metadata Accordion */}
            <div className="metadata-accordion">
              <button
                type="button"
                className="metadata-toggle-btn"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                <div className="flex items-center gap-2">
                  <Code2 size={14} />
                  <span>{showMetadata ? "Hide Raw S3 Metadata & Headers" : "View Raw S3 Metadata & Headers"}</span>
                </div>
                <span>{showMetadata ? "▲" : "▼"}</span>
              </button>

              {showMetadata && (
                <div className="metadata-content font-mono text-xs">
                  <pre>{JSON.stringify(retrievedFile.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
