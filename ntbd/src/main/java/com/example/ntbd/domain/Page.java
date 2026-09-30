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
@Table(name = "\"page\"")
public class Page extends AuditableEntity {

    @EmbeddedId
    private PageId id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String path;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    /** The branch's layout page: its widgets show on every other page of the branch. */
    @Column(name = "is_layout", nullable = false)
    @Builder.Default
    private boolean layout = false;

    @OneToMany(cascade = CascadeType.REMOVE, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "page")
    @Builder.Default
    private List<UiComponent> components = List.of();

    @Embeddable
    public record PageId(@GeneratedValue Long id) {}
}
