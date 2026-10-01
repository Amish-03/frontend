import React, { useState } from "react";
import {
  Key,
  Lock,
  Globe,
  Database,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Server,
  Terminal,
  Trash2,
} from "lucide-react";

const POPULAR_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia) us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) us-east-2" },
  { value: "us-west-1", label: "US West (N. California) us-west-1" },
  { value: "us-west-2", label: "US West (Oregon) us-west-2" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) ap-south-1" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) ap-southeast-1" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) ap-southeast-2" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) ap-northeast-1" },
  { value: "eu-central-1", label: "Europe (Frankfurt) eu-central-1" },
  { value: "eu-west-1", label: "Europe (Ireland) eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) eu-west-2" },
  { value: "sa-east-1", label: "South America (São Paulo) sa-east-1" },
];

export default function CredentialsCard({
  config,
  onChange,
  onTestConnection,
  onClearCredentials,
  testResult,
  isTesting,
  isOpen,
  onClose,
  onOpenCorsModal,
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    onChange({ ...config, [field]: value });
  };

  const isFormValid =
    config.accessKeyId?.trim() &&
    config.secretAccessKey?.trim() &&
    config.region?.trim() &&
    config.bucketName?.trim();

  return (
    <div className="credentials-overlay">
      <div className="credentials-card glass-card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="icon-badge primary">
              <Key size={18} />
            </div>
            <div>
              <h2 className="card-title">AWS S3 Credentials &amp; Bucket Settings</h2>
              <p className="card-subtitle">
                Credentials are stored locally in your browser and used only to communicate directly with AWS S3
              </p>
            </div>
          </div>
          <button className="icon-btn-close" onClick={onClose} aria-label="Close credentials panel">
            &times;
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isFormValid) onTestConnection();
          }}
          className="credentials-form"
        >
          <div className="form-grid">
            {/* Access Key ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="accessKeyId">
                <span>AWS Access Key ID</span>
                <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <Key size={16} className="input-icon" />
                <input
                  id="accessKeyId"
                  type="text"
                  className="form-input font-mono"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={config.accessKeyId || ""}
                  onChange={(e) => handleInputChange("accessKeyId", e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Secret Access Key */}
            <div className="form-group">
              <label className="form-label" htmlFor="secretAccessKey">
                <span>AWS Secret Access Key</span>
                <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="secretAccessKey"
                  type={showSecret ? "text" : "password"}
                  className="form-input font-mono"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={config.secretAccessKey || ""}
                  onChange={(e) => handleInputChange("secretAccessKey", e.target.value)}
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-visibility"
                  onClick={() => setShowSecret(!showSecret)}
                  title={showSecret ? "Hide secret key" : "Show secret key"}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* AWS Region */}
            <div className="form-group">
              <label className="form-label" htmlFor="region">
                <span>AWS Region</span>
                <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <Globe size={16} className="input-icon" />
                <input
                  id="region"
                  list="region-options"
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. us-east-1, ap-south-1"
                  value={config.region || ""}
                  onChange={(e) => handleInputChange("region", e.target.value)}
                  required
                />
                <datalist id="region-options">
                  {POPULAR_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Bucket Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="bucketName">
                <span>S3 Bucket Name</span>
                <span className="required-star">*</span>
              </label>
              <div className="input-wrapper">
                <Database size={16} className="input-icon" />
                <input
                  id="bucketName"
                  type="text"
                  className="form-input font-mono"
                  placeholder="my-test-s3-bucket"
                  value={config.bucketName || ""}
                  onChange={(e) => handleInputChange("bucketName", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Advanced toggle */}
          <div className="advanced-toggle-row">
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "▾ Hide Advanced Settings" : "▸ Show Advanced Options (Session Token, Custom Endpoint / MinIO)"}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-section glass-inset">
              <div className="form-grid">
                {/* Session Token */}
                <div className="form-group">
                  <label className="form-label" htmlFor="sessionToken">
                    <span>AWS Session Token (Optional)</span>
                    <span className="text-muted text-xs">For STS temporary credentials</span>
                  </label>
                  <div className="input-wrapper">
                    <Terminal size={16} className="input-icon" />
                    <input
                      id="sessionToken"
                      type="password"
                      className="form-input font-mono"
                      placeholder="FwoGZXIvYXdz... (optional)"
                      value={config.sessionToken || ""}
                      onChange={(e) => handleInputChange("sessionToken", e.target.value)}
                    />
                  </div>
                </div>

                {/* Custom Endpoint */}
                <div className="form-group">
                  <label className="form-label" htmlFor="endpoint">
                    <span>Custom Endpoint URL (Optional)</span>
                    <span className="text-muted text-xs">MinIO / LocalStack / R2</span>
                  </label>
                  <div className="input-wrapper">
                    <Server size={16} className="input-icon" />
                    <input
                      id="endpoint"
                      type="url"
                      className="form-input font-mono"
                      placeholder="http://localhost:9000 (MinIO)"
                      value={config.endpoint || ""}
                      onChange={(e) => handleInputChange("endpoint", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="checkbox-row mt-2">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!config.forcePathStyle}
                    onChange={(e) => handleInputChange("forcePathStyle", e.target.checked)}
                  />
                  <span>Force Path Style (Required for MinIO &amp; LocalStack)</span>
                </label>
              </div>
            </div>
          )}

          {/* Test Diagnostic Result */}
          {testResult && (
            <div
              className={`test-result-banner ${
                testResult.success ? "banner-success" : "banner-error"
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-danger shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-sm">
                    {testResult.success
                      ? "Connection Verified & Target test1/ Accessible"
                      : "Connection Failed"}
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">{testResult.message}</div>
                  {!testResult.success && testResult.message.includes("CORS") && (
                    <button
                      type="button"
                      className="btn-text-action mt-2"
                      onClick={onOpenCorsModal}
                    >
                      👉 Click here to view S3 CORS Configuration Guide
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={onClearCredentials}
              title="Clear stored credentials"
            >
              <Trash2 size={15} />
              <span>Clear</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!isFormValid || isTesting}
              >
                {isTesting ? (
                  <>
                    <span className="spinner-sm" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Test &amp; Save Credentials</span>
                  </>
                )}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
