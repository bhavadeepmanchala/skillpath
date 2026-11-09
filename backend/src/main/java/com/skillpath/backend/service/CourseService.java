package com.skillpath.backend.service;

import com.skillpath.backend.dto.CourseAlignmentResponse;
import com.skillpath.backend.dto.CourseItem;
import com.skillpath.backend.dto.SkillShareItem;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CourseService {

    private final JdbcTemplate jdbcTemplate;
    private final int defaultWindowMonths;
    private final int defaultTopNSkills;

    public CourseService(
        JdbcTemplate jdbcTemplate,
        @Value("${skillpath.alignment.window-months:3}") int defaultWindowMonths,
        @Value("${skillpath.alignment.top-n-skills:15}") int defaultTopNSkills
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.defaultWindowMonths = defaultWindowMonths;
        this.defaultTopNSkills = defaultTopNSkills;
    }

    public List<CourseItem> getCourses() {
        String sql = "SELECT c.id, c.name, c.sector, c.duration_weeks, " +
            "COUNT(DISTINCT cs.skill_id) AS skill_count, " +
            "COUNT(DISTINCT cr.role_id) AS linked_role_count " +
            "FROM course c " +
            "LEFT JOIN course_skill cs ON c.id = cs.course_id " +
            "LEFT JOIN course_role cr ON c.id = cr.course_id " +
            "GROUP BY c.id, c.name, c.sector, c.duration_weeks " +
            "ORDER BY c.name ASC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> new CourseItem(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("sector"),
            rs.getInt("duration_weeks"),
            rs.getLong("skill_count"),
            rs.getLong("linked_role_count")
        ));
    }

    /**
     * Computes course alignment against a target role in a given district scope (or national if null).
     *
     * Known limitation: taught_level is ignored for now per design; any skill taught by the course
     * is counted as covered.
     * Edge case: If postingsInScope is 0, returns coverageScore 0.0 and empty covered/missing skill lists.
     */
    public CourseAlignmentResponse getCourseAlignment(
        Long courseId,
        Long roleId,
        Long districtId,
        Integer overrideTopN,
        Integer overrideWindowMonths
    ) {
        if (roleId == null) {
            throw new BadRequestException("role parameter is required");
        }

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

        // 2. Validate role
        String roleName;
        try {
            roleName = jdbcTemplate.queryForObject(
                "SELECT name FROM role WHERE id = ?",
                String.class,
                roleId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new ResourceNotFoundException("Role not found: " + roleId);
        }

        // 3. Validate district (optional)
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

        int effectiveWindow = (overrideWindowMonths != null) ? overrideWindowMonths : defaultWindowMonths;
        if (effectiveWindow < 1) {
            throw new BadRequestException("windowMonths must be at least 1");
        }

        int effectiveTopN = (overrideTopN != null) ? overrideTopN : defaultTopNSkills;
        if (effectiveTopN < 1) {
            throw new BadRequestException("topN must be at least 1");
        }

        // 4. Role linked to course
        Integer roleLinkCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM course_role WHERE course_id = ? AND role_id = ?",
            Integer.class,
            courseId,
            roleId
        );
        boolean roleLinkedToCourse = (roleLinkCount != null && roleLinkCount > 0);

        // 5. Skills taught by course (taught_level ignored for now per known limitation)
        List<Long> taughtSkillIdsList = jdbcTemplate.queryForList(
            "SELECT skill_id FROM course_skill WHERE course_id = ?",
            Long.class,
            courseId
        );
        Set<Long> courseSkillIds = new HashSet<>(taughtSkillIdsList);

        // 6. Find window bounds ending at latest month present in demand_monthly
        String latestMonth = jdbcTemplate.queryForObject(
            "SELECT MAX(\"month\") FROM demand_monthly",
            String.class
        );

        if (latestMonth == null) {
            return new CourseAlignmentResponse(
                courseId, courseName, roleId, roleName, districtId,
                effectiveWindow, effectiveTopN, 0L, roleLinkedToCourse,
                0.0, List.of(), List.of()
            );
        }

        YearMonth latest = YearMonth.parse(latestMonth);
        YearMonth start = latest.minusMonths(effectiveWindow - 1);
        String fromMonth = start.toString();
        String toMonth = latest.toString();

        // 7. Calculate total postings of role in scope (Rule 5: MAX(postings_total) grouped by cell, then sum)
        String totalPostingsSql;
        List<Object> totalParams = new ArrayList<>();
        if (districtId != null) {
            totalPostingsSql = "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
                "SELECT MAX(postings_total) AS grp_total FROM demand_monthly " +
                "WHERE role_id = ? AND district_id = ? AND \"month\" >= ? AND \"month\" <= ? " +
                "GROUP BY district_id, role_id, \"month\") t";
            totalParams.add(roleId);
            totalParams.add(districtId);
            totalParams.add(fromMonth);
            totalParams.add(toMonth);
        } else {
            totalPostingsSql = "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
                "SELECT MAX(postings_total) AS grp_total FROM demand_monthly " +
                "WHERE role_id = ? AND \"month\" >= ? AND \"month\" <= ? " +
                "GROUP BY district_id, role_id, \"month\") t";
            totalParams.add(roleId);
            totalParams.add(fromMonth);
            totalParams.add(toMonth);
        }

        Long postingsInScopeObj = jdbcTemplate.queryForObject(
            totalPostingsSql,
            Long.class,
            totalParams.toArray()
        );
        long postingsInScope = (postingsInScopeObj != null) ? postingsInScopeObj : 0L;

        if (postingsInScope <= 0L) {
            // Documented edge case: If postingsInScope is 0: coverageScore 0.0 and empty lists
            return new CourseAlignmentResponse(
                courseId, courseName, roleId, roleName, districtId,
                effectiveWindow, effectiveTopN, 0L, roleLinkedToCourse,
                0.0, List.of(), List.of()
            );
        }

        // 8. Skill postings in scope
        String skillSql;
        List<Object> skillParams = new ArrayList<>();
        if (districtId != null) {
            skillSql = "SELECT dm.skill_id, s.name, SUM(dm.postings_with_skill) AS postings_with_skill " +
                "FROM demand_monthly dm " +
                "JOIN skill s ON s.id = dm.skill_id " +
                "WHERE dm.role_id = ? AND dm.district_id = ? AND dm.\"month\" >= ? AND dm.\"month\" <= ? " +
                "GROUP BY dm.skill_id, s.name";
            skillParams.add(roleId);
            skillParams.add(districtId);
            skillParams.add(fromMonth);
            skillParams.add(toMonth);
        } else {
            skillSql = "SELECT dm.skill_id, s.name, SUM(dm.postings_with_skill) AS postings_with_skill " +
                "FROM demand_monthly dm " +
                "JOIN skill s ON s.id = dm.skill_id " +
                "WHERE dm.role_id = ? AND dm.\"month\" >= ? AND dm.\"month\" <= ? " +
                "GROUP BY dm.skill_id, s.name";
            skillParams.add(roleId);
            skillParams.add(fromMonth);
            skillParams.add(toMonth);
        }

        List<SkillShareItem> roleSkills = jdbcTemplate.query(
            skillSql,
            (rs, rowNum) -> {
                long skillId = rs.getLong("skill_id");
                String skillName = rs.getString("name");
                long withSkill = rs.getLong("postings_with_skill");
                double demandShare = (double) withSkill / postingsInScope;
                return new SkillShareItem(skillId, skillName, demandShare);
            },
            skillParams.toArray()
        );

        // Sort all role skills by demandShare desc, tie break by name asc
        Comparator<SkillShareItem> shareComparator = Comparator
            .comparingDouble(SkillShareItem::demandShare)
            .reversed()
            .thenComparing(SkillShareItem::name);

        List<SkillShareItem> sortedRoleSkills = new ArrayList<>(roleSkills);
        sortedRoleSkills.sort(shareComparator);

        // Top-N skills of the role
        List<SkillShareItem> topSkills = sortedRoleSkills.stream()
            .limit(effectiveTopN)
            .toList();

        List<SkillShareItem> coveredSkills = new ArrayList<>();
        List<SkillShareItem> missingSkills = new ArrayList<>();

        for (SkillShareItem item : topSkills) {
            if (courseSkillIds.contains(item.skillId())) {
                coveredSkills.add(item);
            } else {
                missingSkills.add(item);
            }
        }

        coveredSkills.sort(shareComparator);
        missingSkills.sort(shareComparator);

        double sumTopDemandShare = topSkills.stream()
            .mapToDouble(SkillShareItem::demandShare)
            .sum();

        double sumCoveredDemandShare = coveredSkills.stream()
            .mapToDouble(SkillShareItem::demandShare)
            .sum();

        double coverageScore = (sumTopDemandShare > 0.0)
            ? (sumCoveredDemandShare / sumTopDemandShare) * 100.0
            : 0.0;

        return new CourseAlignmentResponse(
            courseId,
            courseName,
            roleId,
            roleName,
            districtId,
            effectiveWindow,
            effectiveTopN,
            postingsInScope,
            roleLinkedToCourse,
            coverageScore,
            coveredSkills,
            missingSkills
        );
    }
}

