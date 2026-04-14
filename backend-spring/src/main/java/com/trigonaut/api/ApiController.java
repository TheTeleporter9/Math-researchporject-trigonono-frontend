package com.trigonaut.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.trigonaut.api.dto.ApiDtos;
import com.trigonaut.db.ExportRepository;
import com.trigonaut.db.ResearchRepository;
import com.trigonaut.db.SessionsRepository;
import com.trigonaut.db.StudentsRepository;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class ApiController {
  private static final String JOIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  private static final SecureRandom RNG = new SecureRandom();

  private final SessionsRepository sessions;
  private final StudentsRepository students;
  private final ResearchRepository research;
  private final ExportRepository exportRepo;
  private final ObjectMapper objectMapper;

  public ApiController(
      SessionsRepository sessions,
      StudentsRepository students,
      ResearchRepository research,
      ExportRepository exportRepo,
      ObjectMapper objectMapper
  ) {
    this.sessions = sessions;
    this.students = students;
    this.research = research;
    this.exportRepo = exportRepo;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of("ok", true);
  }

  // Teacher API
  @GetMapping("/api/teacher/sessions")
  public ResponseEntity<?> teacherSessions() {
    return ResponseEntity.ok(sessions.getTeacherSessions());
  }

  @PostMapping("/api/teacher/sessions")
  public ResponseEntity<?> createTeacherSession(@RequestBody ApiDtos.CreateSessionRequest req) {
    String joinCode = generateJoinCode();
    String gameType = (req == null || req.gameType() == null || req.gameType().isBlank()) ? "team_triangle" : req.gameType();

    JsonNode cfg = (req == null || req.config() == null || req.config().isNull()) ? objectMapper.createObjectNode() : req.config();
    ObjectNode obj;
    if (cfg.isObject()) obj = (ObjectNode) cfg;
    else obj = objectMapper.createObjectNode();

    if (!obj.has("seed_base") || obj.get("seed_base").isNull()) {
      int seed = 1 + RNG.nextInt(1_000_000_000);
      obj.put("seed_base", seed);
    }

    String configJson;
    try {
      configJson = objectMapper.writeValueAsString(obj);
    } catch (Exception e) {
      configJson = "{}";
    }

    return ResponseEntity.ok(sessions.createSession(joinCode, gameType, configJson));
  }

  @PostMapping("/api/teacher/sessions/{id}/start")
  public ResponseEntity<?> start(@PathVariable("id") UUID id) {
    int updated = sessions.startSession(id);
    return updated == 1 ? ResponseEntity.ok(Map.of("ok", true)) : ResponseEntity.status(404).build();
  }

  @PostMapping("/api/teacher/sessions/{id}/end")
  public ResponseEntity<?> end(@PathVariable("id") UUID id) {
    int updated = sessions.endSession(id);
    return updated == 1 ? ResponseEntity.ok(Map.of("ok", true)) : ResponseEntity.status(404).build();
  }

  @GetMapping("/api/teacher/sessions/{id}/export")
  public ResponseEntity<?> export(@PathVariable("id") UUID id) {
    var session = sessions.findById(id);
    if (session == null) return ResponseEntity.status(404).build();

    return ResponseEntity.ok(Map.of(
        "session_id", session.id(),
        "exported_at", OffsetDateTime.now(ZoneOffset.UTC).toString(),
        "session", session,
        "triangle_attempts", exportRepo.triangleAttempts(id),
        "level_completions", exportRepo.levelCompletions(id),
        "session_outcomes", exportRepo.sessionOutcomes(id)
    ));
  }

  // Public API
  @GetMapping("/api/sessions/by-code/{joinCode}")
  public ResponseEntity<?> byCode(@PathVariable("joinCode") String joinCode) {
    String codeUpper = (joinCode == null ? "" : joinCode).toUpperCase();
    var s = sessions.findByJoinCode(codeUpper);
    return s == null ? ResponseEntity.status(404).build() : ResponseEntity.ok(s);
  }

  @GetMapping("/api/sessions/{id}")
  public ResponseEntity<?> getSession(@PathVariable("id") UUID id) {
    var s = sessions.findById(id);
    return s == null ? ResponseEntity.status(404).build() : ResponseEntity.ok(s);
  }

  @PostMapping("/api/sessions/join")
  @Transactional
  public ResponseEntity<?> join(@RequestBody ApiDtos.JoinSessionRequest req) {
    String code = (req == null || req.joinCode() == null) ? "" : req.joinCode().trim().toUpperCase();
    if (code.length() != 6) return ResponseEntity.badRequest().body(Map.of("error", "Invalid join code"));

    String anon = (req == null ? null : req.anonymousId());
    if (anon == null || anon.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "anonymous_id required"));

    var session = sessions.findByJoinCode(code);
    if (session == null) return ResponseEntity.status(404).body(Map.of("error", "Session not found"));
    if (!"active".equals(session.status())) return ResponseEntity.status(409).body(Map.of("error", "Session is " + session.status()));

    UUID teamId = null;
    UUID studentId = null;
    if ("team_triangle".equals(session.gameType())) {
      String teamName = (req.teamName() == null || req.teamName().isBlank())
          ? "Team " + anon.substring(0, Math.min(6, anon.length()))
          : req.teamName();
      teamId = students.upsertTeam(session.id(), anon, teamName);
    } else {
      studentId = students.upsertStudent(session.id(), anon, req.displayName());
    }

    return ResponseEntity.ok(new ApiDtos.JoinSessionResponse(session, teamId, studentId));
  }

  @GetMapping("/api/sessions/{sessionId}/students/{anonymousId}/progress")
  public ResponseEntity<?> getProgress(@PathVariable("sessionId") UUID sessionId, @PathVariable("anonymousId") String anonymousId) {
    Integer lvl = students.getCurrentLevel(sessionId, anonymousId);
    int level = (lvl == null) ? 1 : lvl;
    return ResponseEntity.ok(new ApiDtos.StudentProgressDto(sessionId, anonymousId, level));
  }

  @PostMapping("/api/sessions/{sessionId}/students/{anonymousId}/progress")
  public ResponseEntity<?> setProgress(
      @PathVariable("sessionId") UUID sessionId,
      @PathVariable("anonymousId") String anonymousId,
      @RequestBody ApiDtos.SetStudentProgressRequest req
  ) {
    students.setCurrentLevel(sessionId, anonymousId, req.level());
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @PostMapping("/api/triangle/attempts")
  public ResponseEntity<?> triangleAttempts(@RequestBody ApiDtos.TriangleAttemptRequest req) throws Exception {
    String measurementsJson = (req.measurements() == null || req.measurements().isNull())
        ? "{}"
        : objectMapper.writeValueAsString(req.measurements());
    research.insertTriangleAttempt(
        req.sessionId(), req.teamId(), req.anonymousStudentId(), req.questionId(),
        req.selectedTriangleIndex(), req.isCorrect(), req.responseTimeMs(),
        measurementsJson
    );
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @PostMapping("/api/level-completions")
  public ResponseEntity<?> levelCompletions(@RequestBody ApiDtos.LevelCompletionRequest req) {
    research.upsertLevelCompletion(
        req.sessionId(), req.anonymousStudentId(), req.teamId(),
        req.gameType(), req.level(), req.mistakesCount(), req.resetCount()
    );
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @PostMapping("/api/outcomes")
  public ResponseEntity<?> outcomes(@RequestBody ApiDtos.SessionOutcomeRequest req) {
    research.upsertSessionOutcome(
        req.sessionId(), req.anonymousStudentId(), req.teamId(),
        req.gameType(), req.finalLevel(), req.totalMistakes(), req.totalResets()
    );
    return ResponseEntity.ok(Map.of("ok", true));
  }

  private static String generateJoinCode() {
    char[] buf = new char[6];
    for (int i = 0; i < buf.length; i++) {
      buf[i] = JOIN_CHARS.charAt(RNG.nextInt(JOIN_CHARS.length()));
    }
    return new String(buf);
  }
}

