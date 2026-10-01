import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import UploadSection from "./components/UploadSection";
import RetrieveSection from "./components/RetrieveSection";
import FolderExplorer from "./components/FolderExplorer";
import CorsModal from "./components/CorsModal";
import {
  testS3Connection,
  listTest1Folder,
  ensureTestFolderExists,
  getBackendConfig,
  TARGET_FOLDER,
} from "./services/s3Service";
import { Sparkles, ShieldCheck, Database, FolderLock, AlertCircle, RefreshCw, Server } from "lucide-react";
import "./App.css";

export default function App() {
  const [backendConfig, setBackendConfig] = useState({
    configured: false,
    bucketName: "",
    region: "us-east-1",
    targetFolder: TARGET_FOLDER,
    endpoint: "",
  });

  const [showCorsModal, setShowCorsModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("testing");
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Folder Explorer & Recent IDs State
  const [folderItems, setFolderItems] = useState([]);
  const [isFolderLoading, setIsFolderLoading] = useState(false);
  const [selectedRetrieveId, setSelectedRetrieveId] = useState("");
  const [recentIds, setRecentIds] = useState([]);

  // Refresh folder items
  const refreshFolderItems = useCallback(async () => {
    setIsFolderLoading(true);
    try {
      const items = await listTest1Folder();
      setFolderItems(items);
      // Extract unique IDs
      const ids = [...new Set(items.map((i) => i.customId).filter((id) => id && id !== "unknown"))];
      setRecentIds(ids);
    } catch (err) {
      console.warn("Could not list test1/ items:", err);
    } finally {
      setIsFolderLoading(false);
    }
  }, []);

  // Test S3 Connection via Backend
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setConnectionStatus("testing");

    // Fetch active backend config
    const cfg = await getBackendConfig();
    setBackendConfig(cfg);

    const result = await testS3Connection();
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      setConnectionStatus("connected");
      // Ensure folder marker
      ensureTestFolderExists();
      // Refresh folder list
      refreshFolderItems();
    } else {
      setConnectionStatus(cfg.configured ? "error" : "not_configured");
    }
  }, [refreshFolderItems]);

  // Initial load
  useEffect(() => {
    handleTestConnection();
  }, [handleTestConnection]);

  // Upload handler
  const handleUploadSuccess = (uploadData) => {
    if (uploadData.customId) {
      setRecentIds((prev) => [uploadData.customId, ...prev.filter((id) => id !== uploadData.customId)]);
    }
    refreshFolderItems();
  };

  // Select ID for retrieval
  const handleSelectRetrieveId = (id) => {
    setSelectedRetrieveId(id);
    const el = document.getElementById("retrieve-section-anchor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleItemDeleted = (deletedId) => {
    setRecentIds((prev) => prev.filter((id) => id !== deletedId));
    refreshFolderItems();
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        connectionStatus={connectionStatus}
        onOpenCorsModal={() => setShowCorsModal(true)}
        onTestConnection={handleTestConnection}
        isTesting={isTesting}
        bucketName={backendConfig.bucketName}
        region={backendConfig.region}
        itemCount={folderItems.length}
        onRefreshFolder={refreshFolderItems}
        isRefreshing={isFolderLoading}
      />

      <main className="main-content">
        {/* Backend Configuration Banner if not configured or error */}
        {connectionStatus !== "connected" && (
          <div className="unconfigured-banner glass-card animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="icon-badge primary">
                <Server size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {connectionStatus === "testing"
                    ? "Connecting to Spring Boot Microservice..."
                    : connectionStatus === "not_configured"
                    ? "Backend S3 Credentials Not Set in application.yml"
                    : "AWS S3 Connection Error via Microservice"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {connectionStatus === "not_configured" ? (
                    <>
                      All AWS credentials are securely held on the backend. Please configure{" "}
                      <code className="text-primary font-mono font-bold">aws.s3.access-key-id</code>,{" "}
                      <code className="text-primary font-mono font-bold">aws.s3.secret-access-key</code>, and{" "}
                      <code className="text-primary font-mono font-bold">aws.s3.bucket-name</code> in{" "}
                      <code className="font-mono">application.yml</code> or environment variables.
                    </>
                  ) : connectionStatus === "error" ? (
                    <>
                      The backend encountered an error communicating with S3 bucket{" "}
                      <strong>{backendConfig.bucketName || "unnamed"}</strong>. Check backend logs and application.yml configuration.
                    </>
                  ) : (
                    "Checking connection status with the backend S3 microservice..."
                  )}
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              <RefreshCw size={14} className={isTesting ? "spin" : ""} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        <div className="app-grid">
          {/* Section 1: Upload */}
          <UploadSection
            onUploadSuccess={handleUploadSuccess}
            onOpenCorsModal={() => setShowCorsModal(true)}
            onSelectRetrieveId={handleSelectRetrieveId}
          />

          {/* Section 2: Retrieve Anchor */}
          <div id="retrieve-section-anchor">
            <RetrieveSection
              initialId={selectedRetrieveId}
              recentIds={recentIds}
              onFileDeleted={handleItemDeleted}
              onOpenCorsModal={() => setShowCorsModal(true)}
            />
          </div>

          {/* Section 3: Live Folder Explorer */}
          <FolderExplorer
            items={folderItems}
            isLoading={isFolderLoading}
            onRefresh={refreshFolderItems}
            onSelectId={handleSelectRetrieveId}
            onItemDeleted={handleItemDeleted}
            onOpenCorsModal={() => setShowCorsModal(true)}
          />
        </div>
      </main>

      {/* Architecture & Info Modal */}
      <CorsModal isOpen={showCorsModal} onClose={() => setShowCorsModal(false)} />
    </div>
  );
}
