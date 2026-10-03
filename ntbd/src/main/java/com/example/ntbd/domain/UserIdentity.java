package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

/** One way a user signs in: their id ({@code subject}) at an identity provider ({@code issuer}). */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"user_identity\"",
        uniqueConstraints = @UniqueConstraint(columnNames = {"issuer", "subject"}))
public class UserIdentity extends AuditableEntity {

    @EmbeddedId
    private UserIdentityId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 512)
    private String issuer;

    @Column(nullable = false)
    private String subject;

    @Embeddable
    public record UserIdentityId(@GeneratedValue Long id) {}
}
