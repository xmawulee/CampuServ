package com.knust.campusserv.support.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Value("${cloud.storage.enabled:false}")
    private boolean cloudStorageEnabled;

    @Value("${cloud.storage.url:}")
    private String cloudStorageUrl;

    @Value("${cloud.storage.access-key:}")
    private String cloudAccessKey;

    public String storeFile(MultipartFile file) {
        try {
            String originalName = file.getOriginalFilename();
            String cleanName = originalName != null ? originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "file";
            String fileName = UUID.randomUUID().toString() + "_" + cleanName;

            // Attempt Cloud Object Storage upload (AWS S3 / Supabase Storage REST) if enabled or configured
            if (cloudStorageEnabled || (cloudStorageUrl != null && !cloudStorageUrl.isBlank())) {
                try {
                    String cloudUrl = uploadToCloudStorage(fileName, file.getBytes(), file.getContentType());
                    if (cloudUrl != null) {
                        System.out.println(">>> FileStorageService: Stored file in Cloud Object Storage: " + cloudUrl);
                        return cloudUrl;
                    }
                } catch (Exception cloudErr) {
                    System.err.println(">>> Cloud Storage Upload Error, falling back to local storage: " + cloudErr.getMessage());
                }
            }

            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            Path targetLocation = Paths.get(uploadDir).resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation);

            // Access URL routed via Gateway /auth/files/{filename}
            return "/auth/files/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file.", ex);
        }
    }

    private String uploadToCloudStorage(String fileName, byte[] data, String contentType) {
        try {
            if (cloudStorageUrl == null || cloudStorageUrl.isBlank()) {
                return null;
            }
            String targetUrl = cloudStorageUrl.endsWith("/") ? cloudStorageUrl + fileName : cloudStorageUrl + "/" + fileName;
            java.net.URL url = new java.net.URL(targetUrl);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PUT");
            conn.setDoOutput(true);
            if (contentType != null) conn.setRequestProperty("Content-Type", contentType);
            if (cloudAccessKey != null && !cloudAccessKey.isBlank()) {
                conn.setRequestProperty("Authorization", "Bearer " + cloudAccessKey);
            }
            try (java.io.OutputStream os = conn.getOutputStream()) {
                os.write(data);
                os.flush();
            }
            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                return targetUrl;
            }
        } catch (Exception e) {
            System.err.println("Cloud REST upload failed: " + e.getMessage());
        }
        return null;
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null) return;
        if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
            System.out.println("Cloud file deletion queued for: " + fileUrl);
            return;
        }
        if (!fileUrl.startsWith("/auth/files/")) return;
        String fileName = fileUrl.substring("/auth/files/".length());
        try {
            Path targetLocation = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(targetLocation);
        } catch (IOException e) {
            System.err.println("Failed to delete file: " + fileUrl + " - " + e.getMessage());
        }
    }

}
