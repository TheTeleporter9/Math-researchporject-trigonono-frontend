package com.trigonaut.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "trigonaut")
public record TrigonautProperties(
    String teacherToken,
    String corsOrigins
) {}

