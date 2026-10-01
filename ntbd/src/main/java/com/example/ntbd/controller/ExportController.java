package com.example.ntbd.controller;

import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.export.format.ExportFormatRegistry;
import com.example.ntbd.export.format.ExportedFile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exports a branch's app: as its definition, or packaged in one of the export formats. */
@RequiredArgsConstructor
@RestController
@RequestMapping("/api")
public class ExportController {

    private final AppDefinitionService definitionService;
    private final ExportFormatRegistry formats;

    /** What the exported app runs: its pages, widgets, workflows and data. */
    @GetMapping(value = "/branches/{branchId}/definition", produces = "application/json")
    public ResponseEntity<AppDefinition> getDefinition(@PathVariable Long branchId) {
        return ResponseEntity.ok(definitionService.build(branchId));
    }

    /** The app packaged for download (see {@link #getExportFormats()} for the formats). */
    @GetMapping("/branches/{branchId}/export")
    public ResponseEntity<byte[]> exportApp(@PathVariable Long branchId,
                                            @RequestParam(defaultValue = "html") String format) {
        ExportedFile file = formats.get(format).export(definitionService.build(branchId));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(file.mediaType());
        headers.setContentDisposition(ContentDisposition.attachment().filename(file.fileName()).build());
        return new ResponseEntity<>(file.content(), headers, HttpStatus.OK);
    }

    /** The export formats there are (ids for {@code ?format=}). */
    @GetMapping(value = "/export/formats", produces = "application/json")
    public ResponseEntity<List<String>> getExportFormats() {
        return ResponseEntity.ok(formats.ids());
    }
}
