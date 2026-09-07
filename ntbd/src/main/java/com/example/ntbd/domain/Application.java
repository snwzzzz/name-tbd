package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "application")
public class Application {

    @EmbeddedId
    private ApplicationId id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String description;

    public record ApplicationId(@GeneratedValue Long id) {}

}
