package com.skillpath.backend.service;

import com.skillpath.backend.dto.CourseRecommendationItem;
import com.skillpath.backend.dto.CourseRecommendationsResponse;
import com.skillpath.backend.dto.TrendWindowRange;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {

    private final JdbcTemplate jdbcTemplate;
    private final int maxItems;
    private final double minShareForAdd;
    private final double retireMinDecline;
    private final double retireMaxShare;
    private final int minPostings;
    private final int windowMonths;

    public RecommendationService(
        JdbcTemplate jdbcTemplate,
        @Value("${skillpath.recommendations.max-items:10}") int maxItems,
        @Value("${skillpath.recommendations.min-share-for-add:0.05}") double minShareForAdd,
        @Value("${skillpath.recommendations.retire-min-decline:0.10}") double retireMinDecline,
        @Value("${skillpath.recommendations.retire-max-share:0.40}") double retireMaxShare,
        @Value("${skillpath.trends.min-postings:20}") int minPostings,
        @Value("${skillpath.recommendations.window-months:3}") int windowMonths
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.maxItems = maxItems;
        this.minShareForAdd = minShareForAdd;
        this.retireMinDecline = retireMinDecline;
        this.retireMaxShare = retireMaxShare;
        this.minPostings = minPostings;
        this.windowMonths = windowMonths;
    }

    public CourseRecommendationsResponse getRecommendations(Long courseId, Long districtId) {
        return getRecommendations(courseId, districtId, null, null, null, null);
    }

    public CourseRecommendationsResponse getRecommendations(
        Long courseId,
        Long districtId,
        Integer overrideMaxItems,
        Double overrideMinShareForAdd,
        Double overrideRetireMinDecline,
        Double overrideRetireMaxShare
    ) {
        // 1. Validate course
        String courseName;
        try {
            courseName = jdbcTemplate.queryForObject(
                "SELECT name FROM course WHERE id = ?",
                String.class,
                courseId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException("Course not found: " + courseId);
        }

        // 2. Validate district (if provided)
        if (districtId != null) {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM district WHERE id = ?",
                Integer.class,
                districtId
            );
            if (count == null || count == 0) {
                throw new ResourceNotFoundException("District not found: " + districtId);
            }
        }

        int effectiveMaxItems = (overrideMaxItems != null && overrideMaxItems > 0) ? overrideMaxItems : this.maxItems;
        double effectiveMinShareForAdd = (overrideMinShareForAdd != null) ? overrideMinShareForAdd : this.minShareForAdd;
        double effectiveRetireMinDecline = (overrideRetireMinDecline != null) ? overrideRetireMinDecline : this.retireMinDecline;
        double effectiveRetireMaxShare = (overrideRetireMaxShare != null) ? overrideRetireMaxShare : this.retireMaxShare;

        // 3. Window calculation (reusing TrendService logic)
        List<String> distinctMonths = jdbcTemplate.queryForList(
            "SELECT DISTINCT \"month\" FROM demand_monthly ORDER BY \"month\" ASC",
            String.class
        );

        int requiredMonths = 2 * this.windowMonths;
        TrendWindowRange previousWindow = null;
        TrendWindowRange latestWindow = null;
        String prevFrom = null;
        String prevTo = null;
        String latestFrom = null;
        String latestTo = null;

        if (distinctMonths.size() >= requiredMonths) {
            int totalMonths = distinctMonths.size();
            prevFrom = distinctMonths.get(totalMonths - 2 * this.windowMonths);
            prevTo = distinctMonths.get(totalMonths - this.windowMonths - 1);
            latestFrom = distinctMonths.get(totalMonths - this.windowMonths);
            latestTo = distinctMonths.get(totalMonths - 1);
            previousWindow = new TrendWindowRange(prevFrom, prevTo);
            latestWindow = new TrendWindowRange(latestFrom, latestTo);
        }

        // 4. Linked roles check
        Integer linkedRoleCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM course_role WHERE course_id = ?",
            Integer.class,
            courseId
        );
        if (linkedRoleCount == null || linkedRoleCount == 0) {
            return new CourseRecommendationsResponse(
                courseId,
                courseName,
                districtId,
                latestWindow,
                previousWindow,
                effectiveMaxItems,
                effectiveMinShareForAdd,
                effectiveRetireMinDecline,
                effectiveRetireMaxShare,
                this.minPostings,
                this.windowMonths,
                List.of(),
                List.of()
            );
        }

        if (distinctMonths.size() < requiredMonths) {
            throw new BadRequestException("Not enough distinct months: required " + requiredMonths + ", available " + distinctMonths.size());
        }

        // 5. Skills taught by this course
        List<Long> taughtSkillIdsList = jdbcTemplate.queryForList(
            "SELECT skill_id FROM course_skill WHERE course_id = ?",
            Long.class,
            courseId
        );
        Set<Long> taughtSkillIds = new HashSet<>(taughtSkillIdsList);

        // 6. Denominators for previous and latest windows for the course's linked roles
        long denomPrevious = calculateDenominator(prevFrom, prevTo, courseId, districtId);
        long denomLatest = calculateDenominator(latestFrom, latestTo, courseId, districtId);

        // 7. Aggregate skill postings in scope
        List<Object> skillParams = new ArrayList<>();
        StringBuilder skillSql = new StringBuilder(
            "SELECT dm.skill_id, s.name, " +
            "SUM(CASE WHEN dm.\"month\" >= ? AND dm.\"month\" <= ? THEN dm.postings_with_skill ELSE 0 END) AS postings_prev, " +
            "SUM(CASE WHEN dm.\"month\" >= ? AND dm.\"month\" <= ? THEN dm.postings_with_skill ELSE 0 END) AS postings_latest " +
            "FROM demand_monthly dm " +
            "JOIN skill s ON dm.skill_id = s.id " +
            "JOIN course_role cr ON cr.role_id = dm.role_id " +
            "WHERE cr.course_id = ? " +
            "  AND dm.\"month\" >= ? AND dm.\"month\" <= ?"
        );

        skillParams.add(prevFrom);
        skillParams.add(prevTo);
        skillParams.add(latestFrom);
        skillParams.add(latestTo);
        skillParams.add(courseId);
        skillParams.add(prevFrom);
        skillParams.add(latestTo);

        if (districtId != null) {
            skillSql.append(" AND dm.district_id = ?");
            skillParams.add(districtId);
        }

        skillSql.append(" GROUP BY dm.skill_id, s.name");

        List<CourseRecommendationItem> addCandidates = new ArrayList<>();
        List<CourseRecommendationItem> retireCandidates = new ArrayList<>();

        jdbcTemplate.query(skillSql.toString(), rs -> {
            long skillId = rs.getLong("skill_id");
            String skillName = rs.getString("name");
            long postingsPrev = rs.getLong("postings_prev");
            long postingsLatest = rs.getLong("postings_latest");

            // Min-postings guard: skills below minPostings across both windows are excluded
            if (postingsLatest + postingsPrev < minPostings) {
                return;
            }

            double sharePrevious = (denomPrevious > 0) ? ((double) postingsPrev / denomPrevious) : 0.0;
            double latestShare = (denomLatest > 0) ? ((double) postingsLatest / denomLatest) : 0.0;
            double trend = latestShare - sharePrevious;
            double relativeGrowth = (sharePrevious > 0.0) ? (trend / sharePrevious) : 0.0;
            boolean taught = taughtSkillIds.contains(skillId);

            // ADD list: skills NOT taught, with latestShare >= minShareForAdd
            // Note: Score = latestShare * (1 + max(0, relativeGrowth)). We use (1 + max(0, relativeGrowth))
            // instead of pure "share times trend" because a pure product would give a flat high-demand skill
            // (trend = 0) a score of zero, causing critical high-demand stable skills to be overlooked.
            if (!taught && latestShare >= effectiveMinShareForAdd) {
                double score = latestShare * (1.0 + Math.max(0.0, relativeGrowth));
                addCandidates.add(new CourseRecommendationItem(
                    skillId,
                    skillName,
                    latestShare,
                    sharePrevious,
                    trend,
                    relativeGrowth,
                    score,
                    postingsLatest
                ));
            }

            // RETIRE list: taught skill where ALL of the following hold:
            // 1. trend < 0 (momentum is falling)
            // 2. relativeGrowth <= -effectiveRetireMinDecline (contraction is significant, e.g. at least 10% fall)
            // 3. latestShare <= effectiveRetireMaxShare (prevents retiring still-dominant core skills above e.g. 40%)
            if (taught
                    && trend < 0.0
                    && relativeGrowth <= -effectiveRetireMinDecline
                    && latestShare <= effectiveRetireMaxShare) {
                retireCandidates.add(new CourseRecommendationItem(
                    skillId,
                    skillName,
                    latestShare,
                    sharePrevious,
                    trend,
                    relativeGrowth,
                    null,
                    postingsLatest
                ));
            }
        }, skillParams.toArray());

        // Sort ADD: score descending, then skill id ascending
        addCandidates.sort((a, b) -> {
            int cmp = Double.compare(b.score(), a.score());
            if (cmp != 0) {
                return cmp;
            }
            return Long.compare(a.skillId(), b.skillId());
        });

        // Sort RETIRE: relativeGrowth ascending (steepest fall first), then latestShare ascending, then skill id ascending
        retireCandidates.sort((a, b) -> {
            int cmp = Double.compare(a.relativeGrowth(), b.relativeGrowth());
            if (cmp != 0) {
                return cmp;
            }
            cmp = Double.compare(a.latestShare(), b.latestShare());
            if (cmp != 0) {
                return cmp;
            }
            return Long.compare(a.skillId(), b.skillId());
        });

        List<CourseRecommendationItem> limitedAdd = addCandidates.stream()
            .limit(effectiveMaxItems)
            .toList();

        List<CourseRecommendationItem> limitedRetire = retireCandidates.stream()
            .limit(effectiveMaxItems)
            .toList();

        return new CourseRecommendationsResponse(
            courseId,
            courseName,
            districtId,
            latestWindow,
            previousWindow,
            effectiveMaxItems,
            effectiveMinShareForAdd,
            effectiveRetireMinDecline,
            effectiveRetireMaxShare,
            this.minPostings,
            this.windowMonths,
            limitedAdd,
            limitedRetire
        );
    }

    private long calculateDenominator(String from, String to, Long courseId, Long districtId) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
            "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
            "SELECT MAX(dm.postings_total) AS grp_total FROM demand_monthly dm " +
            "JOIN course_role cr ON cr.role_id = dm.role_id " +
            "WHERE cr.course_id = ? " +
            "  AND dm.\"month\" >= ? AND dm.\"month\" <= ?"
        );
        params.add(courseId);
        params.add(from);
        params.add(to);

        if (districtId != null) {
            sql.append(" AND dm.district_id = ?");
            params.add(districtId);
        }

        sql.append(" GROUP BY dm.district_id, dm.role_id, dm.\"month\") t");

        Long result = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return result != null ? result : 0L;
    }
}
