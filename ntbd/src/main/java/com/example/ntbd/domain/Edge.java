package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
// Deleted rows (SoftDeleteService) are invisible to every query; native SQL still sees them (restore, purge)
@org.hibernate.annotations.SQLRestriction("deleted_at is null")
@Table(name = "\"edge\"")
/**
 * Represents a directed connection between two workflow nodes.
 *
 * <p><b>Note on workflow_id:</b> The original spec included a {@code workflow_id} FK column on this
 * table for convenient workflow-scoped queries. During the schema consistency pass this was deliberately
 * dropped: workflow scope is always resolvable via {@code source_node.workflow_id}, and adding a
 * second FK path would be redundant denormalization requiring an extra join-column on every insert.
 * Workflow-scoped edge queries use {@link com.example.ntbd.persistence.EdgeRepository#findBySourceNode_Workflow_Id}.
 */
public class Edge extends AuditableEntity {

    @EmbeddedId
    private EdgeId id;

    /** When it was deleted (it's kept a while, so the deletion can be undone); null while it exists. */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    @Column(nullable = false)
    private String sourcePort;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_node_id", nullable = false)
    private Node sourceNode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_node_id", nullable = false)
    private Node targetNode;

    @Embeddable
    public record EdgeId(@GeneratedValue Long id) {}
}
