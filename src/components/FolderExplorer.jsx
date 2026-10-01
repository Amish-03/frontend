import React, { useState } from "react";
import {
  Folder,
  RefreshCw,
  Search,
  Eye,
  Download,
  Trash2,
  Copy,
  Check,
  FileCode,
  FileText,
  FileSpreadsheet,
  File,
  ShieldCheck,
  HardDrive,
  Hash,
} from "lucide-react";
import { formatBytes, formatDate, copyToClipboard } from "../utils/helpers";
import { TARGET_FOLDER, deleteTest1File } from "../services/s3Service";

export default function FolderExplorer({
  items = [],
  isLoading,
  onRefresh,
  onSelectId,
  onItemDeleted,
  onOpenCorsModal,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);

  const filteredItems = items.filter(
    (item) =>
      item.customId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBytes = items.reduce((acc, curr) => acc + (curr.size || 0), 0);

  const handleCopyId = async (id) => {
    await copyToClipboard(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteItem = async (s3Key, id) => {
    const confirm = window.confirm(`Permanently delete "${s3Key}" from ${TARGET_FOLDER}?`);
    if (!confirm) return;

    setDeletingKey(s3Key);
    try {
      await deleteTest1File(s3Key);
      if (onItemDeleted) onItemDeleted(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingKey(null);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["json", "js", "ts", "html", "css"].includes(ext)) {
      return <FileCode size={18} className="text-cyan" />;
    }
    if (["txt", "md", "log"].includes(ext)) {
      return <FileText size={18} className="text-amber" />;
    }
    if (["csv", "xlsx", "xls"].includes(ext)) {
      return <FileSpreadsheet size={18} className="text-emerald" />;
    }
    return <File size={18} className="text-primary" />;
  };

  return (
    <div className="section-card glass-card">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <div className="icon-badge primary">
            <Folder size={22} />
          </div>
          <div>
            <h2 className="section-title">3. Live S3 Folder Explorer: <code className="font-mono text-primary font-bold">{TARGET_FOLDER}</code></h2>
            <p className="section-subtitle">
              All files currently stored in this test folder with their assigned IDs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh folder listing"
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span>{isLoading ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card glass-inset">
          <div className="stat-icon-wrap cyan">
            <Hash size={18} />
          </div>
          <div>
            <div className="stat-value">{items.length}</div>
            <div className="stat-label">Files in {TARGET_FOLDER}</div>
          </div>
        </div>

        <div className="stat-card glass-inset">
          <div className="stat-icon-wrap primary">
            <HardDrive size={18} />
          </div>
          <div>
            <div className="stat-value">{formatBytes(totalBytes)}</div>
            <div className="stat-label">Total Storage Used</div>
          </div>
        </div>

        <div className="stat-card glass-inset">
          <div className="stat-icon-wrap emerald">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="stat-value text-success font-mono text-base">Isolated</div>
            <div className="stat-label">Strict Prefix: {TARGET_FOLDER}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="explorer-search-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon text-muted" />
          <input
            type="text"
            className="explorer-search-input"
            placeholder="Filter files in test1/ by ID or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="table-responsive">
        <table className="folder-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Lookup ID</th>
              <th>Size</th>
              <th>Last Modified</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted">
                    <RefreshCw size={18} className="spin text-cyan" />
                    <span>Loading objects from {TARGET_FOLDER}...</span>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <div className="empty-state">
                    <Folder size={40} className="text-muted mb-2" />
                    <p className="font-semibold text-muted-foreground">
                      {searchQuery
                        ? "No files matched your filter query."
                        : `The "${TARGET_FOLDER}" folder is currently empty.`}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {searchQuery
                        ? "Try clearing the search input."
                        : "Upload a file using the form above to get started!"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.key} className="table-row hover-row">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="file-avatar-sm">{getFileIcon(item.filename)}</div>
                      <span className="file-name-cell" title={item.filename}>
                        {item.filename}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="id-badge font-mono">{item.customId}</span>
                      <button
                        type="button"
                        className="btn-icon-xxs"
                        onClick={() => handleCopyId(item.customId)}
                        title="Copy ID"
                      >
                        {copiedId === item.customId ? (
                          <Check size={12} className="text-success" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{formatBytes(item.size)}</td>
                  <td className="text-xs text-muted">{formatDate(item.lastModified)}</td>
                  <td className="text-right">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-action-pill primary"
                        onClick={() => onSelectId(item.customId)}
                        title="Retrieve and Preview this file"
                      >
                        <Eye size={13} />
                        <span>Retrieve</span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-icon danger"
                        onClick={() => handleDeleteItem(item.key, item.customId)}
                        disabled={deletingKey === item.key}
                        title="Delete from test1/"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
