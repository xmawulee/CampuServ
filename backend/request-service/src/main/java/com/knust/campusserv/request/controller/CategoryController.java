package com.knust.campusserv.request.controller;

import com.knust.campusserv.request.model.ServiceCategory;
import com.knust.campusserv.request.repository.ServiceCategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
public class CategoryController {

    @Autowired
    private ServiceCategoryRepository categoryRepository;

    @GetMapping("/categories")
    public ResponseEntity<List<ServiceCategory>> getCategories() {
        return ResponseEntity.ok(categoryRepository.findByActiveTrue());
    }

    @PostMapping("/admin/categories")
    public ResponseEntity<?> createCategory(@RequestBody ServiceCategory request) {
        request.setId("cat-" + UUID.randomUUID().toString());
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryRepository.save(request));
    }

    @PutMapping("/admin/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable String id, @RequestBody ServiceCategory request) {
        Optional<ServiceCategory> catOpt = categoryRepository.findById(id);
        if (catOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Category not found.");
        }
        
        ServiceCategory cat = catOpt.get();
        if (request.getName() != null) cat.setName(request.getName());
        if (request.getDescription() != null) cat.setDescription(request.getDescription());
        if (request.getIcon() != null) cat.setIcon(request.getIcon());
        if (request.getBg() != null) cat.setBg(request.getBg());
        if (request.getIconColor() != null) cat.setIconColor(request.getIconColor());
        if (request.getIconKey() != null) cat.setIconKey(request.getIconKey());
        if (request.getActive() != null) cat.setActive(request.getActive());

        return ResponseEntity.ok(categoryRepository.save(cat));
    }

    @DeleteMapping("/admin/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable String id) {
        Optional<ServiceCategory> catOpt = categoryRepository.findById(id);
        if (catOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Category not found.");
        }
        ServiceCategory cat = catOpt.get();
        cat.setActive(false);
        categoryRepository.save(cat);
        return ResponseEntity.ok("Category deactivated (soft-deleted).");
    }
}
