package com.trigonaut.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardingController {
  // Serve the React SPA from the Spring Boot app.
  // - Do not interfere with /api/* routes or static assets (files containing a dot).
  @RequestMapping(value = {
      "/",
      "/teacher/**",
      "/student/**"
  })
  public String forwardSpa() {
    return "forward:/index.html";
  }
}

