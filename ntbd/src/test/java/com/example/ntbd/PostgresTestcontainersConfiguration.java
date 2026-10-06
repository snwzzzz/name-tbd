package com.example.ntbd;

import com.github.dockerjava.api.model.ExposedPort;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.PortBinding;
import com.github.dockerjava.api.model.Ports;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        final Integer localPort = 15432;
        final Integer containerPort = 5432;

        PortBinding portBinding = new PortBinding (Ports.Binding.bindPort(localPort), new ExposedPort(containerPort));
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:17.6-alpine"))
                .withCreateContainerCmdModifier (cmd -> {
                    cmd.withName("ntbd");
                    cmd.withHostConfig(new HostConfig().withPortBindings(portBinding));
                })
                .withUsername("snwz")
                .withPassword("snwz")
                .withDatabaseName("ntbd")
                .withReuse (true);
    }

}
