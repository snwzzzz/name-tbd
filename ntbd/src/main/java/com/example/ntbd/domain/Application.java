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
@Table(name = "\"application\"")
public class Application extends AuditableEntity {

    @EmbeddedId
    private ApplicationId id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @OneToMany(orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "application")
    private List<Branch> branches = List.of();

    @Embeddable
    public record ApplicationId(@GeneratedValue Long id) {}

}
