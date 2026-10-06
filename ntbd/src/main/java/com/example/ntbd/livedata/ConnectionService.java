package com.example.ntbd.livedata;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.ConnectionNotFoundException;
import com.example.ntbd.Exception.WorkspaceNotFoundException;
import com.example.ntbd.commands.ConnectionCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.DataConnection;
import com.example.ntbd.domain.Workspace;
import com.example.ntbd.dto.ConnectionDto;
import com.example.ntbd.livedata.connector.ConnectionRef;
import com.example.ntbd.livedata.connector.Settings;
import com.example.ntbd.livedata.oauth.OAuthProviders;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.DataConnectionRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** A workspace's connections to its customers' systems; their secrets go in encrypted and never come out. */
@Service
@RequiredArgsConstructor
public class ConnectionService {

    /** Kinds made by signing in at a provider (OAuthController), not with a form. */
    static final Set<String> OAUTH_KINDS = Set.of("gsheets", "msgraph");

    private final DataConnectionRepository connections;
    private final WorkspaceRepository workspaces;
    private final BranchRepository branches;
    private final SecretBox secrets;
    private final LiveDataService liveData;
    private final OAuthProviders providers;

    /** The workspace a command means (its workspaceId, or the workspace of its branch's app). */
    @Transactional(readOnly = true)
    public Long workspaceOf(Long workspaceId, Long branchId) {
        if (workspaceId != null) return workspaceId;
        if (branchId == null) throw new IllegalArgumentException("workspaceId or branchId is required");
        return branches.findById(new Branch.BranchId(branchId))
                .orElseThrow(() -> new BranchNotFoundException(branchId))
                .getApplication().getWorkspace().getId().id();
    }

    @Transactional(readOnly = true)
    public List<ConnectionDto> list(Long workspaceId) {
        return connections.findByWorkspaceId(workspaceId).stream().map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public ConnectionDto get(Long id) {
        return dto(find(id));
    }

    @Transactional
    public ConnectionDto create(Long workspaceId, ConnectionCommand command) {
        String kind = requireKind(command.kind());
        if (OAUTH_KINDS.contains(kind)) {
            throw new IllegalArgumentException("Connect " + kind + " by signing in (/api/connections/oauth/" + providers.forKind(kind).id() + "/start)");
        }
        Workspace workspace = workspaces.findById(new Workspace.WorkspaceId(workspaceId))
                .orElseThrow(() -> new WorkspaceNotFoundException(workspaceId));
        Settings settings = new Settings(command.settings());
        Settings secret = new Settings(command.secret());
        // Only working connections are kept
        liveData.connector(kind).test(new ConnectionRef(null, kind, settings, secret));
        DataConnection connection = DataConnection.builder()
                .workspace(workspace)
                .name(requireName(command.name()))
                .kind(kind)
                .settings(liveData.json(settings))
                .secret(secret.values().isEmpty() ? null : secrets.seal(liveData.json(secret)))
                .build();
        return dto(connections.saveAndFlush(connection));
    }

    /** Made after signing in at a provider: the refresh token is its secret. */
    @Transactional
    public ConnectionDto createSignedIn(Long workspaceId, String name, String kind, Map<String, Object> settings, Map<String, Object> secret) {
        Workspace workspace = workspaces.findById(new Workspace.WorkspaceId(workspaceId))
                .orElseThrow(() -> new WorkspaceNotFoundException(workspaceId));
        DataConnection connection = DataConnection.builder()
                .workspace(workspace)
                .name(requireName(name))
                .kind(kind)
                .settings(liveData.json(new Settings(settings)))
                .secret(secrets.seal(liveData.json(new Settings(secret))))
                .build();
        return dto(connections.saveAndFlush(connection));
    }

    /** Signs an existing connection in again (new refresh token), keeping its data sources. */
    @Transactional
    public ConnectionDto reconnect(Long id, Map<String, Object> settings, Map<String, Object> secret) {
        DataConnection connection = find(id);
        Map<String, Object> merged = new LinkedHashMap<>(liveData.parse(connection.getSettings()).values());
        merged.putAll(settings);
        connection.setSettings(liveData.json(new Settings(merged)));
        connection.setSecret(secrets.seal(liveData.json(new Settings(secret))));
        return dto(connection);
    }

    @Transactional
    public ConnectionDto update(Long id, ConnectionCommand command) {
        DataConnection connection = find(id);
        if (command.name() != null) connection.setName(requireName(command.name()));
        Settings settings = command.settings() != null ? new Settings(command.settings()) : liveData.parse(connection.getSettings());
        Settings secret = command.secret() != null ? new Settings(command.secret())
                : connection.getSecret() == null ? Settings.EMPTY : liveData.parse(secrets.open(connection.getSecret()));
        if (command.settings() != null || command.secret() != null) {
            if (!OAUTH_KINDS.contains(connection.getKind())) {
                liveData.connector(connection.getKind()).test(new ConnectionRef(null, connection.getKind(), settings, secret));
            }
            connection.setSettings(liveData.json(settings));
            if (command.secret() != null) connection.setSecret(secret.values().isEmpty() ? null : secrets.seal(liveData.json(secret)));
        }
        return dto(connection);
    }

    /** Deletes a connection; its data sources stay, without a connection, until another one is chosen. */
    @Transactional
    public void delete(Long id) {
        connections.delete(find(id));
    }

    /** Tries a saved connection. */
    public void test(Long id) {
        ConnectionRef ref = ref(id);
        liveData.connector(ref.kind()).test(ref);
    }

    /** Tries a connection out before saving it. */
    public void test(ConnectionCommand command) {
        String kind = requireKind(command.kind());
        liveData.connector(kind).test(new ConnectionRef(null, kind, new Settings(command.settings()), new Settings(command.secret())));
    }

    /** What the connection can read (tables, sheets, lists), given the source settings chosen so far. */
    public List<String> targets(Long id, Map<String, Object> partial) {
        ConnectionRef ref = ref(id);
        return liveData.connector(ref.kind()).targets(ref, new Settings(partial));
    }

    public ConnectionRef ref(Long id) {
        DataConnection connection = connections.findById(id).orElseThrow(() -> new ConnectionNotFoundException(id));
        return liveData.connectionRef(connection);
    }

    @Transactional(readOnly = true)
    public Long workspaceIdOf(Long connectionId) {
        return find(connectionId).getWorkspace().getId().id();
    }

    private DataConnection find(Long id) {
        return connections.findById(id).orElseThrow(() -> new ConnectionNotFoundException(id));
    }

    private ConnectionDto dto(DataConnection connection) {
        return new ConnectionDto(connection.getId(), connection.getWorkspace().getId().id(), connection.getName(),
                connection.getKind(), liveData.parse(connection.getSettings()).values(), connection.getSecret() != null);
    }

    private String requireKind(String kind) {
        if (kind == null || kind.isBlank()) throw new IllegalArgumentException("A connection needs a kind");
        liveData.connector(kind.trim());
        return kind.trim();
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("A connection needs a name");
        String trimmed = name.trim();
        if (trimmed.length() > 255) throw new IllegalArgumentException("A connection's name can have at most 255 characters");
        return trimmed;
    }
}
