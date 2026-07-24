package com.knust.campusserv.user.repository;

import com.knust.campusserv.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    List<User> findByRole(String role);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE " +
            "(u.role = 'PROVIDER' OR u.primaryRole = 'PROVIDER') " +
            "AND (u.accountStatus IS NULL OR u.accountStatus = 'ACTIVE') " +
            "AND (u.primaryRoleVerified = true OR u.isVerified = true) " +
            "AND (cast(:category as string) IS NULL OR EXISTS (SELECT ps FROM ProviderService ps WHERE ps.providerId = u.id AND (LOWER(ps.category.id) = LOWER(cast(:category as string)) OR LOWER(ps.category.name) = LOWER(cast(:category as string)))) OR LOWER(u.serviceCategory) LIKE LOWER(CONCAT('%', cast(:category as string), '%'))) " +
            "AND (cast(:name as string) IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', cast(:name as string), '%'))) " +
            "AND (u.rating >= :minRating)")
    org.springframework.data.domain.Page<User> searchProviders(
            @org.springframework.data.repository.query.Param("category") String category,
            @org.springframework.data.repository.query.Param("name") String name,
            @org.springframework.data.repository.query.Param("minRating") Double minRating,
            org.springframework.data.domain.Pageable pageable);
}
