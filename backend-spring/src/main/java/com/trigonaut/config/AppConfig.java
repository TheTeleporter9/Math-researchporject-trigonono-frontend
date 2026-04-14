package com.trigonaut.config;

import com.trigonaut.db.DatabaseUrl;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(TrigonautProperties.class)
public class AppConfig {

  @Bean
  public DataSource dataSource() {
    var jdbcUrl = System.getenv("SPRING_DATASOURCE_URL");
    var username = System.getenv("SPRING_DATASOURCE_USERNAME");
    var password = System.getenv("SPRING_DATASOURCE_PASSWORD");

    if (jdbcUrl == null || jdbcUrl.isBlank()) {
      var databaseUrl = System.getenv("DATABASE_URL");
      if (databaseUrl != null && !databaseUrl.isBlank()) {
        var parsed = DatabaseUrl.parse(databaseUrl);
        jdbcUrl = parsed.jdbcUrl();
        username = parsed.username();
        password = parsed.password();
      } else {
        var connStrCompat = System.getenv("ConnectionStrings__Default");
        if (connStrCompat != null && !connStrCompat.isBlank()) {
          // The existing .NET connection string format isn't directly usable as JDBC.
          // For now, require either SPRING_DATASOURCE_* or DATABASE_URL in Spring mode.
          throw new IllegalStateException(
              "ConnectionStrings__Default is set but not supported in Spring mode. Use DATABASE_URL or SPRING_DATASOURCE_URL.");
        }
        jdbcUrl = "jdbc:postgresql://localhost:5432/trigonaut";
        username = "trigonaut";
        password = "trigonaut";
      }
    }

    var cfg = new HikariConfig();
    cfg.setJdbcUrl(jdbcUrl);
    if (username != null) cfg.setUsername(username);
    if (password != null) cfg.setPassword(password);
    return new HikariDataSource(cfg);
  }
}

