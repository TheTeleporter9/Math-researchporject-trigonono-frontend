package com.trigonaut.db;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trigonaut.api.dto.ApiDtos;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SessionsRepository {
  private final NamedParameterJdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public SessionsRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  private final RowMapper<ApiDtos.SessionDto> sessionMapper = new RowMapper<>() {
    @Override
    public ApiDtos.SessionDto mapRow(ResultSet rs, int rowNum) throws SQLException {
      String configJson = rs.getString("config_json");
      JsonNode config;
      try {
        config = (configJson == null || configJson.isBlank())
            ? objectMapper.readTree("{}")
            : objectMapper.readTree(configJson);
      } catch (Exception e) {
        throw new SQLException("Invalid config json", e);
      }
      return new ApiDtos.SessionDto(
          (UUID) rs.getObject("id"),
          rs.getString("join_code"),
          rs.getString("game_type"),
          rs.getString("status"),
          config,
          rs.getObject("created_at", OffsetDateTime.class),
          rs.getObject("started_at", OffsetDateTime.class),
          rs.getObject("ended_at", OffsetDateTime.class)
      );
    }
  };

  public List<ApiDtos.SessionDto> getTeacherSessions() {
    return jdbc.query("""
        SELECT
          id,
          join_code,
          game_type,
          status,
          config::text as config_json,
          created_at,
          started_at,
          ended_at
        FROM sessions
        ORDER BY created_at DESC
        """, Map.of(), sessionMapper);
  }

  public ApiDtos.SessionDto createSession(String joinCode, String gameType, String configJson) {
    return jdbc.queryForObject("""
        INSERT INTO sessions (join_code, game_type, status, config)
        VALUES (:join_code, :game_type, 'waiting', CAST(:config AS jsonb))
        RETURNING
          id,
          join_code,
          game_type,
          status,
          config::text as config_json,
          created_at,
          started_at,
          ended_at
        """,
        new MapSqlParameterSource()
            .addValue("join_code", joinCode)
            .addValue("game_type", gameType)
            .addValue("config", configJson),
        sessionMapper
    );
  }

  public ApiDtos.SessionDto findByJoinCode(String joinCodeUpper) {
    List<ApiDtos.SessionDto> rows = jdbc.query("""
        SELECT
          id,
          join_code,
          game_type,
          status,
          config::text as config_json,
          created_at,
          started_at,
          ended_at
        FROM sessions
        WHERE join_code=:join_code
        """,
        new MapSqlParameterSource("join_code", joinCodeUpper),
        sessionMapper
    );
    return rows.isEmpty() ? null : rows.getFirst();
  }

  public ApiDtos.SessionDto findById(UUID id) {
    List<ApiDtos.SessionDto> rows = jdbc.query("""
        SELECT
          id,
          join_code,
          game_type,
          status,
          config::text as config_json,
          created_at,
          started_at,
          ended_at
        FROM sessions
        WHERE id=:id
        """,
        new MapSqlParameterSource("id", id),
        sessionMapper
    );
    return rows.isEmpty() ? null : rows.getFirst();
  }

  public int startSession(UUID id) {
    return jdbc.update("""
        UPDATE sessions
        SET status='active', started_at=NOW()
        WHERE id=:id
        """, new MapSqlParameterSource("id", id));
  }

  public int endSession(UUID id) {
    return jdbc.update("""
        UPDATE sessions
        SET status='ended', ended_at=NOW()
        WHERE id=:id
        """, new MapSqlParameterSource("id", id));
  }
}

