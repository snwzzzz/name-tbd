package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

/** Where applications live. Every user gets a personal one on first sign-in; members get a role in it. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"workspace\"")
public class Workspace extends AuditableEntity {

    @EmbeddedId
    private WorkspaceId id;

    @Column(nullable = false)
    private String name;

    /** The user's own workspace, created on first sign-in. */
    @Column(nullable = false)
    private boolean personal;

    @Embeddable
    public record WorkspaceId(@GeneratedValue Long id) {}
}
