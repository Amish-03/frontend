import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  File,
  CheckCircle,
  Hash,
  Sparkles,
  Copy,
  Check,
  Folder,
  ArrowRight,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { formatBytes, generateRandomId, copyToClipboard, triggerConfetti } from "../utils/helpers";
import { uploadFileToS3, TARGET_FOLDER } from "../services/s3Service";

export default function UploadSection({
  onUploadSuccess,
  onOpenCorsModal,
  onSelectRetrieveId,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [customId, setCustomId] = useState(generateRandomId("doc"));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const fileInputRef = useRef(null);

  // Generate quick sample files
  const handleCreateSampleFile = (type) => {
    let blob;
    let fileName;
    const now = new Date().toISOString();

    if (type === "json") {
      const data = {
        testId: customId,
        destinationFolder: "test1",
        timestamp: now,
        status: "ACTIVE",
        details: {
          purpose: "S3 Bucket 'test1' Folder Verification",
          author: "AWS S3 Tester",
          sampleData: [10, 20, 30, 40, 50],
        },
      };
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      fileName = `sample_data_${Date.now().toString().slice(-4)}.json`;
    } else if (type === "text") {
      const text = `======================================================\nAWS S3 FOLDER TEST REPORT\nFolder: test1/\nID: ${customId}\nCreated: ${now}\n======================================================\nThis is a sample text file uploaded directly to test1/ in AWS S3.\nYou can retrieve and inspect this file using ID: ${customId}.\n`;
      blob = new Blob([text], { type: "text/plain" });
      fileName = `test_report_${Date.now().toString().slice(-4)}.txt`;
    } else if (type === "csv") {
      const csv = `id,folder,name,score,status\n${customId},test1,Alpha,98.5,PASSED\n${customId},test1,Beta,92.0,PASSED\n${customId},test1,Gamma,89.2,PASSED\n`;
      blob = new Blob([csv], { type: "text/csv" });
      fileName = `metrics_${Date.now().toString().slice(-4)}.csv`;
    }

    if (blob && fileName) {
      const file = new File([blob], fileName, { type: blob.type });
      setSelectedFile(file);
      setUploadResult(null);
      setErrorMessage(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      setErrorMessage(null);
    }
  };

  const handleRegenerateId = () => {
    setCustomId(generateRandomId("doc"));
  };

  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select or drop a local file first.");
      return;
    }
    if (!customId.trim()) {
      setErrorMessage("Please enter an ID for the file.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const result = await uploadFileToS3({
        file: selectedFile,
        customId: customId.trim(),
      });

      setUploadResult(result);
      triggerConfetti();
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      console.error("Upload error:", err);
      let msg = err.message || "Failed to upload file to S3.";
      if (err.name === "TypeError" && msg.includes("Failed to fetch")) {
        msg = "CORS / Network Error: Direct browser access to S3 blocked. Please make sure CORS is enabled in your S3 Bucket permissions.";
      }
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyId = async (id) => {
    await copyToClipboard(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyKey = async (key) => {
    await copyToClipboard(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes("json") || mimeType?.includes("javascript")) {
      return <FileCode size={28} className="text-cyan" />;
    }
    if (mimeType?.includes("text")) {
      return <FileText size={28} className="text-amber" />;
    }
    if (mimeType?.includes("csv") || mimeType?.includes("sheet")) {
      return <FileSpreadsheet size={28} className="text-emerald" />;
    }
    return <File size={28} className="text-primary" />;
  };

  return (
    <div className="section-card glass-card">
      {/* Section Header */}
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="icon-badge primary">
            <UploadCloud size={22} />
          </div>
          <div>
            <h2 className="section-title">1. Upload Local File with Unique ID</h2>
            <p className="section-subtitle">
              Files are strictly stored inside the isolated <code className="font-mono text-primary font-bold">test1/</code> folder on S3
            </p>
          </div>
        </div>

        {/* Destination Path indicator */}
        <div className="folder-destination-chip">
          <Folder size={14} className="text-warning" />
          <span>Destination:</span>
          <code>
            {TARGET_FOLDER}
          </code>
        </div>
      </div>

      <div className="upload-container">
        {/* Dropzone */}
        <div
          className={`dropzone ${isDragging ? "dragging" : ""} ${selectedFile ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden-input"
            onChange={handleFileChange}
          />

          {selectedFile ? (
            <div className="selected-file-preview" onClick={(e) => e.stopPropagation()}>
              <div className="file-avatar">{getFileIcon(selectedFile.type)}</div>
              <div className="file-info">
                <span className="file-name" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
                <div className="file-meta">
                  <span className="badge badge-neutral">{formatBytes(selectedFile.size)}</span>
                  <span className="badge badge-neutral font-mono text-xs">
                    {selectedFile.type || "application/octet-stream"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                title="Remove selected file"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="dropzone-icon-circle">
                <UploadCloud size={36} className="text-primary" />
              </div>
              <p className="dropzone-prompt">
                <strong>Click to browse</strong> or drag and drop local file here
              </p>
              <p className="dropzone-sub">Supports all file formats (JSON, TXT, CSV, PNG, JPG, PDF, ZIP, etc.)</p>
            </div>
          )}
        </div>

        {/* Quick Sample Generators */}
        <div className="sample-generators-bar">
          <span className="sample-label">Or generate a quick test payload:</span>
          <div className="sample-buttons">
            <button
              type="button"
              className="btn-sample"
              onClick={() => handleCreateSampleFile("json")}
            >
              <FileCode size={14} className="text-cyan" />
              <span>Sample JSON</span>
            </button>
            <button
              type="button"
              className="btn-sample"
              onClick={() => handleCreateSampleFile("text")}
            >
              <FileText size={14} className="text-amber" />
              <span>Sample TXT</span>
            </button>
            <button
              type="button"
              className="btn-sample"
              onClick={() => handleCreateSampleFile("csv")}
            >
              <FileSpreadsheet size={14} className="text-emerald" />
              <span>Sample CSV</span>
            </button>
          </div>
        </div>

        {/* Custom ID Input Row */}
        <div className="id-configuration-box glass-inset">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="form-label flex items-center justify-between" htmlFor="customIdInput">
              <span className="flex items-center gap-1.5">
                <Hash size={15} className="text-cyan" />
                <strong>File Lookup ID</strong> (used to retrieve this file later)
              </span>
              <span className="text-xs text-muted">Must be unique per upload</span>
            </label>
            <div className="input-wrapper">
              <input
                id="customIdInput"
                type="text"
                className="form-input font-mono font-semibold"
                placeholder="e.g. order_98234, user_profile_01"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-action-inline"
                onClick={handleRegenerateId}
                title="Generate new unique ID"
              >
                <Sparkles size={14} />
                <span>New ID</span>
              </button>
            </div>
          </div>

          <div className="s3-target-preview">
            <span className="text-xs text-muted">Calculated S3 Key:</span>
            <code className="target-key-preview font-mono text-xs">
              {TARGET_FOLDER}
              {customId.trim() || "<ID>"}_{selectedFile ? selectedFile.name : "<filename>"}
            </code>
          </div>
        </div>

        {/* Upload Action Button */}
        <div className="upload-actions-row">
          <button
            type="button"
            className="btn btn-upload btn-lg"
            onClick={handleUpload}
            disabled={!selectedFile || !customId.trim() || isUploading}
          >
            {isUploading ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Uploading to test1/ folder...</span>
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                <span>Upload to S3 ({TARGET_FOLDER})</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="error-banner">
            <div className="flex items-start gap-2">
              <span className="error-dot" />
              <div className="flex-1">
                <strong>Upload Failed:</strong> {errorMessage}
                {errorMessage.includes("CORS") && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={onOpenCorsModal}
                    >
                      <ShieldCheck size={14} />
                      <span>Click here to view S3 CORS Configuration Guide</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Success Card */}
        {uploadResult && (
          <div className="upload-success-card animate-fade-in">
            <div className="success-header">
              <div className="flex items-center gap-2">
                <CheckCircle size={22} className="text-success" />
                <h3 className="success-title">File Successfully Uploaded to {TARGET_FOLDER}!</h3>
              </div>
              <span className="badge badge-success">S3 Stored</span>
            </div>

            <div className="success-grid">
              <div className="success-item">
                <span className="label">Custom ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan">{uploadResult.customId}</span>
                  <button
                    className="btn-icon-xs"
                    onClick={() => handleCopyId(uploadResult.customId)}
                    title="Copy ID"
                  >
                    {copiedId ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="success-item">
                <span className="label">S3 Key Path:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted" title={uploadResult.s3Key}>
                    {uploadResult.s3Key}
                  </span>
                  <button
                    className="btn-icon-xs"
                    onClick={() => handleCopyKey(uploadResult.s3Key)}
                    title="Copy S3 Key"
                  >
                    {copiedKey ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="success-item">
                <span className="label">File Size:</span>
                <span className="text-sm">{formatBytes(uploadResult.size)}</span>
              </div>

              {uploadResult.eTag && (
                <div className="success-item">
                  <span className="label">S3 ETag:</span>
                  <span className="font-mono text-xs text-muted">{uploadResult.eTag}</span>
                </div>
              )}
            </div>

            <div className="success-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSelectRetrieveId?.(uploadResult.customId)}
              >
                <span>Test Retrieval with this ID now</span>
                <ArrowRight size={16} />
              </button>

              {uploadResult.presignedUrl && (
                <a
                  href={uploadResult.presignedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  <span>Open Pre-signed URL</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
