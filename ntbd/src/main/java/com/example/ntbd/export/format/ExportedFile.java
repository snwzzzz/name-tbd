package com.example.ntbd.export.format;

import org.springframework.http.MediaType;

/** A packaged app, ready to download. */
public record ExportedFile(String fileName, MediaType mediaType, byte[] content) {
}
