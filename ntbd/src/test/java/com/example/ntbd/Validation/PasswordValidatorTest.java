package com.example.ntbd.Validation;

import com.example.ntbd.Exception.PasswordValidationException;
import com.example.ntbd.Exception.PasswordValidationExceptionTest;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.List;

import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForInterfaceTypes.assertThat;

public class PasswordValidatorTest {

    private static final String VALID_PASSWORD = "Str0ng!Pass1"; // 12 chars, all 4 classes

    @Test
    void validate_acceptsValidPassword() {
        assertThatCode(() -> PasswordValidator.validate(VALID_PASSWORD))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_rejectsNullPassword() {
        assertThatThrownBy(() -> PasswordValidator.validate(null))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .containsExactly("Password must not be empty"));
    }

    @Test
    void validate_rejectsBlankPassword() {
        assertThatThrownBy(() -> PasswordValidator.validate("   "))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .containsExactly("Password must not be empty"));
    }

    @Test
    void validate_rejectsEmptyString() {
        assertThatThrownBy(() -> PasswordValidator.validate(""))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .containsExactly("Password must not be empty"));
    }

    @Test
    void validate_rejectsTooShortPassword() {
        assertThatThrownBy(() -> PasswordValidator.validate("Sh0rt!Aa")) // 8 chars, under 12
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .contains("Password must be at least 12 characters long"));
    }

    @Test
    void validate_rejectsTooLongPassword() {
        String tooLong = "A1!" + "a".repeat(130); // 133 chars total
        assertThatThrownBy(() -> PasswordValidator.validate(tooLong))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .contains("Password must be no more than 128 characters long"));
    }

    @Test
    void validate_rejectsPasswordMissingLowercase() {
        assertThatThrownBy(() -> PasswordValidator.validate("STRONG!123AB"))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .contains("Password must contain at least one lowercase letter"));
    }

    @Test
    void validate_rejectsPasswordMissingUppercase() {
        assertThatThrownBy(() -> PasswordValidator.validate("strong!123ab"))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .contains("Password must contain at least one uppercase letter"));
    }

    @Test
    void validate_rejectsPasswordMissingDigit() {
        assertThatThrownBy(() -> PasswordValidator.validate("Strong!PassAB"))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .contains("Password must contain at least one number"));
    }

    @Test
    void validate_rejectsPasswordMissingSpecialCharacter() {
        assertThatThrownBy(() -> PasswordValidator.validate("Strong123PassAB"))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> assertThat(((PasswordValidationException) ex).getErrors())
                        .contains("Password must contain at least one special character"));
    }

    @Test
    void validate_collectsAllViolationsAtOnce() {
        // too short, all lowercase, no digit, no special char
        assertThatThrownBy(() -> PasswordValidator.validate("short"))
                .isInstanceOf(PasswordValidationException.class)
                .satisfies(ex -> {
                    List<String> errors = ((PasswordValidationException) ex).getErrors();
                    assertThat(errors).containsExactlyInAnyOrder(
                            "Password must be at least 12 characters long",
                            "Password must contain at least one uppercase letter",
                            "Password must contain at least one number",
                            "Password must contain at least one special character"
                    );
                });
    }

    @Test
    void validate_acceptsPasswordAtExactMinLength() {
        String exactly12 = "Aa1!bbbbbbbb"; // 12 chars, all 4 classes
        assertThat(exactly12).hasSize(12);
        assertThatCode(() -> PasswordValidator.validate(exactly12))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_acceptsPasswordAtExactMaxLength() {
        String exactly128 = "Aa1!" + "b".repeat(124); // 128 chars total
        assertThat(exactly128).hasSize(128);
        assertThatCode(() -> PasswordValidator.validate(exactly128))
                .doesNotThrowAnyException();
    }
    
}
