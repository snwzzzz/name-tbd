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
@Table(name = "\"node\"")
public class Node extends AuditableEntity {

    @EmbeddedId
    private NodeId id;

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
