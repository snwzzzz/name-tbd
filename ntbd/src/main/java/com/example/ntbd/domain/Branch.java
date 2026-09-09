package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"branch\"")
public class Branch {

    @EmbeddedId
    private BranchId id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastModified;

    private String latestVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Application application;

    @OneToMany(orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "branch")
    private List<VersionControl> versions = List.of();

    @Embeddable
    public record BranchId(@GeneratedValue Long id) { }
}
