package com.example.ntbd.service;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.UserNotFoundException;
import com.example.ntbd.Exception.VersionControlNotFoundException;
import com.example.ntbd.Exception.VersionNotRestorableException;
import com.example.ntbd.auth.CurrentUser;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContentEraser;
import com.example.ntbd.content.BranchContentReader;
import com.example.ntbd.content.BranchContentWriter;
import com.example.ntbd.domain.*;
import com.example.ntbd.dto.VersionDto;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.VersionControlRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Versions of a branch: snapshots of its {@link BranchContent}, numbered per branch.
 * <ul>
 *   <li>Saved in the editor ("Save version", {@link VersionKind#MANUAL}).</li>
 *   <li>Automatically while the branch is edited ({@link #autoSnapshot}: at most every 30 minutes,
 *       only when something changed; the newest 50 are kept).</li>
 *   <li>Before an export ({@link VersionKind#BEFORE_EXPORT}), when something changed.</li>
 * </ul>
 * Restoring one first snapshots the branch as it is ({@link VersionKind#RESTORE}), so a restore can
 * itself be taken back, then empties the branch and writes the version's content into it (new ids).
 */
@Service
@RequiredArgsConstructor
public class VersionControlService {

    public static final int MAX_LABEL_LENGTH = 200;

    private final VersionControlRepository versions;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final BranchContentReader reader;
    private final BranchContentWriter writer;
    private final BranchContentEraser eraser;
    private final AppDefinitionService definitionService;
    private final ObjectMapper objectMapper;

    /** How often automatic versions are made while a branch is edited. */
    @Value("${app.versions.auto-interval:PT30M}")
    private Duration autoInterval;

    /** How many automatic versions a branch keeps (the newest). */
    @Value("${app.versions.auto-keep:50}")
    private int autoKeep;

    @Transactional
    public List<VersionDto> list(Long branchId) {
        return versions.listByBranch(branchId);
    }

    /** Saves the branch as it is now as a version (always, even when nothing changed since the last). */
    @Transactional
    public VersionDto save(Long branchId, String label) {
        return snapshot(branchId, VersionKind.MANUAL, cleanLabel(label), new Snapshot(reader.read(branchId)));
    }

    /** Saves the branch as a version of this kind, unless it's the same as its newest version. */
    @Transactional
    public Optional<VersionDto> snapshotIfChanged(Long branchId, VersionKind kind, String label) {
        Snapshot now = new Snapshot(reader.read(branchId));
        List<String> latest = versions.latestHash(branchId, PageRequest.of(0, 1));
        if (!latest.isEmpty() && now.hash.equals(latest.getFirst())) return Optional.empty();
        return Optional.of(snapshot(branchId, kind, label, now));
    }

    /**
     * After the branch was edited: an automatic version, if the last one is older than the interval
     * (or there's none) and something changed. Old automatic versions beyond the newest 50 go.
     */
    @Transactional
    public Optional<VersionDto> autoSnapshot(Long branchId) {
        LocalDateTime last = versions.lastMadeAt(branchId, VersionKind.AUTO);
        if (last != null && last.isAfter(Timestamps.nowUtc().minus(autoInterval))) return Optional.empty();
        Optional<VersionDto> made = snapshotIfChanged(branchId, VersionKind.AUTO, null);
        made.ifPresent(version -> {
            List<VersionControl.VersionControlId> autos = versions.idsOfKind(branchId, VersionKind.AUTO);
            if (autos.size() > autoKeep) versions.deleteAllById(autos.subList(autoKeep, autos.size()));
        });
        return made;
    }

    @Transactional
    public VersionDto rename(Long id, String label) {
        VersionControl version = get(id);
        version.setLabel(cleanLabel(label));
        return versions.summary(versions.save(version).getId().id());
    }

    /**
     * Makes the branch what it was in this version. What it was before is always kept as a version
     * first (so the History panel shows where to go back to); answers that version.
     */
    @Transactional
    public VersionDto restore(Long id) {
        VersionControl version = get(id);
        BranchContent content = contentOf(version);
        Long branchId = version.getBranch().getId().id();

        VersionDto before = snapshot(branchId, VersionKind.RESTORE, "Before restoring version " + version.getNumber(),
                new Snapshot(reader.read(branchId)));
        eraser.erase(branchId);
        writer.write(content, branchRepository.getReferenceById(new Branch.BranchId(branchId)));
        return before;
    }

    /** What the app was in this version, as its export runs it (for a preview). */
    @Transactional
    public AppDefinition definition(Long id) {
        VersionControl version = get(id);
        Application application = version.getBranch().getApplication();
        return definitionService.build(application.getId().id(), application.getTitle(), contentOf(version));
    }

    // ---- Helpers ----

    /** The content as stored, its JSON and hash. */
    private final class Snapshot {
        final String json;
        final String hash;

        Snapshot(BranchContent content) {
            this.json = objectMapper.writeValueAsString(content);
            this.hash = sha256(json);
        }
    }

    private VersionDto snapshot(Long branchId, VersionKind kind, String label, Snapshot snapshot) {
        Branch branch = branchRepository.findById(new Branch.BranchId(branchId))
                .orElseThrow(() -> new BranchNotFoundException(branchId));
        User.UserId userId = currentUser.requireId();
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId.id()));

        VersionControl saved = versions.save(VersionControl.builder()
                .branch(branch)
                .number(versions.lastNumber(branchId) + 1)
                .kind(kind)
                .label(label)
                .content(snapshot.json)
                .contentHash(snapshot.hash)
                .sizeBytes(snapshot.json.getBytes(StandardCharsets.UTF_8).length)
                .modifiedBy(user)
                .build());
        String author = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return new VersionDto(saved.getId().id(), saved.getNumber(), kind, label,
                Timestamps.toInstant(saved.getCreatedAt()), author, saved.getSizeBytes());
    }

    private VersionControl get(Long id) {
        return versions.findById(new VersionControl.VersionControlId(id))
                .orElseThrow(() -> new VersionControlNotFoundException(id));
    }

    private BranchContent contentOf(VersionControl version) {
        if (version.getKind() == VersionKind.LEGACY) {
            throw new VersionNotRestorableException(version.getId().id());
        }
        try {
            return objectMapper.readValue(version.getContent(), BranchContent.class);
        } catch (JacksonException e) {
            throw new VersionNotRestorableException(version.getId().id());
        }
    }

    private static String cleanLabel(String label) {
        if (label == null || label.isBlank()) return null;
        String trimmed = label.trim();
        if (trimmed.length() > MAX_LABEL_LENGTH) {
            throw new IllegalArgumentException("A version's name can have at most " + MAX_LABEL_LENGTH + " characters");
        }
        return trimmed;
    }

    private static String sha256(String content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
