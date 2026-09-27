package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"edge\"")
public class Edge extends AuditableEntity {

    @EmbeddedId
    private EdgeId id;

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
