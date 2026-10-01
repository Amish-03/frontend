/**
 * S3 Service - Backend API Client
 *
 * All AWS S3 operations and credentials are strictly handled on the backend (Spring Boot microservice).
 * No AWS credentials, access keys, or secrets are accepted from or stored in the frontend.
 * Configuration is managed exclusively via application.yml / environment variables on the backend.
 */

export const TARGET_FOLDER = "test1/";

const API_BASE = "/api/s3";

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || `HTTP ${response.status}: ${response.statusText}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response;
}

/**
 * Retrieve safe backend configuration status (bucket, region, target folder, configured status)
 */
export async function getBackendConfig() {
  try {
    const response = await apiFetch(`${API_BASE}/config`);
    const body = await response.json();
    return body.data || { configured: false, bucketName: "", region: "us-east-1", targetFolder: TARGET_FOLDER };
  } catch (err) {
    console.warn("Could not fetch backend S3 config:", err);
    return { configured: false, bucketName: "", region: "us-east-1", targetFolder: TARGET_FOLDER };
  }
}

/**
 * Test AWS S3 connection and bucket access using backend credentials
 */
export async function testS3Connection() {
  try {
    const response = await apiFetch(`${API_BASE}/test-connection`, {
      method: "POST",
    });

    const body = await response.json();
    const data = body.data || {};

    return {
      success: data.success ?? body.success,
      latencyMs: data.latencyMs || 0,
      message: data.message || body.message || "",
      itemCountInFolder: data.itemCountInFolder || 0,
      errorName: data.errorName || null,
    };
  } catch (err) {
    return {
      success: false,
      latencyMs: 0,
      errorName: err.name,
      message: err.message || String(err),
    };
  }
}

/**
 * Ensures the target virtual directory test1/ marker exists
 */
export async function ensureTestFolderExists() {
  try {
    await apiFetch(`${API_BASE}/ensure-folder`, {
      method: "POST",
    });
    return true;
  } catch (err) {
    console.warn("Could not create folder marker, continuing:", err);
    return false;
  }
}

/**
 * Sanitizes an ID to be safe for filenames & S3 keys (client-side helper)
 */
export function sanitizeId(rawId) {
  return (rawId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Generates an S3 Key under test1/ folder using the ID and filename (client-side preview)
 */
export function buildS3Key(customId, originalFilename) {
  const sanitized = sanitizeId(customId);
  const cleanName = (originalFilename || "").replace(/[\\/\\\\]/g, "_");
  return `${TARGET_FOLDER}${sanitized}_${cleanName}`;
}

/**
 * Upload a file to test1/ folder along with an ID
 * Accepts either: uploadFileToS3({ file, customId, tags }) or uploadFileToS3(ignoredConfig, { file, customId, tags })
 */
export async function uploadFileToS3(arg1, arg2) {
  const payload = arg2 !== undefined ? arg2 : arg1;
  const { file, customId, tags = {} } = payload || {};

  if (!file) throw new Error("No file provided for upload.");
  if (!customId || !customId.trim()) throw new Error("An ID is required for the upload.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("customId", customId.trim());

  if (tags && Object.keys(tags).length > 0) {
    Object.entries(tags).forEach(([key, value]) => {
      formData.append(`tags[${key}]`, value);
    });
  }

  const response = await apiFetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  const data = body.data || {};

  return {
    success: data.success ?? true,
    s3Key: data.s3Key,
    customId: data.customId,
    originalFilename: data.originalFilename,
    size: data.size,
    contentType: data.contentType,
    eTag: data.eTag,
    versionId: data.versionId,
    presignedUrl: data.presignedUrl || "",
    uploadedAt: data.uploadedAt,
  };
}

/**
 * Retrieve a file from test1/ using its custom ID
 * Accepts either: retrieveFileById(targetId) or retrieveFileById(ignoredConfig, targetId)
 */
export async function retrieveFileById(arg1, arg2) {
  const targetId = arg2 !== undefined ? arg2 : arg1;

  if (!targetId || !targetId.trim()) {
    throw new Error("Please provide a valid ID to retrieve the file.");
  }

  const sanitizedId = sanitizeId(targetId);

  const response = await apiFetch(`${API_BASE}/files/${encodeURIComponent(sanitizedId)}`, {
    method: "GET",
  });

  const body = await response.json();
  const data = body.data || {};

  // For binary content, create a blob from presigned URL for download
  let blob = null;
  let blobUrl = "";

  if (data.presignedUrl) {
    try {
      const fileResponse = await fetch(data.presignedUrl);
      if (fileResponse.ok) {
        blob = await fileResponse.blob();
        blobUrl = URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn("Could not fetch file content from presigned URL:", e);
    }
  }

  return {
    customId: data.customId,
    s3Key: data.s3Key,
    originalFilename: data.originalFilename || "",
    contentType: data.contentType || "application/octet-stream",
    size: data.size || 0,
    lastModified: data.lastModified,
    eTag: data.eTag || "",
    metadata: data.metadata || {},
    blob,
    blobUrl,
    presignedUrl: data.presignedUrl || "",
    textContent: data.textContent || null,
  };
}

/**
 * List all items strictly inside test1/ folder
 */
export async function listTest1Folder() {
  const response = await apiFetch(`${API_BASE}/files`, {
    method: "GET",
  });

  const body = await response.json();
  const items = body.data || [];

  // Sort newest first
  items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  return items;
}

/**
 * Delete a file inside test1/
 * Accepts either: deleteTest1File(s3Key) or deleteTest1File(ignoredConfig, s3Key)
 */
export async function deleteTest1File(arg1, arg2) {
  const s3Key = arg2 !== undefined ? arg2 : arg1;

  if (!s3Key || !s3Key.startsWith(TARGET_FOLDER)) {
    throw new Error(`Safety check failed: Cannot delete file outside "${TARGET_FOLDER}"!`);
  }

  await apiFetch(`${API_BASE}/files?key=${encodeURIComponent(s3Key)}`, {
    method: "DELETE",
  });

  return true;
}

/**
 * Generate a custom pre-signed URL with specified expiry
 * Accepts: generateCustomPresignedUrl(s3Key, expiresInSeconds) or generateCustomPresignedUrl(ignoredConfig, s3Key, expiresInSeconds)
 */
export async function generateCustomPresignedUrl(arg1, arg2, arg3) {
  let s3Key, expiresInSeconds;
  if (typeof arg1 === "string") {
    s3Key = arg1;
    expiresInSeconds = arg2 || 900;
  } else {
    s3Key = arg2;
    expiresInSeconds = arg3 || 900;
  }

  const response = await apiFetch(
    `${API_BASE}/presigned-url?key=${encodeURIComponent(s3Key)}&expiresIn=${expiresInSeconds}`,
    {
      method: "POST",
    }
  );

  const body = await response.json();
  return body.data?.presignedUrl || "";
}
