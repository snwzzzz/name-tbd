package com.example.ntbd.domain;

import com.example.ntbd.persistence.converter.UsernameConverter;
import com.example.ntbd.persistence.converter.VersionConverter;
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
@Table(name = "\"version_control\"",
        uniqueConstraints = @UniqueConstraint(columnNames = {"version", "branch_id"}))
public class VersionControl {

    @EmbeddedId
    private VersionControlId id;

    @Convert(converter = VersionConverter.class)
    @AttributeOverride(name = "value", column = @Column(name = "version", nullable = false))
    private Version version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String applicationDefinition;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User modifiedBy;

    @Embeddable
    public record VersionControlId(@GeneratedValue Long id) {}
}
