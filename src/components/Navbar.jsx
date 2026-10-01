import React from "react";
import { FolderLock, ShieldAlert, Database, CheckCircle2, AlertCircle, RefreshCw, Key } from "lucide-react";

export default function Navbar({
  connectionStatus,
  onOpenCorsModal,
  onTestConnection,
  isTesting,
  bucketName,
  region,
  itemCount,
  onRefreshFolder,
  isRefreshing,
}) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <svg className="aws-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="brand-title">AWS S3 Explorer</h1>
              <span className="badge badge-brand">Folder Tester</span>
            </div>
            <p className="brand-tagline">Upload with Unique ID &bull; Retrieve from dedicated folder</p>
          </div>
        </div>

        {/* Locked Folder Banner */}
        <div className="folder-lock-badge" title="All operations are strictly locked to the 'test1/' folder">
          <FolderLock size={16} className="text-warning animate-pulse" />
          <span>Locked Target:</span>
          <code className="folder-name">test1/</code>
        </div>

        {/* Actions & Status */}
        <div className="navbar-actions">
          {bucketName && (
            <div className="bucket-status-pill">
              <Database size={14} className="text-cyan" />
              <span className="bucket-name-text" title={bucketName}>
                {bucketName}
              </span>
              {itemCount !== null && (
                <span className="count-pill" title={`${itemCount} items in test1/`}>
                  {itemCount} files
                </span>
              )}
            </div>
          )}

          {/* Connection Status Indicator */}
          <div
            className={`status-indicator ${
              connectionStatus === "connected"
                ? "status-connected"
                : connectionStatus === "testing"
                ? "status-testing"
                : connectionStatus === "error"
                ? "status-error"
                : "status-disconnected"
            }`}
            title={`Status: ${connectionStatus}`}
          >
            {connectionStatus === "connected" ? (
              <>
                <CheckCircle2 size={15} />
                <span>Connected</span>
              </>
            ) : connectionStatus === "testing" ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Checking...</span>
              </>
            ) : connectionStatus === "error" ? (
              <>
                <AlertCircle size={15} />
                <span>Connection Error</span>
              </>
            ) : (
              <>
                <span className="dot" />
                <span>Not Configured</span>
              </>
            )}
          </div>

          {onTestConnection && (
            <button
              className="btn-nav-action"
              onClick={onTestConnection}
              disabled={isTesting}
              title="Test backend connection to S3"
            >
              <RefreshCw size={15} className={isTesting ? "spin" : ""} />
              <span>{isTesting ? "Testing..." : "Test Connection"}</span>
            </button>
          )}

          <button
            className="btn-nav-action"
            onClick={onOpenCorsModal}
            title="S3 & Backend Info"
          >
            <ShieldAlert size={16} className="text-warning" />
            <span>Architecture Info</span>
          </button>

          {onRefreshFolder && (
            <button
              className="icon-button"
              onClick={onRefreshFolder}
              disabled={isRefreshing}
              title="Refresh test1/ folder items"
            >
              <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
