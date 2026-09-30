package com.skillpath.backend.service;

import java.util.Map;
import com.skillpath.backend.dto.PolicymakerResponse;
import tools.jackson.databind.ObjectMapper;
import com.skillpath.backend.model.Field;
import com.skillpath.backend.model.FieldData;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;

@Service
public class SkillMatchService {

    private List<Field> fields;

    // Loads data.json once when the app starts
    public SkillMatchService() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream is = new ClassPathResource("data.json").getInputStream();
            FieldData data = mapper.readValue(is, FieldData.class);
            this.fields = data.getFields();
        } catch (Exception e) {
            throw new RuntimeException("Failed to load data.json", e);
        }
    }

    public List<Field> getAllFields() {
        return fields;
    }
    public PolicymakerResponse getPolicymakerSummary() {
        List<PolicymakerResponse.FieldSummary> fieldSummaries = fields.stream()
                .map(f -> new PolicymakerResponse.FieldSummary(
                        f.getName(), f.getDemandLevel(), f.getTrend(), f.getAvgOpenings()
                ))
                .toList();

        Map<String, Integer> distribution = new java.util.HashMap<>();
        distribution.put("High", 0);
        distribution.put("Medium", 0);
        distribution.put("Low", 0);
        for (Field f : fields) {
            distribution.merge(f.getDemandLevel(), 1, Integer::sum);
        }

        // Pick core skills from the top 4 highest-demand, rising fields as "biggest gaps"
        List<String> biggestGaps = fields.stream()
                .filter(f -> "High".equalsIgnoreCase(f.getDemandLevel()) && "Rising".equalsIgnoreCase(f.getTrend()))
                .flatMap(f -> f.getCoreSkills().stream())
                .distinct()
                .limit(4)
                .toList();

        return new PolicymakerResponse(fieldSummaries, distribution, biggestGaps);
    }

    // Finds the field with the highest skill overlap for the given user skills
    public Field findBestMatch(List<String> userSkills) {
        List<String> normalizedUserSkills = userSkills.stream()
                .map(s -> s.trim().toLowerCase())
                .toList();

        Field best = null;
        int bestMatchCount = -1;

        for (Field field : fields) {
            int matchCount = 0;
            for (String coreSkill : field.getCoreSkills()) {
                if (normalizedUserSkills.contains(coreSkill.toLowerCase())) {
                    matchCount++;
                }
            }
            if (matchCount > bestMatchCount) {
                bestMatchCount = matchCount;
                best = field;
            }
        }
        return best;
    }

    // Returns the core skills of a field that the user does NOT have
    public List<String> findMissingSkills(Field field, List<String> userSkills) {
        List<String> normalizedUserSkills = userSkills.stream()
                .map(s -> s.trim().toLowerCase())
                .toList();

        return field.getCoreSkills().stream()
                .filter(skill -> !normalizedUserSkills.contains(skill.toLowerCase()))
                .toList();
    }

    // Returns the core skills of a field that the user DOES have
    public List<String> findMatchingSkills(Field field, List<String> userSkills) {
        List<String> normalizedUserSkills = userSkills.stream()
                .map(s -> s.trim().toLowerCase())
                .toList();

        return field.getCoreSkills().stream()
                .filter(skill -> normalizedUserSkills.contains(skill.toLowerCase()))
                .toList();
    }

    public int calculateMatchPercent(Field field, List<String> userSkills) {
        int total = field.getCoreSkills().size();
        int have = findMatchingSkills(field, userSkills).size();
        if (total == 0) return 0;
        return (have * 100) / total;
    }
}