package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A key an exported app calls the data API with (/api/data, its bearer token). Anyone who has the
 * exported file has the key, so it only opens that app's data sources, and can be revoked. Only the
 * key's SHA-256 is stored.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "\"app_key\"")
public class AppKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "key_hash", nullable = false, unique = true)
    private String keyHash;

    /** The key's first characters, to tell keys apart. */
    @Column(nullable = false)
    private String hint;

    @Column(nullable = false)
    private String label;

    @Column(name = "allow_writes", nullable = false)
    private boolean allowWrites;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
}
