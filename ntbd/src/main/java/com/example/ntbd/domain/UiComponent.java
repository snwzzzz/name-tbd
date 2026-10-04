package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.ArrayList;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
// Deleted rows (SoftDeleteService) are invisible to every query; native SQL still sees them (restore, purge)
@org.hibernate.annotations.SQLRestriction("deleted_at is null")
@Table(name = "\"ui_component\"")
public class UiComponent extends AuditableEntity {

    @EmbeddedId
    private UiComponentId id;

    /** When it was deleted (it's kept a while, so the deletion can be undone); null while it exists. */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "page_id", nullable = false)
    private Page page;

    @Column(nullable = false)
    private String type;

    // Batched, so loading a page's widgets doesn't load their props one widget at a time
    @OneToMany(mappedBy = "component", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 100)
    @Builder.Default
    private List<UiComponentProperty> properties = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id")
    private Workflow workflow;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private UiComponent parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UiComponent> children = new ArrayList<>();

    @Column(name = "pos_x")
    private Double x;

    @Column(name = "pos_y")
    private Double y;

    @Column(name = "pos_w")
    private Double w;

    @Column(name = "pos_h")
    private Double h;

    @Embeddable
    public record UiComponentId(@GeneratedValue Long id) {}
}
