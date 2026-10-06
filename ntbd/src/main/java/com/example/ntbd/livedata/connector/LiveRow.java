package com.example.ntbd.livedata.connector;

import java.util.List;

/** A row: its id (the key column's value, or the connector's row id) and a value per column ("" when empty). */
public record LiveRow(String id, List<String> values) {
}
