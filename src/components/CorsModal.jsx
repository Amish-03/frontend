import React, { useState } from "react";
import { X, Copy, Check, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react";
import { copyToClipboard } from "../utils/helpers";

const CORS_SAMPLE = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-meta-custom-id", "x-amz-meta-original-filename"],
    "MaxAgeSeconds": 3000
  }
]`;

export default function CorsModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await copyToClipboard(CORS_SAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="icon-badge warning">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="modal-title">AWS S3 CORS Configuration Guide</h3>
              <p className="modal-subtitle">Required for direct browser-to-S3 uploads &amp; downloads</p>
            </div>
          </div>
          <button className="icon-btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-banner">
            <AlertTriangle size={18} className="text-warning shrink-0" />
            <span>
              Direct browser SDK calls will be blocked with a <strong>CORS error</strong> (Cross-Origin Resource Sharing) unless your S3 bucket allows browser requests.
            </span>
          </div>

          <div className="steps-list">
            <h4>Quick 3-Step Setup in AWS Console:</h4>
            <ol>
              <li>Open the <strong>AWS S3 Console</strong> and select your bucket.</li>
              <li>Click the <strong>Permissions</strong> tab and scroll down to <strong>Cross-origin resource sharing (CORS)</strong>.</li>
              <li>Click <strong>Edit</strong>, paste the JSON policy below, and save changes.</li>
            </ol>
          </div>

          <div className="code-box-wrapper">
            <div className="code-box-header">
              <span>Recommended S3 CORS JSON</span>
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy JSON"}
              </button>
            </div>
            <pre className="code-block font-mono">{CORS_SAMPLE}</pre>
          </div>

          <div className="modal-footer-tip">
            <p className="text-muted text-sm">
              💡 <em>For production, replace <code>"*"</code> in <code>AllowedOrigins</code> with your specific domain or <code>http://localhost:5173</code>.</em>
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Got it, Close
          </button>
          <a
            href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            <span>AWS Docs</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
