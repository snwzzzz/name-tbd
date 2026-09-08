package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;
import org.jetbrains.annotations.NotNull;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"version_control\"")
public class VersionControl {

    @EmbeddedId
    private VersionControlId id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User modifiedBy;

    @Embeddable
    public record VersionControlId(@NotNull Version version, @NotNull Branch.BranchId branchId) {}
}
