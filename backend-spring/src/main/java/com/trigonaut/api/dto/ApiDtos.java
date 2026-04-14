package com.trigonaut.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class ApiDtos {
  private ApiDtos() {}

  public record SessionDto(
      @JsonProperty("id") UUID id,
      @JsonProperty("joinCode") String joinCode,
      @JsonProperty("gameType") String gameType,
      @JsonProperty("status") String status,
      @JsonProperty("config") JsonNode config,
      @JsonProperty("createdAt") OffsetDateTime createdAt,
      @JsonProperty("startedAt") OffsetDateTime startedAt,
      @JsonProperty("endedAt") OffsetDateTime endedAt
  ) {}

  public record CreateSessionRequest(
      @JsonProperty("gameType") String gameType,
      @JsonProperty("config") JsonNode config
  ) {}

  public record JoinSessionRequest(
      @JsonProperty("joinCode") String joinCode,
      @JsonProperty("anonymousId") String anonymousId,
      @JsonProperty("teamName") String teamName,
      @JsonProperty("displayName") String displayName
  ) {}

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record JoinSessionResponse(
      @JsonProperty("session") SessionDto session,
      @JsonProperty("teamId") UUID teamId,
      @JsonProperty("studentId") UUID studentId
  ) {}

  public record TriangleAttemptRequest(
      @JsonProperty("sessionId") UUID sessionId,
      @JsonProperty("teamId") UUID teamId,
      @JsonProperty("anonymousStudentId") String anonymousStudentId,
      @JsonProperty("questionId") String questionId,
      @JsonProperty("selectedTriangleIndex") int selectedTriangleIndex,
      @JsonProperty("isCorrect") boolean isCorrect,
      @JsonProperty("responseTimeMs") int responseTimeMs,
      @JsonProperty("measurements") JsonNode measurements
  ) {}

  public record LevelCompletionRequest(
      @JsonProperty("sessionId") UUID sessionId,
      @JsonProperty("anonymousStudentId") String anonymousStudentId,
      @JsonProperty("teamId") UUID teamId,
      @JsonProperty("gameType") String gameType,
      @JsonProperty("level") int level,
      @JsonProperty("mistakesCount") int mistakesCount,
      @JsonProperty("resetCount") int resetCount
  ) {}

  public record SessionOutcomeRequest(
      @JsonProperty("sessionId") UUID sessionId,
      @JsonProperty("anonymousStudentId") String anonymousStudentId,
      @JsonProperty("teamId") UUID teamId,
      @JsonProperty("gameType") String gameType,
      @JsonProperty("finalLevel") Integer finalLevel,
      @JsonProperty("totalMistakes") int totalMistakes,
      @JsonProperty("totalResets") int totalResets
  ) {}

  public record StudentProgressDto(
      @JsonProperty("sessionId") UUID sessionId,
      @JsonProperty("anonymousStudentId") String anonymousStudentId,
      @JsonProperty("currentLevel") int currentLevel
  ) {}

  public record SetStudentProgressRequest(
      @JsonProperty("level") int level
  ) {}
}

