package com.trigonaut.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trigonaut.config.TrigonautProperties;
import com.trigonaut.db.TeacherRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TeacherTokenAuthFilter extends OncePerRequestFilter {
  private final TrigonautProperties props;
  private final TeacherRepository teacherRepo;
  private final ObjectMapper objectMapper;

  public TeacherTokenAuthFilter(TrigonautProperties props, TeacherRepository teacherRepo, ObjectMapper objectMapper) {
    this.props = props;
    this.teacherRepo = teacherRepo;
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path == null || !path.startsWith("/api/teacher");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String provided = request.getHeader("X-Teacher-Token");

    if (!StringUtils.hasText(provided)) {
      writeError(response, 401, "Missing teacher token");
      return;
    }

    String master = props.teacherToken();
    if (StringUtils.hasText(master) && provided.equals(master)) {
      setAuth("master");
      filterChain.doFilter(request, response);
      return;
    }

    boolean active = teacherRepo.isActiveTeacherCode(provided);
    if (!active) {
      writeError(response, 401, "Unknown or inactive teacher code");
      return;
    }

    setAuth("teacher");
    filterChain.doFilter(request, response);
  }

  private void setAuth(String principal) {
    Authentication auth = new AbstractAuthenticationToken(AuthorityUtils.NO_AUTHORITIES) {
      @Override public Object getCredentials() { return ""; }
      @Override public Object getPrincipal() { return principal; }
    };
    ((AbstractAuthenticationToken) auth).setAuthenticated(true);
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  private void writeError(HttpServletResponse response, int status, String message) throws IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), Map.of("error", message));
  }
}

