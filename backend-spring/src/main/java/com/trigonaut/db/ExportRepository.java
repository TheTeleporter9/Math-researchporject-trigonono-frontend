package com.trigonaut.db;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExportRepository {
  private final NamedParameterJdbcTemplate jdbc;

  public ExportRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> triangleAttempts(UUID sessionId) {
    return jdbc.queryForList("""
        SELECT *
        FROM triangle_attempts
        WHERE session_id=:id
        ORDER BY created_at ASC
        """, new MapSqlParameterSource("id", sessionId));
  }

  public List<Map<String, Object>> levelCompletions(UUID sessionId) {
    return jdbc.queryForList("""
        SELECT *
        FROM level_completions
        WHERE session_id=:id
        ORDER BY completed_at ASC
        """, new MapSqlParameterSource("id", sessionId));
  }

  public List<Map<String, Object>> sessionOutcomes(UUID sessionId) {
    return jdbc.queryForList("""
        SELECT *
        FROM session_outcomes
        WHERE session_id=:id
        ORDER BY completed_at ASC
        """, new MapSqlParameterSource("id", sessionId));
  }
}

