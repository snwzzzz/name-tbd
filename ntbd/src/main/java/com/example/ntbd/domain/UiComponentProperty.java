package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "\"ui_component_property\"")
public class UiComponentProperty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_id", nullable = false)
    private UiComponent component;

    @Column(name = "prop_key", nullable = false)
    private String propKey;

    @Column(name = "prop_value", columnDefinition = "TEXT")
    private String propValue; // Stored as string, parsed appropriately based on type
}
