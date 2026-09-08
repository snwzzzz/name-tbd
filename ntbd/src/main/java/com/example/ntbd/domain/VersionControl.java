package com.example.ntbd.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

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

    @Column(nullable = false)
    private String applicationDefinition;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User modifiedBy;

    @Embeddable
    public record VersionControlId(@NotNull Version version, @NotNull Branch.BranchId branchId) {}
}
