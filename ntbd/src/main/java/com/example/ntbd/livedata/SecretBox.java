package com.example.ntbd.livedata;

import com.example.ntbd.Exception.LiveDataUnavailableException;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Encrypts connections' credentials at rest: AES-256-GCM with the server's key ({@code app.data.encryption-key}).
 * A sealed value is {@code <key id>:<base64 of 12-byte IV + ciphertext>}, so after a key rotation older values
 * are still read with the old key ({@code app.data.old-encryption-keys}) and written anew with the current one.
 */
@Component
public class SecretBox {

    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom random = new SecureRandom();
    private final String currentId;
    private final Map<String, SecretKeySpec> keys = new HashMap<>();

    public SecretBox(LiveDataProperties properties) {
        this.currentId = properties.encryptionKeyId();
        if (properties.encryptionKey() != null && !properties.encryptionKey().isBlank()) {
            keys.put(currentId, key(properties.encryptionKey()));
        }
        for (String old : properties.oldEncryptionKeys()) {
            if (old == null || old.isBlank()) continue;
            int colon = old.indexOf(':');
            if (colon <= 0) throw new IllegalStateException("app.data.old-encryption-keys entries are id:base64");
            keys.putIfAbsent(old.substring(0, colon), key(old.substring(colon + 1)));
        }
    }

    /** Whether credentials can be stored (the server has a key). */
    public boolean available() {
        return keys.containsKey(currentId);
    }

    public String seal(String plain) {
        SecretKeySpec key = keys.get(currentId);
        if (key == null) {
            throw new LiveDataUnavailableException("This server has no key to encrypt credentials with; set DATA_ENCRYPTION_KEY");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return currentId + ":" + Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + sealed.length).put(iv).put(sealed).array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt", e);
        }
    }

    public String open(String sealed) {
        int colon = sealed.indexOf(':');
        SecretKeySpec key = colon > 0 ? keys.get(sealed.substring(0, colon)) : null;
        if (key == null) {
            throw new LiveDataUnavailableException("The key these credentials were encrypted with isn't configured on this server");
        }
        try {
            byte[] all = Base64.getDecoder().decode(sealed.substring(colon + 1));
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, all, 0, IV_BYTES));
            return new String(cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new LiveDataUnavailableException("Stored credentials could not be decrypted (wrong key?)");
        }
    }

    /** Whether a sealed value was sealed with an older key (so it should be sealed anew). */
    public boolean needsResealing(String sealed) {
        return !sealed.startsWith(currentId + ":");
    }

    private static SecretKeySpec key(String base64) {
        byte[] bytes = Base64.getDecoder().decode(base64.trim());
        if (bytes.length != 32) {
            throw new IllegalStateException("An encryption key must be 32 bytes (base64), e.g. `openssl rand -base64 32`");
        }
        return new SecretKeySpec(bytes, "AES");
    }
}
