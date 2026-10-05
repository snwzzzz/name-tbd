package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.RowNotFoundException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Reads and writes the rows of one kind of system (a database, Google Sheets, an API). A Spring bean per
 * kind; {@link ConnectorRegistry} finds them, so a new kind of system is a new bean.
 * <p>
 * Values are text both ways (as everywhere in apps); a connector converts them to and from its system's
 * types. Rows are identified by the source's key column (or the connector's own ids), never by position,
 * so changes made by several people at once hit the right rows. Failures of the system are
 * {@link com.example.ntbd.Exception.ConnectorException}s with a message for the app builder.
 */
public interface DataConnector {

    /** The kinds of connection this connector serves, e.g. "postgres", "mysql". */
    Set<String> kinds();

    /** Checks that the connection works (signs in, reaches the system); throws if it doesn't. */
    void test(ConnectionRef connection);

    /**
     * What can be read through the connection (tables, sheets, lists), for the editor to pick from.
     * {@code partial}: the source settings chosen so far (e.g. the spreadsheet whose sheets to list).
     */
    default List<String> targets(ConnectionRef connection, Settings partial) {
        return List.of();
    }

    /** The source's columns and key column. */
    SourceSchema describe(SourceRef source);

    /** The first {@code source.maxRows()} rows. */
    LiveRows read(SourceRef source);

    /** One row by id; empty when there's none. */
    default Optional<LiveRow> get(SourceRef source, String rowId) {
        return read(source).rows().stream().filter(row -> row.id().equals(rowId)).findFirst();
    }

    /** Adds a row; columns without a value are left empty (or to the system's defaults). */
    LiveRow insert(SourceRef source, Map<String, String> values);

    /** Changes the given columns of a row; the others keep their values. */
    LiveRow update(SourceRef source, String rowId, Map<String, String> values) throws RowNotFoundException;

    /** Deletes rows; ids that are already gone are skipped. */
    void delete(SourceRef source, List<String> rowIds);
}
