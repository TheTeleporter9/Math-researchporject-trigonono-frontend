package com.trigonaut.db;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StudentsRepository {
  private final NamedParameterJdbcTemplate jdbc;

  public StudentsRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public UUID upsertTeam(UUID sessionId, String anonymousId, String teamName) {
    return jdbc.queryForObject("""
        INSERT INTO teams (session_id, team_name, anonymous_id)
        VALUES (:session_id, :team_name, :anonymous_id)
        ON CONFLICT (session_id, anonymous_id)
        DO UPDATE SET team_name = EXCLUDED.team_name
        RETURNING id
        """,
        new MapSqlParameterSource()
            .addValue("session_id", sessionId)
            .addValue("team_name", teamName)
            .addValue("anonymous_id", anonymousId),
        (rs, rowNum) -> (UUID) rs.getObject("id")
    );
  }

  public UUID upsertStudent(UUID sessionId, String anonymousId, String displayName) {
    return jdbc.queryForObject("""
        INSERT INTO students (session_id, anonymous_id, display_name)
        VALUES (:session_id, :anonymous_id, :display_name)
        ON CONFLICT (session_id, anonymous_id)
        DO UPDATE SET display_name = EXCLUDED.display_name
        RETURNING id
        """,
        new MapSqlParameterSource()
            .addValue("session_id", sessionId)
            .addValue("anonymous_id", anonymousId)
            .addValue("display_name", displayName),
        (rs, rowNum) -> (UUID) rs.getObject("id")
    );
  }

  public Integer getCurrentLevel(UUID sessionId, String anonymousStudentId) {
    List<Integer> rows = jdbc.query("""
        SELECT current_level
        FROM student_progress
        WHERE session_id=:session_id AND anonymous_student_id=:anonymous_student_id
        """,
        Map.of("session_id", sessionId, "anonymous_student_id", anonymousStudentId),
        (rs, rowNum) -> rs.getInt("current_level")
    );
    return rows.isEmpty() ? null : rows.getFirst();
  }

  public void setCurrentLevel(UUID sessionId, String anonymousStudentId, int level) {
    jdbc.update("""
        INSERT INTO student_progress (session_id, anonymous_student_id, current_level)
        VALUES (:session_id, :anonymous_student_id, :level)
        ON CONFLICT (session_id, anonymous_student_id)
        DO UPDATE SET current_level = EXCLUDED.current_level
        """,
        new MapSqlParameterSource()
            .addValue("session_id", sessionId)
            .addValue("anonymous_student_id", anonymousStudentId)
            .addValue("level", level)
    );
  }
}

