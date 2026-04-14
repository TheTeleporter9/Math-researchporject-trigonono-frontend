package com.trigonaut.db;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ResearchRepository {
  private final NamedParameterJdbcTemplate jdbc;

  public ResearchRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void insertTriangleAttempt(
      UUID sessionId,
      UUID teamId,
      String anonymousStudentId,
      String questionId,
      int selectedTriangleIndex,
      boolean isCorrect,
      int responseTimeMs,
      String measurementsJson
  ) {
    jdbc.update("""
        INSERT INTO triangle_attempts (
          session_id, team_id, anonymous_student_id, question_id,
          selected_triangle_index, is_correct, response_time_ms, measurements
        )
        VALUES (
          :session_id, :team_id, :anonymous_student_id, :question_id,
          :selected_triangle_index, :is_correct, :response_time_ms, CAST(:measurements AS jsonb)
        )
        """,
        new MapSqlParameterSource()
            .addValue("session_id", sessionId)
            .addValue("team_id", teamId)
            .addValue("anonymous_student_id", anonymousStudentId)
            .addValue("question_id", questionId)
            .addValue("selected_triangle_index", selectedTriangleIndex)
            .addValue("is_correct", isCorrect)
            .addValue("response_time_ms", responseTimeMs)
            .addValue("measurements", measurementsJson == null || measurementsJson.isBlank() ? "{}" : measurementsJson)
    );
  }

  public void upsertLevelCompletion(
      UUID sessionId,
      String anonymousStudentId,
      UUID teamId,
      String gameType,
      int level,
      int mistakesCount,
      int resetCount
  ) {
    jdbc.update("""
        INSERT INTO level_completions (
          session_id, anonymous_student_id, team_id, game_type, level,
          mistakes_count, reset_count
        )
        VALUES (
          :session_id, :anonymous_student_id, :team_id, :game_type, :level,
          :mistakes_count, :reset_count
        )
        ON CONFLICT (session_id, anonymous_student_id, game_type, level)
        DO UPDATE SET
          mistakes_count = EXCLUDED.mistakes_count,
          reset_count = EXCLUDED.reset_count,
          completed_at = NOW()
        """,
        new MapSqlParameterSource()
            .addValue("session_id", sessionId)
            .addValue("anonymous_student_id", anonymousStudentId)
            .addValue("team_id", teamId)
            .addValue("game_type", gameType)
            .addValue("level", level)
            .addValue("mistakes_count", mistakesCount)
            .addValue("reset_count", resetCount)
    );
  }

  public void upsertSessionOutcome(
      UUID sessionId,
      String anonymousStudentId,
      UUID teamId,
      String gameType,
      Integer finalLevel,
      int totalMistakes,
      int totalResets
  ) {
    jdbc.update("""
        INSERT INTO session_outcomes (
          session_id, anonymous_student_id, team_id, game_type,
          final_level, total_mistakes, total_resets
        )
        VALUES (
          :session_id, :anonymous_student_id, :team_id, :game_type,
          :final_level, :total_mistakes, :total_resets
        )
        ON CONFLICT (session_id, anonymous_student_id, game_type)
        DO UPDATE SET
          final_level = EXCLUDED.final_level,
          total_mistakes = EXCLUDED.total_mistakes,
          total_resets = EXCLUDED.total_resets,
          completed_at = NOW()
        """,
        new MapSqlParameterSource()
            .addValue("session_id", sessionId)
            .addValue("anonymous_student_id", anonymousStudentId)
            .addValue("team_id", teamId)
            .addValue("game_type", gameType)
            .addValue("final_level", finalLevel)
            .addValue("total_mistakes", totalMistakes)
            .addValue("total_resets", totalResets)
    );
  }
}

