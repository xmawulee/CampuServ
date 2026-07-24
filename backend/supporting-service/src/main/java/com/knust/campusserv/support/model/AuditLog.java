package com.knust.campusserv.support.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "admin_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "admin_id", nullable = false)
    private String adminId;

    @Column(name = "action_type", nullable = false)
    private String actionType; // e.g. "APPROVE_PROVIDER", "FORCE_COMPLETE_JOB", "SPLIT_ESCROW"

    @Column(name = "target_entity", nullable = false)
    private String targetEntity; // e.g. "USER", "JOB", "WALLET_TRANSACTION"

    @Column(name = "target_id")
    private String targetId; // ID of the affected resource

    @Column(length = 1000)
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
