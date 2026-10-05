package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

/**
 * How to reach a system where a customer keeps data (a database, Google Sheets, an API). It belongs to a
 * workspace, so its apps, their branches and copies share it. {@code secret} is encrypted (SecretBox) and
 * never leaves the server: not to the editor, not into an export.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "\"data_connection\"")
public class DataConnection extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String name;

    /** The connector, e.g. "postgres", "gsheets". */
    @Column(nullable = false)
    private String kind;

    /** JSON without secrets (host, port, base URL, ...). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String settings;

    /** Encrypted JSON (password, token, ...); null: none. */
    @Column(columnDefinition = "TEXT")
    private String secret;
}
