package com.knust.campusserv.job.service;

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

            // Access URL routed via Gateway /auth/files/{filename}
            return "/auth/files/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file.", ex);
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/auth/files/")) return;
        String fileName = fileUrl.substring("/auth/files/".length());
        try {
            Path targetLocation = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(targetLocation);
        } catch (IOException e) {
            System.err.println("Failed to delete file: " + fileUrl + " - " + e.getMessage());
        }
    }
}
