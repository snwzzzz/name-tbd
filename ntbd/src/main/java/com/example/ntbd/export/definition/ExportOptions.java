package com.example.ntbd.export.definition;

/**
 * How an app is exported.
 *
 * @param dataMode   where its data lives
 * @param apiUrl     where a live export reaches the data API (this server)
 * @param appKey     the key a live export calls the data API with (made for this export)
 * @param allColumns embed every column, not only the ones the app uses
 */
public record ExportOptions(DataMode dataMode, String apiUrl, String appKey, boolean allColumns) {

    public static final ExportOptions EMBED = new ExportOptions(DataMode.EMBED, null, null, false);

    public ExportOptions {
        dataMode = dataMode == null ? DataMode.EMBED : dataMode;
        if (dataMode.live() && (apiUrl == null || appKey == null)) {
            throw new IllegalArgumentException("A live export needs the data API's address and an app key");
        }
    }
}
