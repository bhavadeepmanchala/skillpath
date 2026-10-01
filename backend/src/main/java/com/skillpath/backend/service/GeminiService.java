package com.skillpath.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${GEMINI_API_KEY:${gemini.api.key:}}")
    private String apiKey;


    private final RestClient restClient = RestClient.create();

    public String getAdvice(String fieldName, List<String> haveSkills, List<String> missingSkills) {
        String prompt = String.format(
                "A student wants to work in %s. They already know: %s. " +
                        "They are missing these skills: %s. " +
                        "In 3-4 short, encouraging sentences, tell them what to prioritize learning next and why, " +
                        "in a friendly, practical tone. Do not use markdown formatting.",
                fieldName, String.join(", ", haveSkills), String.join(", ", missingSkills)
        );

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    )
            );

            Map<String, Object> response = restClient.post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent")
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            e.printStackTrace();
            return "Focus on closing your top missing skills for " + fieldName + " — " +
                    String.join(", ", missingSkills) + " — to strengthen your match.";
        }
    }
}