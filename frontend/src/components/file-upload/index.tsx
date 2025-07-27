"use client";

import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

// TypeScript interfaces for API response
interface UploadedFile {
  id: string;
  original_name: string;
  file_size: number;
  content_type: string;
  s3_url: string;
  upload_status: string;
  error_message: string | null;
  created_at: string;
}

interface UploadResponse {
  session_id: string;
  uploaded_files: UploadedFile[];
  failed_files: number;
  total_files: number;
  success_count: number;
}

const FileUpload: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
      setError("");
      setUploadResponse(null);
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Upload files to API
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();

      // Append all selected files to FormData
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("http://54.221.144.32/api/upload/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      //   const result: UploadResponse = await response.json();
      //   setUploadResponse(result);

      const text = await response.text(); // <-- safer than .json() if backend sends wrong format
      console.log("Upload response text:", text);

      try {
        const result: UploadResponse = JSON.parse(text);
        setUploadResponse(result);
      } catch (err) {
        console.error("JSON parse error:", err);
        setError("Upload failed: Invalid server response");
      }

      // Clear selected files after successful upload
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Clear all selections and responses
  const clearAll = () => {
    setSelectedFiles([]);
    setUploadResponse(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-cloud-upload me-2"></i>
                File Upload
              </h4>
            </div>
            <div className="card-body">
              {/* File Selection */}
              <div className="mb-4">
                <label htmlFor="fileInput" className="form-label fw-bold">
                  Select Files
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  id="fileInput"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <div className="form-text">
                  You can select multiple files to upload at once.
                </div>
              </div>

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold">
                    Selected Files ({selectedFiles.length})
                  </h6>
                  <div className="list-group">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>{file.name}</strong>
                          <br />
                          <small className="text-muted">
                            {formatFileSize(file.size)} •{" "}
                            {file.type || "Unknown type"}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex gap-2 mb-4">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-2"></i>
                      Upload Files
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearAll}
                  disabled={isUploading}
                >
                  Clear All
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Upload Response Display */}
              {uploadResponse && (
                <div className="alert alert-success" role="alert">
                  <h6 className="alert-heading">
                    <i className="bi bi-check-circle me-2"></i>
                    Upload Successful!
                  </h6>
                  <p className="mb-2">
                    <strong>Session ID:</strong> {uploadResponse.session_id}
                  </p>
                  <p className="mb-2">
                    <strong>Files Uploaded:</strong>{" "}
                    {uploadResponse.success_count} of{" "}
                    {uploadResponse.total_files}
                  </p>
                  {uploadResponse.failed_files > 0 && (
                    <p className="mb-2 text-warning">
                      <strong>Failed Files:</strong>{" "}
                      {uploadResponse.failed_files}
                    </p>
                  )}

                  {/* Uploaded Files List */}
                  {uploadResponse.uploaded_files.length > 0 && (
                    <div className="mt-3">
                      <h6>Uploaded Files:</h6>
                      <div className="list-group list-group-flush">
                        {uploadResponse.uploaded_files.map((file) => (
                          <div key={file.id} className="list-group-item px-0">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{file.original_name}</strong>
                                <br />
                                <small className="text-muted">
                                  {formatFileSize(file.file_size)} •{" "}
                                  {file.content_type}
                                </small>
                                <br />
                                <small className="text-muted">
                                  Status:{" "}
                                  <span className="badge bg-success">
                                    {file.upload_status}
                                  </span>
                                </small>
                              </div>
                              <div>
                                <a
                                  href={file.s3_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  View File
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
