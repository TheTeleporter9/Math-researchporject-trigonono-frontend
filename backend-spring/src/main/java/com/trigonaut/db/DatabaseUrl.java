package com.trigonaut.db;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public final class DatabaseUrl {
  private DatabaseUrl() {}

  public record Parsed(String jdbcUrl, String username, String password) {}

  public static Parsed parse(String databaseUrl) {
    // Supports: postgres://user:pass@host:5432/dbname?sslmode=require
    URI uri = URI.create(databaseUrl);
    String userInfo = uri.getUserInfo() == null ? "" : uri.getUserInfo();
    String[] parts = userInfo.split(":", 2);
    String username = urlDecode(parts.length > 0 ? parts[0] : "");
    String password = urlDecode(parts.length > 1 ? parts[1] : "");

    String host = uri.getHost();
    int port = uri.getPort() > 0 ? uri.getPort() : 5432;
    String db = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");

    Map<String, String> q = parseQuery(uri.getRawQuery());
    StringBuilder jdbc = new StringBuilder();
    jdbc.append("jdbc:postgresql://").append(host).append(":").append(port).append("/").append(db);

    if (!q.isEmpty()) {
      jdbc.append("?");
      boolean first = true;
      for (var e : q.entrySet()) {
        if (!first) jdbc.append("&");
        first = false;
        jdbc.append(e.getKey()).append("=").append(urlDecode(e.getValue()));
      }
    }

    return new Parsed(jdbc.toString(), username, password);
  }

  private static Map<String, String> parseQuery(String rawQuery) {
    Map<String, String> out = new HashMap<>();
    if (rawQuery == null || rawQuery.isBlank()) return out;
    for (String part : rawQuery.split("&")) {
      if (part.isBlank()) continue;
      String[] kv = part.split("=", 2);
      if (kv.length == 2) out.put(kv[0], kv[1]);
    }
    return out;
  }

  private static String urlDecode(String s) {
    return URLDecoder.decode(s == null ? "" : s, StandardCharsets.UTF_8);
  }
}

