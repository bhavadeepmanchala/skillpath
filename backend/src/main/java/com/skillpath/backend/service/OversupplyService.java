package com.skillpath.backend.service;

import com.skillpath.backend.dto.CourseAlignmentResponse;
import com.skillpath.backend.dto.CourseOversupplyItem;
import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class OversupplyService {

    private static final Logger log = LoggerFactory.getLogger(OversupplyService.class);
    public static final int MAX_CACHE_ENTRIES = 50;

    private final JdbcTemplate jdbcTemplate;
    private final CourseService courseService;
    private final ReadinessService readinessService;
    private final SeedStatus seedStatus;
    private final int windowMonths;
    private final double scalingFactor;
    private final double oversupplyThreshold;
    private final int minOpenings;
    private final double obsoleteCoverageThreshold;
    private final int minPostings;

    private final ConcurrentHashMap<FlagsCacheKey, FlagsResponse> responseCache = new ConcurrentHashMap<>();

    @Autowired
    public OversupplyService(
        JdbcTemplate jdbcTemplate,
        CourseService courseService,
        @Autowired(required = false) ReadinessService readinessService,
        @Autowired(required = false) SeedStatus seedStatus,
        @Value("${skillpath.flags.window-months:12}") int windowMonths,
        @Value("${skillpath.flags.openings-scaling-factor:1.0}") double scalingFactor,
        @Value("${skillpath.flags.oversupply-ratio-threshold:1.5}") double oversupplyThreshold,
        @Value("${skillpath.flags.min-openings:20}") int minOpenings,
        @Value("${skillpath.flags.obsolete-coverage-threshold:40.0}") double obsoleteCoverageThreshold,
        @Value("${skillpath.trends.min-postings:20}") int minPostings
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.courseService = courseService;
        this.readinessService = readinessService;
        this.seedStatus = seedStatus;
        this.windowMonths = windowMonths;
        this.scalingFactor = scalingFactor;
        this.oversupplyThreshold = oversupplyThreshold;
        this.minOpenings = minOpenings;
        this.obsoleteCoverageThreshold = obsoleteCoverageThreshold;
        this.minPostings = minPostings;

        if (this.seedStatus != null) {
            this.seedStatus.addCacheClearListener(this::clearCache);
        } else if (this.readinessService != null && this.readinessService.getSeedStatus() != null) {
            this.readinessService.getSeedStatus().addCacheClearListener(this::clearCache);
        }
    }

    public OversupplyService(
        JdbcTemplate jdbcTemplate,
        CourseService courseService,
        int windowMonths,
        double scalingFactor,
        double oversupplyThreshold,
        int minOpenings,
        double obsoleteCoverageThreshold,
        int minPostings
    ) {
        this(jdbcTemplate, courseService, null, null, windowMonths, scalingFactor, oversupplyThreshold, minOpenings, obsoleteCoverageThreshold, minPostings);
    }

    public void clearCache() {
        responseCache.clear();
    }

    public int getCacheSize() {
        return responseCache.size();
    }

    public boolean isCached(Long districtId, Integer minOpenings) {
        int effectiveMin = (minOpenings != null) ? minOpenings : this.minOpenings;
        return responseCache.containsKey(new FlagsCacheKey(districtId, effectiveMin));
    }

    public void warmUp() {
        log.info("Warming up flags cache for national default query...");
        FlagsResponse response = getFlags(null, this.windowMonths, this.scalingFactor, this.oversupplyThreshold, this.minOpenings, this.obsoleteCoverageThreshold);
        putCache(new FlagsCacheKey(null, this.minOpenings), response);
        log.info("Flags cache warm-up completed: {} items cached", response.items().size());
    }

    private void putCache(FlagsCacheKey key, FlagsResponse response) {
        synchronized (responseCache) {
            while (responseCache.size() >= MAX_CACHE_ENTRIES && !responseCache.containsKey(key)) {
                Iterator<FlagsCacheKey> it = responseCache.keySet().iterator();
                if (it.hasNext()) {
                    responseCache.remove(it.next());
                } else {
                    break;
                }
            }
            responseCache.put(key, response);
        }
    }

    private boolean isReady() {
        if (seedStatus != null) {
            if (!SeedStatus.PHASE_READY.equals(seedStatus.getPhase())) {
                return false;
            }
        }
        if (readinessService == null) {
            return false;
        }
        try {
            return readinessService.getReadiness().ready();
        } catch (Exception e) {
            return false;
        }
    }

    public FlagsResponse getFlags(Long districtId) {
        return getFlags(districtId, this.windowMonths, this.scalingFactor, this.oversupplyThreshold, this.minOpenings, this.obsoleteCoverageThreshold);
    }

    public FlagsResponse getFlags(
        Long districtId,
        Integer overrideWindowMonths,
        Double overrideScalingFactor,
        Double overrideThreshold
    ) {
        return getFlags(districtId, overrideWindowMonths, overrideScalingFactor, overrideThreshold, this.minOpenings, this.obsoleteCoverageThreshold);
    }

    public FlagsResponse getFlags(
        Long districtId,
        Integer overrideWindowMonths,
        Double overrideScalingFactor,
        Double overrideThreshold,
        Integer overrideMinOpenings
    ) {
        return getFlags(districtId, overrideWindowMonths, overrideScalingFactor, overrideThreshold, overrideMinOpenings, this.obsoleteCoverageThreshold);
    }

    public FlagsResponse getFlags(
        Long districtId,
        Integer overrideWindowMonths,
        Double overrideScalingFactor,
        Double overrideThreshold,
        Integer overrideMinOpenings,
        Double overrideObsoleteThreshold
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
        double effectiveObsoleteThreshold = (overrideObsoleteThreshold != null) ? overrideObsoleteThreshold : this.obsoleteCoverageThreshold;

        boolean isDefaultParams = (overrideWindowMonths == null || overrideWindowMonths == this.windowMonths)
            && (overrideScalingFactor == null || Double.compare(overrideScalingFactor, this.scalingFactor) == 0)
            && (overrideThreshold == null || Double.compare(overrideThreshold, this.oversupplyThreshold) == 0)
            && (overrideObsoleteThreshold == null || Double.compare(overrideObsoleteThreshold, this.obsoleteCoverageThreshold) == 0);

        boolean ready = isReady();
        FlagsCacheKey cacheKey = null;
        if (ready && isDefaultParams) {
            cacheKey = new FlagsCacheKey(districtId, effectiveMinOpenings);
            FlagsResponse cached = responseCache.get(cacheKey);
            if (cached != null) {
                return cached;
            }
        }

        Map<CourseRoleDistrictKey, Double> coverageMemo = new HashMap<>();

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
                COALESCE(cr_cnt.role_count, 0) AS linked_role_count,
                COALESCE(jp_agg.posting_count, 0) AS postings_in_window
            FROM course_offering co
            JOIN (
                SELECT course_id, district_id, MAX("year") AS max_year
                FROM course_offering
                GROUP BY course_id, district_id
            ) co_max ON co_max.course_id = co.course_id AND co_max.district_id = co.district_id AND co_max.max_year = co."year"
            JOIN course c ON c.id = co.course_id
            JOIN district d ON d.id = co.district_id
            LEFT JOIN (
                SELECT course_id, COUNT(*) AS role_count
                FROM course_role
                GROUP BY course_id
            ) cr_cnt ON cr_cnt.course_id = co.course_id
        """);

        List<Object> params = new ArrayList<>();

        if (maxDateSql != null) {
            windowEnd = maxDateSql.toLocalDate();
            windowStart = windowEnd.minusMonths(effectiveWindowMonths).plusDays(1);
            sql.append("""
            LEFT JOIN (
                SELECT cr.course_id, jp.district_id, COUNT(*) AS posting_count
                FROM job_posting jp
                JOIN course_role cr ON cr.role_id = jp.role_id
                WHERE jp.posted_on >= ? AND jp.posted_on <= ?
            """);
            params.add(Date.valueOf(windowStart));
            params.add(Date.valueOf(windowEnd));

            if (districtId != null) {
                sql.append(" AND jp.district_id = ?");
                params.add(districtId);
            }

            sql.append("""
                GROUP BY cr.course_id, jp.district_id
            ) jp_agg ON jp_agg.course_id = co.course_id AND jp_agg.district_id = co.district_id
            """);
        } else {
            sql.append("""
            LEFT JOIN (
                SELECT NULL AS course_id, NULL AS district_id, 0 AS posting_count
                WHERE 1 = 0
            ) jp_agg ON 1 = 0
            """);
        }

        if (districtId != null) {
            sql.append(" WHERE co.district_id = ?");
            params.add(districtId);
        }

        // --- Trend Windows for Key Skill Trend calculation ---
        List<String> distinctMonths = jdbcTemplate.queryForList(
            "SELECT DISTINCT \"month\" FROM demand_monthly ORDER BY \"month\" ASC",
            String.class
        );
        int trendWindowMonths = 3;
        int requiredMonths = 2 * trendWindowMonths;
        boolean hasTrendData = distinctMonths.size() >= requiredMonths;
        String prevFrom = null;
        String prevTo = null;
        String latestFrom = null;
        String latestTo = null;

        if (hasTrendData) {
            int totalMonths = distinctMonths.size();
            prevFrom = distinctMonths.get(totalMonths - 2 * trendWindowMonths);
            prevTo = distinctMonths.get(totalMonths - trendWindowMonths - 1);
            latestFrom = distinctMonths.get(totalMonths - trendWindowMonths);
            latestTo = distinctMonths.get(totalMonths - 1);
        }

        // Map course_id -> list of linked role_ids
        Map<Long, List<Long>> courseRolesMap = new HashMap<>();
        jdbcTemplate.query("SELECT course_id, role_id FROM course_role", rs -> {
            long cId = rs.getLong("course_id");
            long rId = rs.getLong("role_id");
            courseRolesMap.computeIfAbsent(cId, k -> new ArrayList<>()).add(rId);
        });

        // Precompute trend denominators and skill postings if trend data is available
        Map<CourseDistrictKey, Long> denomPrevMap = new HashMap<>();
        Map<CourseDistrictKey, Long> denomLatestMap = new HashMap<>();
        Map<CourseDistrictKey, List<SkillPostings>> skillPostingsMap = new HashMap<>();

        if (hasTrendData) {
            StringBuilder denomSql = new StringBuilder("""
                SELECT
                    cr.course_id,
                    dm.district_id,
                    COALESCE(SUM(CASE WHEN dm."month" >= ? AND dm."month" <= ? THEN dm.postings_total_grp ELSE 0 END), 0) AS denom_prev,
                    COALESCE(SUM(CASE WHEN dm."month" >= ? AND dm."month" <= ? THEN dm.postings_total_grp ELSE 0 END), 0) AS denom_latest
                FROM (
                    SELECT district_id, role_id, "month", MAX(postings_total) AS postings_total_grp
                    FROM demand_monthly
                    WHERE "month" >= ? AND "month" <= ?
            """);
            List<Object> denomParams = new ArrayList<>();
            denomParams.add(prevFrom);
            denomParams.add(prevTo);
            denomParams.add(latestFrom);
            denomParams.add(latestTo);
            denomParams.add(prevFrom);
            denomParams.add(latestTo);

            if (districtId != null) {
                denomSql.append(" AND district_id = ?");
                denomParams.add(districtId);
            }

            denomSql.append("""
                    GROUP BY district_id, role_id, "month"
                ) dm
                JOIN course_role cr ON cr.role_id = dm.role_id
                GROUP BY cr.course_id, dm.district_id
            """);

            jdbcTemplate.query(denomSql.toString(), rs -> {
                CourseDistrictKey key = new CourseDistrictKey(rs.getLong("course_id"), rs.getLong("district_id"));
                denomPrevMap.put(key, rs.getLong("denom_prev"));
                denomLatestMap.put(key, rs.getLong("denom_latest"));
            }, denomParams.toArray());

            StringBuilder skillSql = new StringBuilder("""
                SELECT
                    cr.course_id,
                    dm.district_id,
                    dm.skill_id,
                    SUM(CASE WHEN dm."month" >= ? AND dm."month" <= ? THEN dm.postings_with_skill ELSE 0 END) AS postings_prev,
                    SUM(CASE WHEN dm."month" >= ? AND dm."month" <= ? THEN dm.postings_with_skill ELSE 0 END) AS postings_latest
                FROM demand_monthly dm
                JOIN course_role cr ON cr.role_id = dm.role_id
                JOIN course_skill cs ON cs.course_id = cr.course_id AND cs.skill_id = dm.skill_id
                WHERE dm."month" >= ? AND dm."month" <= ?
            """);
            List<Object> skillQueryParams = new ArrayList<>();
            skillQueryParams.add(prevFrom);
            skillQueryParams.add(prevTo);
            skillQueryParams.add(latestFrom);
            skillQueryParams.add(latestTo);
            skillQueryParams.add(prevFrom);
            skillQueryParams.add(latestTo);

            if (districtId != null) {
                skillSql.append(" AND dm.district_id = ?");
                skillQueryParams.add(districtId);
            }

            skillSql.append(" GROUP BY cr.course_id, dm.district_id, dm.skill_id");

            jdbcTemplate.query(skillSql.toString(), rs -> {
                CourseDistrictKey key = new CourseDistrictKey(rs.getLong("course_id"), rs.getLong("district_id"));
                skillPostingsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(new SkillPostings(
                    rs.getLong("skill_id"),
                    rs.getLong("postings_prev"),
                    rs.getLong("postings_latest")
                ));
            }, skillQueryParams.toArray());
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

                // --- Obsolete Flag Calculation ---
                // 1. Coverage: reuse CourseService.getCourseAlignment across linked roles
                List<Long> linkedRoles = courseRolesMap.getOrDefault(courseId, List.of());
                double coverage = 0.0;
                if (!linkedRoles.isEmpty()) {
                    double sumCoverage = 0.0;
                    int count = 0;
                    for (Long roleId : linkedRoles) {
                        CourseRoleDistrictKey crdKey = new CourseRoleDistrictKey(courseId, roleId, distId);
                        Double roleCoverage = coverageMemo.get(crdKey);
                        if (roleCoverage == null) {
                            try {
                                CourseAlignmentResponse resp = courseService.getCourseAlignment(courseId, roleId, distId, null, null);
                                roleCoverage = resp.coverageScore();
                                coverageMemo.put(crdKey, roleCoverage);
                            } catch (Exception e) {
                                // ignore / skip if role or alignment lookup fails
                            }
                        }
                        if (roleCoverage != null) {
                            sumCoverage += roleCoverage;
                            count++;
                        }
                    }
                    if (count > 0) {
                        coverage = sumCoverage / count;
                    }
                }

                // 2. Key skills trend
                CourseDistrictKey key = new CourseDistrictKey(courseId, distId);
                long denomPrev = denomPrevMap.getOrDefault(key, 0L);
                long denomLatest = denomLatestMap.getOrDefault(key, 0L);
                List<SkillPostings> skills = skillPostingsMap.getOrDefault(key, List.of());

                int keySkillCount = 0;
                int fallingSkillCount = 0;
                double weightedTrendSum = 0.0;
                double totalLatestShare = 0.0;

                for (SkillPostings sp : skills) {
                    if (sp.postingsLatest + sp.postingsPrev < this.minPostings) {
                        continue; // min-postings guard
                    }
                    double prevShare = (denomPrev > 0) ? ((double) sp.postingsPrev / denomPrev) : 0.0;
                    double latestShare = (denomLatest > 0) ? ((double) sp.postingsLatest / denomLatest) : 0.0;
                    double trend = latestShare - prevShare;

                    keySkillCount++;
                    if (trend < 0.0) {
                        fallingSkillCount++;
                    }
                    weightedTrendSum += (trend * latestShare);
                    totalLatestShare += latestShare;
                }

                double keySkillTrend = (keySkillCount > 0 && totalLatestShare > 0.0)
                    ? (weightedTrendSum / totalLatestShare)
                    : 0.0;

                // obsolete = coverage < obsoleteCoverageThreshold AND keySkillTrend < 0
                // If there are no key skills, keySkillTrend = 0 and obsolete = false.
                boolean obsolete = (keySkillCount > 0)
                    && (coverage < effectiveObsoleteThreshold)
                    && (keySkillTrend < 0.0);

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
                    lowSample,
                    obsolete,
                    coverage,
                    keySkillTrend,
                    keySkillCount,
                    fallingSkillCount
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

        FlagsResponse response = new FlagsResponse(
            effectiveWindowMonths,
            windowStart,
            windowEnd,
            effectiveScalingFactor,
            effectiveThreshold,
            effectiveMinOpenings,
            effectiveObsoleteThreshold,
            items
        );

        if (cacheKey != null) {
            putCache(cacheKey, response);
        }

        return response;
    }

    public record FlagsCacheKey(Long districtId, int minOpenings) {}
    private record CourseRoleDistrictKey(long courseId, long roleId, long districtId) {}
    private record CourseDistrictKey(long courseId, long districtId) {}
    private record SkillPostings(long skillId, long postingsPrev, long postingsLatest) {}
}
