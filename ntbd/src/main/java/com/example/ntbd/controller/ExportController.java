package com.example.ntbd.controller;

import com.example.ntbd.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;

    @GetMapping(value = "/page/{pageId}")
    public ResponseEntity<byte[]> exportPage(@PathVariable Long pageId) {
        String html = exportService.exportPageToHtml(pageId);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename("page_" + pageId + ".html").build());

        // Explicit UTF-8: the platform default (e.g. cp1252 on Windows) garbles umlauts and quotes
        return new ResponseEntity<>(html.getBytes(StandardCharsets.UTF_8), headers, HttpStatus.OK);
    }
}
