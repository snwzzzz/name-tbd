package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.content.BranchContent.DataSourceContent;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ExportScope;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

/**
 * The app's data, embedded with all its rows (the exported app changes its own copy, kept in the
 * browser). Sections "dataSources" and "dataRevision": a fingerprint of the data, so a browser only
 * reuses its changes for the same exported data.
 */
@Component
@Order(200)
@RequiredArgsConstructor
public class DataSourcesContributor implements AppDefinitionContributor {

    private final ObjectMapper objectMapper;

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        List<DataSourceSnapshot> snapshots = scope.content().dataSources().stream()
                .map(DataSourcesContributor::snapshot)
                .toList();
        definition.put("dataSources", snapshots);
        definition.put("dataRevision", fingerprint(objectMapper.writeValueAsString(snapshots)));
    }

    /** Its rows with a value per column; empty where a row has none. */
    private static DataSourceSnapshot snapshot(DataSourceContent source) {
        List<List<String>> rows = source.rows().stream()
                .map(row -> row.stream().map(value -> Objects.requireNonNullElse(value, "")).toList())
                .toList();
        return new DataSourceSnapshot(source.id(), Objects.requireNonNullElse(source.name(), ""), source.columns(), rows);
    }

    private static String fingerprint(String content) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    public record DataSourceSnapshot(Long id, String name, List<String> columns, List<List<String>> rows) {
    }
}
