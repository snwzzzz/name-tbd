package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
// Deleted rows (SoftDeleteService) are invisible to every query; native SQL still sees them (restore, purge)
@org.hibernate.annotations.SQLRestriction("deleted_at is null")
@Table(name = "\"node\"")
public class Node extends AuditableEntity {

    @EmbeddedId
    private NodeId id;

    /** When it was deleted (it's kept a while, so the deletion can be undone); null while it exists. */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    @Column(nullable = false)
    private String type;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> props;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workflow_id", nullable = false)
    private Workflow workflow;

    @Column(name = "pos_x")
    private Double x;

    @Column(name = "pos_y")
    private Double y;

    @Embeddable
    public record NodeId(@GeneratedValue Long id) {}
}
