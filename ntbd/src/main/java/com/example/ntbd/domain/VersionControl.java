package com.example.ntbd.domain;

import com.example.ntbd.persistence.converter.VersionConverter;
import jakarta.persistence.*;
import lombok.*;

/**
 * A version of a branch: a snapshot of its content ({@link com.example.ntbd.content.BranchContent} as
 * JSON), numbered per branch. See {@link com.example.ntbd.service.VersionControlService}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"version_control\"",
        uniqueConstraints = @UniqueConstraint(columnNames = {"branch_id", "version_number"}))
public class VersionControl extends AuditableEntity {

    @EmbeddedId
    private VersionControlId id;

    /** 1, 2, 3, ... per branch. */
    @Column(name = "version_number", nullable = false)
    private Integer number;

    /** A semantic version; only versions saved before snapshots have one. */
    @Convert(converter = VersionConverter.class)
    @AttributeOverride(name = "value", column = @Column(name = "version"))
    private Version version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VersionKind kind;

    @Column(length = 200)
    private String label;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    /** The branch's content as JSON. */
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "json")
    private String content;

    /** SHA-256 of {@link #content}: whether anything changed since. */
    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "modified_by_id", nullable = false)
    private User modifiedBy;

    @Embeddable
    public record VersionControlId(@GeneratedValue Long id) {}
}
