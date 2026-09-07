package com.example.ntbd.domain.domain;

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
@Table(name = "user")
public class User {

    @EmbeddedId
    private UserId id;

    @Column(nullable = false, unique = true)
    @Convert(converter = UsernameConverter.class)
    private Username username;

    @Column(nullable = false, unique = true)
    @Convert(converter = EmailConverter.class)
    private Email email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    public record UserId(@GeneratedValue Long id) {}

}
