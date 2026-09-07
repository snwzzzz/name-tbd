package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.Email;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class EmailConverterTest {

    private EmailConverter converter;

    @BeforeEach
    void setup() {
        this.converter = new EmailConverter();
    }

    @Test
    public void can_map_to_db() {
        var email = new Email("john.doe@example.com");
        assertThat(converter.convertToDatabaseColumn(email)).isEqualTo(email.value());
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    public void can_map_from_db() {
        var email = new Email("john.doe@example.com");
        assertThat(converter.convertToEntityAttribute(email.value())).isEqualTo(email);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}