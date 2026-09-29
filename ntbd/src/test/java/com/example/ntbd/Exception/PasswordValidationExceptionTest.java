package com.example.ntbd.Exception;

import lombok.Getter;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

public class PasswordValidationExceptionTest extends RuntimeException {

    @Test
    void constructor_setsErrorsList() {
        List<String> errors = List.of("Error one", "Error two");

        PasswordValidationException ex = new PasswordValidationException(errors);

        assertThat(ex.getErrors()).containsExactly("Error one", "Error two");
    }

    @Test
    void constructor_buildsJoinedMessageFromErrors() {
        List<String> errors = List.of("Error one", "Error two", "Error three");

        PasswordValidationException ex = new PasswordValidationException(errors);

        assertThat(ex.getMessage()).isEqualTo("Error one; Error two; Error three");
    }

    @Test
    void constructor_handlesSingleError() {
        List<String> errors = List.of("Only error");

        PasswordValidationException ex = new PasswordValidationException(errors);

        assertThat(ex.getMessage()).isEqualTo("Only error");
        assertThat(ex.getErrors()).containsExactly("Only error");
    }

    @Test
    void constructor_handlesEmptyList() {
        List<String> errors = List.of();

        PasswordValidationException ex = new PasswordValidationException(errors);

        assertThat(ex.getMessage()).isEqualTo("");
        assertThat(ex.getErrors()).isEmpty();
    }

    @Test
    void constructor_throwsOnNullList() {
        assertThatThrownBy(() -> new PasswordValidationException(null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void getErrors_returnsUnmodifiableList() {
        List<String> errors = new ArrayList<>(List.of("Error one"));
        PasswordValidationException ex = new PasswordValidationException(errors);

        List<String> returned = ex.getErrors();

        assertThatThrownBy(() -> returned.add("New error"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void getErrors_isDefensivelyDecoupledFromOriginalList() {
        List<String> originalList = new ArrayList<>(List.of("Error one"));
        PasswordValidationException ex = new PasswordValidationException(originalList);

        originalList.add("Error two"); // mutate the original after construction

        // Collections.unmodifiableList wraps rather than copies, so this currently
        // DOES reflect the mutation. This test documents that behavior as-is.
        assertThat(ex.getErrors()).containsExactly("Error one", "Error two");
    }

    @Test
    void isRuntimeException() {
        PasswordValidationException ex = new PasswordValidationException(List.of("Error"));

        assertThat(ex).isInstanceOf(RuntimeException.class);
    }

}
