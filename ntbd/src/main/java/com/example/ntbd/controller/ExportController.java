package com.example.ntbd.controller;

import com.example.ntbd.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ExportService exportService;

    @GetMapping(value = "/page/{pageId}")
    public ResponseEntity<byte[]> exportPage(@PathVariable Long pageId) {
        String html = exportService.exportPageToHtml(pageId);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_HTML);
        headers.setContentDispositionFormData("attachment", "page_" + pageId + ".html");
        
        return new ResponseEntity<>(html.getBytes(), headers, HttpStatus.OK);
    }
}
