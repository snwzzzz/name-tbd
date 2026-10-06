package com.example.ntbd.domain;

import com.example.ntbd.persistence.converter.EmailConverter;
import com.example.ntbd.persistence.converter.UsernameConverter;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"user\"")
public class User extends AuditableEntity {

    @EmbeddedId
    private UserId id;

    /** Not set for users who sign in with an identity provider. */
    @Column(unique = true)
    @Convert(converter = UsernameConverter.class)
    private Username username;

    @Column(nullable = false, unique = true)
    @Convert(converter = EmailConverter.class)
    private Email email;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(length = 1024)
    private String avatarUrl;

    @Embeddable
    public record UserId(@GeneratedValue Long id) {}

}
