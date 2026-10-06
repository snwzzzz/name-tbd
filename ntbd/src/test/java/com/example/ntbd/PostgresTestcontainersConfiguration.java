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

import java.io.IOException;
import java.net.ServerSocket;

@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestcontainersConfiguration {

    private static final int PREFERRED_PORT = 15432;

    private static boolean canBind(int port) {
        try (ServerSocket socket = new ServerSocket(port)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        final Integer containerPort = 5432;

        // 15432 for DB clients; when it can't be bound (Windows reserves port ranges that change on reboot), any free port
        Ports.Binding hostBinding = canBind(PREFERRED_PORT) ? Ports.Binding.bindPort(PREFERRED_PORT) : Ports.Binding.empty();
        PortBinding portBinding = new PortBinding (hostBinding, new ExposedPort(containerPort));
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
