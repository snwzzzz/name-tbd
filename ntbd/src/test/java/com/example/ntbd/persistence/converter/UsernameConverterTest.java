package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.Username;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class UsernameConverterTest {

    private UsernameConverter converter;

    @BeforeEach
    void setup() {
        this.converter = new UsernameConverter();
    }

    @Test
    public void can_map_to_db() {
        var username = new Username("johndoe");
        assertThat(converter.convertToDatabaseColumn(username)).isEqualTo(username.value());
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    public void can_map_from_db() {
        var username = new Username("johndoe");
        assertThat(converter.convertToEntityAttribute(username.value())).isEqualTo(username);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

}
