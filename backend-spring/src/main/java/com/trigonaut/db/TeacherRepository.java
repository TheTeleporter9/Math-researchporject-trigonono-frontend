package com.trigonaut.db;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TeacherRepository {
  private final NamedParameterJdbcTemplate jdbc;

  public TeacherRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public boolean isActiveTeacherCode(String code) {
    Integer one = jdbc.query("""
            SELECT 1
            FROM teachers
            WHERE code = :code AND is_active = TRUE
            """,
        new MapSqlParameterSource("code", code),
        rs -> rs.next() ? 1 : null
    );
    return one != null;
  }
}

