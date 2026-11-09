package com.skillpath.backend.service;

import com.skillpath.backend.dto.CourseOversupplyItem;
import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OversupplyService {

    private final JdbcTemplate jdbcTemplate;
    private final int windowMonths;
    private final double scalingFactor;
    private final double oversupplyThreshold;
    private final int minOpenings;

    public OversupplyService(
        JdbcTemplate jdbcTemplate,
        @Value("${skillpath.flags.window-months:12}") int windowMonths,
        @Value("${skillpath.flags.openings-scaling-factor:1.0}") double scalingFactor,
        @Value("${skillpath.flags.oversupply-ratio-threshold:1.5}") double oversupplyThreshold,
        @Value("${skillpath.flags.min-openings:20}") int minOpenings
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.windowMonths = windowMonths;
        this.scalingFactor = scalingFactor;
        this.oversupplyThreshold = oversupplyThreshold;
        this.minOpenings = minOpenings;
    }

    public FlagsResponse getFlags(Long districtId) {
        return getFlags(districtId, this.windowMonths, this.scalingFactor, this.oversupplyThreshold, this.minOpenings);
    }

    public FlagsResponse getFlags(
        Long districtId,
        Integer overrideWindowMonths,
        Double overrideScalingFactor,
        Double overrideThreshold
    ) {
        return getFlags(districtId, overrideWindowMonths, overrideScalingFactor, overrideThreshold, this.minOpenings);
    }

    public FlagsResponse getFlags(
        Long districtId,
        Integer overrideWindowMonths,
        Double overrideScalingFactor,
        Double overrideThreshold,
        Integer overrideMinOpenings
    ) {
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

        int effectiveWindowMonths = (overrideWindowMonths != null) ? overrideWindowMonths : this.windowMonths;
        double effectiveScalingFactor = (overrideScalingFactor != null) ? overrideScalingFactor : this.scalingFactor;
        double effectiveThreshold = (overrideThreshold != null) ? overrideThreshold : this.oversupplyThreshold;
        int effectiveMinOpenings = (overrideMinOpenings != null) ? overrideMinOpenings : this.minOpenings;

        Date maxDateSql = jdbcTemplate.queryForObject(
            "SELECT MAX(posted_on) FROM job_posting",
            Date.class
        );

        LocalDate windowStart = null;
        LocalDate windowEnd = null;

        StringBuilder sql = new StringBuilder("""
            SELECT
                c.id AS course_id,
                c.name AS course_name,
                d.id AS district_id,
                d.name AS district_name,
                co."year" AS offering_year,
                co.seats AS seats,
                co.trainers AS trainers,
                (SELECT COUNT(*) FROM course_role cr WHERE cr.course_id = c.id) AS linked_role_count,
        """);

        List<Object> params = new ArrayList<>();

        if (maxDateSql != null) {
            windowEnd = maxDateSql.toLocalDate();
            windowStart = windowEnd.minusMonths(effectiveWindowMonths).plusDays(1);
            sql.append("""
                (SELECT COUNT(*) FROM job_posting jp
                 WHERE jp.district_id = co.district_id
                   AND jp.posted_on >= ?
                   AND jp.posted_on <= ?
                   AND jp.role_id IN (SELECT cr2.role_id FROM course_role cr2 WHERE cr2.course_id = c.id)
                ) AS postings_in_window
            """);
            params.add(Date.valueOf(windowStart));
            params.add(Date.valueOf(windowEnd));
        } else {
            sql.append("0 AS postings_in_window ");
        }

        sql.append("""
            FROM course_offering co
            JOIN course c ON c.id = co.course_id
            JOIN district d ON d.id = co.district_id
            WHERE co."year" = (
                SELECT MAX(co2."year")
                FROM course_offering co2
                WHERE co2.course_id = co.course_id AND co2.district_id = co.district_id
            )
        """);

        if (districtId != null) {
            sql.append(" AND co.district_id = ?");
            params.add(districtId);
        }

        List<CourseOversupplyItem> items = jdbcTemplate.query(
            sql.toString(),
            (rs, rowNum) -> {
                long courseId = rs.getLong("course_id");
                String courseName = rs.getString("course_name");
                long distId = rs.getLong("district_id");
                String distName = rs.getString("district_name");
                int year = rs.getInt("offering_year");
                int seats = rs.getInt("seats");
                int trainers = rs.getInt("trainers");
                long linkedRoleCount = rs.getLong("linked_role_count");
                long postingsInWindow = rs.getLong("postings_in_window");

                double estimatedOpenings = postingsInWindow * effectiveScalingFactor;
                Double oversupplyRatio = null;
                boolean lowSample = estimatedOpenings < effectiveMinOpenings;

                if (estimatedOpenings > 0.0) {
                    oversupplyRatio = (double) seats / estimatedOpenings;
                }

                boolean oversupplied = oversupplyRatio != null
                    && oversupplyRatio > effectiveThreshold
                    && !lowSample;

                return new CourseOversupplyItem(
                    courseId,
                    courseName,
                    distId,
                    distName,
                    year,
                    seats,
                    trainers,
                    linkedRoleCount,
                    postingsInWindow,
                    estimatedOpenings,
                    oversupplyRatio,
                    oversupplied,
                    lowSample
                );
            },
            params.toArray()
        );

        items.sort(
            Comparator.comparing(
                CourseOversupplyItem::oversupplyRatio,
                Comparator.nullsLast(Comparator.reverseOrder())
            )
            .thenComparing(CourseOversupplyItem::courseId)
            .thenComparing(CourseOversupplyItem::districtId)
        );

        return new FlagsResponse(
            effectiveWindowMonths,
            windowStart,
            windowEnd,
            effectiveScalingFactor,
            effectiveThreshold,
            effectiveMinOpenings,
            items
        );
    }
}

