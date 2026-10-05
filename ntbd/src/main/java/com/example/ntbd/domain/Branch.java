package com.example.ntbd.domain;

import com.example.ntbd.persistence.converter.VersionConverter;
import com.example.ntbd.persistence.converter.VariablesConverter;
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
public class Branch extends AuditableEntity {

    @EmbeddedId
    private BranchId id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Convert(converter = VersionConverter.class)
    private Version latestVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    /** The app's variables (a page sees them next to its own). */
    @Convert(converter = VariablesConverter.class)
    @Column(name = "variables")
    @Builder.Default
    private List<VariableDefinition> variables = List.of();

    @OneToMany(cascade = CascadeType.REMOVE, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "branch")
    @Builder.Default
    private List<VersionControl> versions = List.of();

    //private Boolean active

    @Embeddable
    public record BranchId(@GeneratedValue Long id) { }
}
