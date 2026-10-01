package com.example.ntbd.export.format;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Every {@link ExportFormat} bean, by its id. */
@Component
public class ExportFormatRegistry {

    private final Map<String, ExportFormat> formats;

    public ExportFormatRegistry(List<ExportFormat> formats) {
        this.formats = formats.stream().collect(Collectors.toMap(ExportFormat::id, Function.identity(), (a, b) -> {
            throw new IllegalStateException("Two export formats with the id \"" + a.id() + "\"");
        }));
    }

    /** @throws IllegalArgumentException for an unknown format (a bad request) */
    public ExportFormat get(String id) {
        ExportFormat format = formats.get(id);
        if (format == null) {
            throw new IllegalArgumentException("Unknown export format \"" + id + "\"; available: " + String.join(", ", ids()));
        }
        return format;
    }

    public List<String> ids() {
        return formats.keySet().stream().sorted().toList();
    }
}
