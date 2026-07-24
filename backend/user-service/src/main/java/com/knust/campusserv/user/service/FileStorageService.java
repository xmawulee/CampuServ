package com.knust.campusserv.user.service;

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

    // URL prefix exposed through the gateway route: /users/files/** -> user-service GET /users/files/{filename}
    private static final String URL_PREFIX = "/users/files/";

    public String storeFile(MultipartFile file) {
        try {
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            String originalName = file.getOriginalFilename();
            String cleanName = originalName != null ? originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "file";
            String fileName = UUID.randomUUID().toString() + "_" + cleanName;

            Path targetLocation = Paths.get(uploadDir).resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation);

            return URL_PREFIX + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file.", ex);
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null) return;
        // Support both old /auth/files/ paths and new /users/files/ paths
        String fileName = null;
        if (fileUrl.startsWith(URL_PREFIX)) {
            fileName = fileUrl.substring(URL_PREFIX.length());
        } else if (fileUrl.startsWith("/auth/files/")) {
            fileName = fileUrl.substring("/auth/files/".length());
        }
        if (fileName == null) return;
        try {
            Path targetLocation = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(targetLocation);
        } catch (IOException e) {
            System.err.println("Failed to delete file: " + fileUrl + " - " + e.getMessage());
        }
    }

    public Path resolveFilePath(String fileName) {
        return Paths.get(uploadDir).resolve(fileName).normalize();
    }
}
