package com.skillpath.backend.service;

import com.skillpath.backend.dto.SkillGapResponse;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AlignmentService {

    private final JdbcTemplate jdbcTemplate;

    public AlignmentService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<SkillGapResponse> getTopSkillGaps(int limit) {
        List<String> distinctMonths = jdbcTemplate.queryForList(
            "SELECT DISTINCT \"month\" FROM demand_monthly ORDER BY \"month\" DESC",
            String.class
        );

        if (distinctMonths.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> latestMonths = distinctMonths.subList(0, Math.min(3, distinctMonths.size()));
        List<String> prevMonths = distinctMonths.size() > 3
            ? distinctMonths.subList(3, Math.min(6, distinctMonths.size()))
            : Collections.emptyList();

        String latestPlaceholders = String.join(",", Collections.nCopies(latestMonths.size(), "?"));
        String sqlTotalLatest = "SELECT COALESCE(SUM(postings_total), 0) FROM (" +
            "SELECT DISTINCT district_id, role_id, \"month\", postings_total FROM demand_monthly WHERE \"month\" IN (" + latestPlaceholders + ")" +
            ") t";
        Long totalPostingsLatest = jdbcTemplate.queryForObject(
            sqlTotalLatest,
            Long.class,
            latestMonths.toArray()
        );

        String sqlLatestDemand = "SELECT skill_id, SUM(postings_with_skill) AS demand FROM demand_monthly WHERE \"month\" IN (" + latestPlaceholders + ") GROUP BY skill_id";
        Map<Long, Long> latestDemandMap = new LinkedHashMap<>();
        jdbcTemplate.query(sqlLatestDemand, rs -> {
            latestDemandMap.put(rs.getLong("skill_id"), rs.getLong("demand"));
        }, latestMonths.toArray());

        Map<Long, Long> prevDemandMap = new LinkedHashMap<>();
        if (!prevMonths.isEmpty()) {
            String prevPlaceholders = String.join(",", Collections.nCopies(prevMonths.size(), "?"));
            String sqlPrevDemand = "SELECT skill_id, SUM(postings_with_skill) AS demand FROM demand_monthly WHERE \"month\" IN (" + prevPlaceholders + ") GROUP BY skill_id";
            jdbcTemplate.query(sqlPrevDemand, rs -> {
                prevDemandMap.put(rs.getLong("skill_id"), rs.getLong("demand"));
            }, prevMonths.toArray());
        }

        Long totalCourses = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM course", Long.class);

        Map<Long, Long> courseCountMap = new LinkedHashMap<>();
        jdbcTemplate.query(
            "SELECT skill_id, COUNT(DISTINCT course_id) AS cnt FROM course_skill GROUP BY skill_id",
            rs -> {
                courseCountMap.put(rs.getLong("skill_id"), rs.getLong("cnt"));
            }
        );

        Map<Long, String> skillNames = new LinkedHashMap<>();
        jdbcTemplate.query("SELECT id, name FROM skill ORDER BY id", rs -> {
            skillNames.put(rs.getLong("id"), rs.getString("name"));
        });

        // gap = demand_share_last_3_months * (1 - course_coverage) * growth_factor
        return skillNames.entrySet().stream()
            .map(entry -> {
                long skillId = entry.getKey();
                String name = entry.getValue();

                long latestDemand = latestDemandMap.getOrDefault(skillId, 0L);
                long prevDemand = prevDemandMap.getOrDefault(skillId, 0L);
                long coursesTeaching = courseCountMap.getOrDefault(skillId, 0L);

                double demandShare = (totalPostingsLatest != null && totalPostingsLatest > 0)
                    ? (double) latestDemand / totalPostingsLatest
                    : 0.0;
                double courseCoverage = (totalCourses != null && totalCourses > 0)
                    ? (double) coursesTeaching / totalCourses
                    : 0.0;
                double growthFactor = prevDemand > 0
                    ? (double) latestDemand / prevDemand
                    : (latestDemand > 0 ? (double) latestDemand : 1.0);

                // gap = demand_share_last_3_months * (1 - course_coverage) * growth_factor
                double gapScore = demandShare * (1.0 - courseCoverage) * growthFactor;

                return new SkillGapResponse(name, demandShare, courseCoverage, growthFactor, gapScore);
            })
            .sorted(Comparator.comparingDouble(SkillGapResponse::gapScore).reversed().thenComparing(SkillGapResponse::name))
            .limit(limit)
            .toList();
    }
}
