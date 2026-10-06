package com.example.ntbd.livedata.appkey;

import com.example.ntbd.Exception.ApplicationNotFoundException;
import com.example.ntbd.Exception.AppKeyNotFoundException;
import com.example.ntbd.domain.AppKey;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.dto.AppKeyDto;
import com.example.ntbd.persistence.AppKeyRepository;
import com.example.ntbd.persistence.ApplicationRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Keys for exported apps (see {@link AppKey}). A key is {@value #PREFIX} plus 32 random bytes; only its
 * SHA-256 is stored, so the key itself exists only in the exports that carry it. Looked-up keys are
 * remembered for a few seconds; revoking one on this server forgets it at once.
 */
@Service
@RequiredArgsConstructor
public class AppKeyService {

    static final String PREFIX = "ntbd_ak_";

    /** Who an app key speaks for. */
    public record AppKeyPrincipal(Long keyId, Long applicationId, boolean allowWrites) {
    }

    /** A new key: the key itself (shown once, put into the export) and how it's listed. */
    public record NewKey(String key, AppKeyDto info) {
    }

    private final AppKeyRepository keys;
    private final ApplicationRepository applications;
    private final SecureRandom random = new SecureRandom();
    private final Cache<String, Optional<AppKeyPrincipal>> recent = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofSeconds(30))
            .maximumSize(10_000)
            .build();

    @Transactional
    public NewKey create(Long applicationId, String label, boolean allowWrites) {
        Application application = applications.findById(new Application.ApplicationId(applicationId))
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String key = PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        AppKey saved = keys.saveAndFlush(AppKey.builder()
                .application(application)
                .keyHash(hash(key))
                .hint(key.substring(0, PREFIX.length() + 4))
                .label(label == null || label.isBlank() ? "Export" : label.trim())
                .allowWrites(allowWrites)
                .createdAt(Timestamps.nowUtc())
                .build());
        return new NewKey(key, dto(saved));
    }

    /** Who the key speaks for; empty for unknown and revoked keys. */
    @Transactional(readOnly = true)
    public Optional<AppKeyPrincipal> authenticate(String key) {
        if (key == null || !key.startsWith(PREFIX)) return Optional.empty();
        String hash = hash(key);
        return recent.get(hash, h -> keys.findByKeyHash(h)
                .filter(k -> k.getRevokedAt() == null)
                .map(k -> new AppKeyPrincipal(k.getId(), k.getApplication().getId().id(), k.isAllowWrites())));
    }

    @Transactional(readOnly = true)
    public List<AppKeyDto> list(Long applicationId) {
        return keys.findByApplicationId(applicationId).stream().map(AppKeyService::dto).toList();
    }

    @Transactional
    public void revoke(Long keyId) {
        AppKey key = keys.findById(keyId).orElseThrow(() -> new AppKeyNotFoundException(keyId));
        if (key.getRevokedAt() == null) key.setRevokedAt(Timestamps.nowUtc());
        recent.invalidate(key.getKeyHash());
    }

    static String hash(String key) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private static AppKeyDto dto(AppKey key) {
        return new AppKeyDto(key.getId(), key.getApplication().getId().id(), key.getHint() + "…", key.getLabel(),
                key.isAllowWrites(), Timestamps.toInstant(key.getCreatedAt()), Timestamps.toInstant(key.getRevokedAt()));
    }
}
