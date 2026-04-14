package com.trigonaut.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  private final TrigonautProperties props;

  public CorsConfig(TrigonautProperties props) {
    this.props = props;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String raw = props.corsOrigins() == null ? "" : props.corsOrigins();
    List<String> origins = Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(s -> !s.isBlank())
        .toList();

    var reg = registry.addMapping("/**")
        .allowedMethods("*")
        .allowedHeaders("*")
        .allowCredentials(true);

    if (origins.isEmpty() || origins.contains("*")) {
      reg.allowedOriginPatterns("*");
    } else {
      reg.allowedOrigins(origins.toArray(String[]::new));
    }
  }
}

