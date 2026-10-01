package com.example.ntbd.export.format;

import com.example.ntbd.Exception.ExportRuntimeUnavailableException;
import com.example.ntbd.export.definition.AppDefinition;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

/**
 * The app as one HTML file that runs anywhere, even opened from disk: the runtime's page with its
 * script, styles and the app definition inlined.
 */
@Component
public class SingleFileHtmlExport implements ExportFormat {

    // The runtime's index.html as the frontend builds it (see src/runtime/index.html)
    static final String STYLES_TAG = "<link rel=\"stylesheet\" href=\"styles.css\">";
    static final String SCRIPT_TAG = "<script src=\"main.js\" type=\"module\"></script>";
    static final String DEFINITION_TAG = "<script type=\"application/json\" id=\"app-definition\"></script>";
    static final String TITLE_TAG = "<title>App</title>";

    private static final MediaType HTML = new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8);

    private final ExportRuntime runtime;
    private final ObjectMapper objectMapper;

    public SingleFileHtmlExport(ExportRuntime runtime, ObjectMapper objectMapper) {
        this.runtime = runtime;
        this.objectMapper = objectMapper;
    }

    @Override
    public String id() {
        return "html";
    }

    @Override
    public ExportedFile export(AppDefinition definition) {
        String name = definition.getApp().name() != null ? definition.getApp().name() : "App";
        String html = runtime.file("index.html");
        html = replace(html, TITLE_TAG, "<title>" + escapeHtml(name) + "</title>");
        html = replace(html, STYLES_TAG, "<style>" + inStyle(runtime.file("styles.css")) + "</style>");
        html = replace(html, DEFINITION_TAG, "<script type=\"application/json\" id=\"app-definition\">"
                + jsonInScript(objectMapper.writeValueAsString(definition)) + "</script>");
        // Last: the script itself may contain any of the markers above
        html = replace(html, SCRIPT_TAG, "<script type=\"module\">" + inScript(runtime.file("main.js")) + "</script>");

        return new ExportedFile(fileName(name), HTML, html.getBytes(StandardCharsets.UTF_8));
    }

    private static String replace(String html, String marker, String replacement) {
        int at = html.indexOf(marker);
        if (at < 0) {
            throw new ExportRuntimeUnavailableException("The app runtime's index.html has no " + marker
                    + "; rebuild it with `npm run build:runtime` in name-tbd");
        }
        return html.substring(0, at) + replacement + html.substring(at + marker.length());
    }

    /**
     * Script code that is safe inside a script element: it can't end it ({@code </script}) or open
     * an HTML comment there. These only occur in JS strings and regexes, where the escapes mean the same.
     */
    static String inScript(String js) {
        return js.replaceAll("(?i)</(script)", "<\\\\/$1").replace("<!--", "<\\!--");
    }

    /** JSON that is safe inside a script element: "<" only occurs in its strings, where its unicode escape means the same. */
    static String jsonInScript(String json) {
        return json.replace("<", "\\u003c");
    }

    /** Text that is safe inside a style element ({@code \/} is just "/" in CSS). */
    static String inStyle(String css) {
        return css.replace("</", "<\\/");
    }

    static String escapeHtml(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** E.g. "Käse Shop!" → "kase-shop.html". */
    static String fileName(String appName) {
        String slug = Normalizer.normalize(appName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return (slug.isEmpty() ? "app" : slug) + ".html";
    }
}
