package com.example.ntbd.livedata;

import com.example.ntbd.Exception.LiveDataUnavailableException;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class SecretBoxTest {

    private static final String KEY_1 = Base64.getEncoder().encodeToString("0123456789abcdef0123456789abcdef".getBytes());
    private static final String KEY_2 = Base64.getEncoder().encodeToString("fedcba9876543210fedcba9876543210".getBytes());

    private static SecretBox box(String key, String id, List<String> old) {
        return new SecretBox(new LiveDataProperties(key, id, old, 5000, false, 600, 3, null));
    }

    @Test
    void seals_and_opens_and_never_shows_the_plain_text() {
        SecretBox box = box(KEY_1, "k1", List.of());
        String sealed = box.seal("{\"password\":\"hunter2\"}");

        assertThat(sealed).startsWith("k1:").doesNotContain("hunter2");
        assertThat(box.open(sealed)).isEqualTo("{\"password\":\"hunter2\"}");
        // A new IV each time: the same secret never looks the same twice
        assertThat(box.seal("{\"password\":\"hunter2\"}")).isNotEqualTo(sealed);
    }

    @Test
    void after_a_rotation_old_values_are_still_read_and_should_be_sealed_anew() {
        String sealedWithOld = box(KEY_1, "k1", List.of()).seal("secret");
        SecretBox rotated = box(KEY_2, "k2", List.of("k1:" + KEY_1));

        assertThat(rotated.open(sealedWithOld)).isEqualTo("secret");
        assertThat(rotated.needsResealing(sealedWithOld)).isTrue();
        assertThat(rotated.needsResealing(rotated.seal("secret"))).isFalse();
    }

    @Test
    void a_tampered_value_or_a_missing_key_is_refused() {
        SecretBox box = box(KEY_1, "k1", List.of());
        String sealed = box.seal("secret");
        String tampered = sealed.substring(0, sealed.length() - 4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");

        assertThatThrownBy(() -> box.open(tampered)).isInstanceOf(LiveDataUnavailableException.class);
        assertThatThrownBy(() -> box(KEY_2, "k2", List.of()).open(sealed)).isInstanceOf(LiveDataUnavailableException.class);
    }

    @Test
    void without_a_key_nothing_can_be_sealed() {
        SecretBox box = box(null, "k1", List.of(""));
        assertThat(box.available()).isFalse();
        assertThatThrownBy(() -> box.seal("secret")).isInstanceOf(LiveDataUnavailableException.class)
                .hasMessageContaining("DATA_ENCRYPTION_KEY");
    }
}
