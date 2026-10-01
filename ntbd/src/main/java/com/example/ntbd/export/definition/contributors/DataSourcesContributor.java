package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.dto.DataSourceSummaryDto;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ExportScope;
import com.example.ntbd.service.DataSourceService;
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

    private final DataSourceService dataSourceService;
    private final ObjectMapper objectMapper;

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        List<DataSourceSnapshot> snapshots = dataSourceService.findByBranchId(scope.branchId()).stream()
                .map(DataSourceSummaryDto::id)
                .map(dataSourceService::findById)
                .map(DataSourcesContributor::snapshot)
                .toList();
        definition.put("dataSources", snapshots);
        definition.put("dataRevision", fingerprint(objectMapper.writeValueAsString(snapshots)));
    }

    private static DataSourceSnapshot snapshot(DataSourceDto source) {
        return new DataSourceSnapshot(source.id(), Objects.requireNonNullElse(source.name(), ""),
                Objects.requireNonNullElse(source.columns(), List.of()),
                Objects.requireNonNullElse(source.rows(), List.of()));
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
