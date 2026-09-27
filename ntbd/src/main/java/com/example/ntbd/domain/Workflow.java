package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"workflow\"")
public class Workflow extends AuditableEntity {

    @EmbeddedId
    private WorkflowId id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Convert(converter = com.example.ntbd.persistence.converter.WorkflowStatusConverter.class)
    private WorkflowStatus status;

    @OneToMany(cascade = CascadeType.REMOVE, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "workflow")
    @Builder.Default
    private List<Node> nodes = List.of();



    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Embeddable
    public record WorkflowId(@GeneratedValue Long id) {}
}
