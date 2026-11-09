package com.skillpath.backend.service;

import com.skillpath.backend.dto.DemandSkillsResponse;
import com.skillpath.backend.dto.DemandSummaryResponse;
import com.skillpath.backend.dto.DistrictDemandItem;
import com.skillpath.backend.dto.DistrictDemandResponse;
import com.skillpath.backend.dto.SkillDemandItem;
import com.skillpath.backend.dto.SkillTrendResponse;
import com.skillpath.backend.dto.TrendPoint;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DemandService {

    private static final Pattern MONTH_PATTERN = Pattern.compile("^\\d{4}-(0[1-9]|1[0-2])$");

    private final JdbcTemplate jdbcTemplate;

    public DemandService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private boolean isValidMonth(String month) {
        if (month == null || !MONTH_PATTERN.matcher(month).matches()) {
            return false;
        }
        try {
            YearMonth.parse(month);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    public DemandSummaryResponse getSummary() {
        Long totalSkills = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM skill", Long.class);
        Long totalRoles = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM role", Long.class);
        Long totalDistricts = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM district", Long.class);
        Long totalCourses = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM course", Long.class);

        String latestMonth = jdbcTemplate.queryForObject(
            "SELECT MAX(\"month\") FROM demand_monthly",
            String.class
        );

        Long totalPostings = jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
            "SELECT MAX(postings_total) AS grp_total FROM demand_monthly GROUP BY district_id, role_id, \"month\"" +
            ") t",
            Long.class
        );

        long latestMonthPostings = 0L;
        if (latestMonth != null) {
            Long latest = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
                "SELECT MAX(postings_total) AS grp_total FROM demand_monthly WHERE \"month\" = ? GROUP BY district_id, role_id, \"month\"" +
                ") t",
                Long.class,
                latestMonth
            );
            latestMonthPostings = (latest != null) ? latest : 0L;
        }

        return new DemandSummaryResponse(
            totalPostings != null ? totalPostings : 0L,
            totalSkills != null ? totalSkills : 0L,
            totalRoles != null ? totalRoles : 0L,
            totalDistricts != null ? totalDistricts : 0L,
            totalCourses != null ? totalCourses : 0L,
            latestMonth,
            latestMonthPostings,
            true
        );
    }

    public DemandSkillsResponse getTopSkills(Long roleId, Long districtId, String from, String to, Integer limit) {
        if (roleId != null) {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM role WHERE id = ?", Integer.class, roleId);
            if (count == null || count == 0) {
                throw new ResourceNotFoundException("Role not found: " + roleId);
            }
        }
        if (districtId != null) {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM district WHERE id = ?", Integer.class, districtId);
            if (count == null || count == 0) {
                throw new ResourceNotFoundException("District not found: " + districtId);
            }
        }
        if (from != null && !from.isBlank() && !isValidMonth(from)) {
            throw new BadRequestException("Malformed month: " + from);
        }
        if (to != null && !to.isBlank() && !isValidMonth(to)) {
            throw new BadRequestException("Malformed month: " + to);
        }
        if (limit != null && limit < 1) {
            throw new BadRequestException("Limit must be at least 1");
        }
        int effectiveLimit = (limit == null) ? 10 : Math.min(limit, 50);

        String latestMonth = jdbcTemplate.queryForObject("SELECT MAX(\"month\") FROM demand_monthly", String.class);
        String effectiveFrom = from;
        String effectiveTo = to;

        if (latestMonth != null) {
            String defaultTo = latestMonth;
            String defaultFrom = YearMonth.parse(latestMonth).minusMonths(5).toString();

            if (effectiveFrom == null || effectiveFrom.isBlank()) {
                effectiveFrom = defaultFrom;
            }
            if (effectiveTo == null || effectiveTo.isBlank()) {
                effectiveTo = defaultTo;
            }
        }

        if (effectiveFrom != null && effectiveTo != null && effectiveFrom.compareTo(effectiveTo) > 0) {
            throw new BadRequestException("from cannot be after to: " + effectiveFrom + " > " + effectiveTo);
        }

        if (latestMonth == null) {
            return new DemandSkillsResponse(effectiveFrom, effectiveTo, roleId, districtId, 0L, List.of());
        }

        List<Object> params = new ArrayList<>();
        StringBuilder whereClause = new StringBuilder(" WHERE dm.\"month\" >= ? AND dm.\"month\" <= ?");
        params.add(effectiveFrom);
        params.add(effectiveTo);

        if (roleId != null) {
            whereClause.append(" AND dm.role_id = ?");
            params.add(roleId);
        }
        if (districtId != null) {
            whereClause.append(" AND dm.district_id = ?");
            params.add(districtId);
        }

        String sqlDenominator = "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
            "SELECT MAX(dm.postings_total) AS grp_total FROM demand_monthly dm" +
            whereClause +
            " GROUP BY dm.district_id, dm.role_id, dm.\"month\"" +
            ") t";

        Long totalPostingsInScope = jdbcTemplate.queryForObject(sqlDenominator, Long.class, params.toArray());
        long totalPostings = (totalPostingsInScope != null) ? totalPostingsInScope : 0L;

        String sqlSkills = "SELECT dm.skill_id, s.name, s.category, SUM(dm.postings_with_skill) AS postings_with_skill " +
            "FROM demand_monthly dm " +
            "JOIN skill s ON dm.skill_id = s.id" +
            whereClause +
            " GROUP BY dm.skill_id, s.name, s.category " +
            "HAVING SUM(dm.postings_with_skill) > 0";

        List<SkillDemandItem> items = new ArrayList<>();
        jdbcTemplate.query(sqlSkills, rs -> {
            long skillId = rs.getLong("skill_id");
            String name = rs.getString("name");
            String category = rs.getString("category");
            long postingsWithSkill = rs.getLong("postings_with_skill");
            double share = totalPostings > 0 ? (double) postingsWithSkill / totalPostings : 0.0;
            items.add(new SkillDemandItem(skillId, name, category, postingsWithSkill, share));
        }, params.toArray());

        items.sort(Comparator.comparingDouble(SkillDemandItem::share).reversed()
            .thenComparing(SkillDemandItem::name));

        List<SkillDemandItem> limitedItems = items.stream().limit(effectiveLimit).toList();

        return new DemandSkillsResponse(
            effectiveFrom,
            effectiveTo,
            roleId,
            districtId,
            totalPostings,
            limitedItems
        );
    }

    public SkillTrendResponse getSkillTrend(Long skillId, Long roleId, Long districtId, String from, String to) {
        List<String> skillNames = jdbcTemplate.query(
            "SELECT name FROM skill WHERE id = ?",
            (rs, rowNum) -> rs.getString("name"),
            skillId
        );
        if (skillNames.isEmpty()) {
            throw new ResourceNotFoundException("Skill not found: " + skillId);
        }
        String skillName = skillNames.get(0);

        if (roleId != null) {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM role WHERE id = ?", Integer.class, roleId);
            if (count == null || count == 0) {
                throw new ResourceNotFoundException("Role not found: " + roleId);
            }
        }
        if (districtId != null) {
            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM district WHERE id = ?", Integer.class, districtId);
            if (count == null || count == 0) {
                throw new ResourceNotFoundException("District not found: " + districtId);
            }
        }
        if (from != null && !from.isBlank() && !isValidMonth(from)) {
            throw new BadRequestException("Malformed month: " + from);
        }
        if (to != null && !to.isBlank() && !isValidMonth(to)) {
            throw new BadRequestException("Malformed month: " + to);
        }

        String minMonth = jdbcTemplate.queryForObject("SELECT MIN(\"month\") FROM demand_monthly", String.class);
        String maxMonth = jdbcTemplate.queryForObject("SELECT MAX(\"month\") FROM demand_monthly", String.class);

        String effectiveFrom = from;
        String effectiveTo = to;

        if (minMonth != null && maxMonth != null) {
            if (effectiveFrom == null || effectiveFrom.isBlank()) {
                effectiveFrom = minMonth;
            }
            if (effectiveTo == null || effectiveTo.isBlank()) {
                effectiveTo = maxMonth;
            }
        }

        if (effectiveFrom != null && effectiveTo != null && effectiveFrom.compareTo(effectiveTo) > 0) {
            throw new BadRequestException("from cannot be after to: " + effectiveFrom + " > " + effectiveTo);
        }

        if (minMonth == null || maxMonth == null) {
            return new SkillTrendResponse(skillId, skillName, roleId, districtId, List.of());
        }

        List<String> monthsInWindow = jdbcTemplate.queryForList(
            "SELECT DISTINCT \"month\" FROM demand_monthly WHERE \"month\" >= ? AND \"month\" <= ? ORDER BY \"month\" ASC",
            String.class,
            effectiveFrom,
            effectiveTo
        );

        List<Object> totalParams = new ArrayList<>();
        StringBuilder totalWhere = new StringBuilder(" WHERE dm.\"month\" >= ? AND dm.\"month\" <= ?");
        totalParams.add(effectiveFrom);
        totalParams.add(effectiveTo);
        if (roleId != null) {
            totalWhere.append(" AND dm.role_id = ?");
            totalParams.add(roleId);
        }
        if (districtId != null) {
            totalWhere.append(" AND dm.district_id = ?");
            totalParams.add(districtId);
        }

        String sqlMonthlyTotals = "SELECT \"month\", SUM(grp_total) AS postings_total FROM (" +
            "SELECT dm.\"month\", MAX(dm.postings_total) AS grp_total FROM demand_monthly dm" +
            totalWhere +
            " GROUP BY dm.district_id, dm.role_id, dm.\"month\"" +
            ") t GROUP BY \"month\"";

        Map<String, Long> monthlyTotalsMap = new LinkedHashMap<>();
        jdbcTemplate.query(sqlMonthlyTotals, rs -> {
            monthlyTotalsMap.put(rs.getString("month"), rs.getLong("postings_total"));
        }, totalParams.toArray());

        List<Object> skillParams = new ArrayList<>();
        StringBuilder skillWhere = new StringBuilder(" WHERE dm.skill_id = ? AND dm.\"month\" >= ? AND dm.\"month\" <= ?");
        skillParams.add(skillId);
        skillParams.add(effectiveFrom);
        skillParams.add(effectiveTo);
        if (roleId != null) {
            skillWhere.append(" AND dm.role_id = ?");
            skillParams.add(roleId);
        }
        if (districtId != null) {
            skillWhere.append(" AND dm.district_id = ?");
            skillParams.add(districtId);
        }

        String sqlSkillMonthly = "SELECT dm.\"month\", SUM(dm.postings_with_skill) AS postings_with_skill " +
            "FROM demand_monthly dm" +
            skillWhere +
            " GROUP BY dm.\"month\"";

        Map<String, Long> skillMonthlyMap = new LinkedHashMap<>();
        jdbcTemplate.query(sqlSkillMonthly, rs -> {
            skillMonthlyMap.put(rs.getString("month"), rs.getLong("postings_with_skill"));
        }, skillParams.toArray());

        List<TrendPoint> points = new ArrayList<>();
        for (String m : monthsInWindow) {
            long postingsWithSkill = skillMonthlyMap.getOrDefault(m, 0L);
            long postingsTotal = monthlyTotalsMap.getOrDefault(m, 0L);
            double share = postingsTotal > 0 ? (double) postingsWithSkill / postingsTotal : 0.0;
            points.add(new TrendPoint(m, postingsWithSkill, postingsTotal, share));
        }

        return new SkillTrendResponse(skillId, skillName, roleId, districtId, points);
    }

    public DistrictDemandResponse getDistricts(String from, String to) {
        if (from != null && !from.isBlank() && !isValidMonth(from)) {
            throw new BadRequestException("Malformed month: " + from);
        }
        if (to != null && !to.isBlank() && !isValidMonth(to)) {
            throw new BadRequestException("Malformed month: " + to);
        }

        String minMonth = jdbcTemplate.queryForObject("SELECT MIN(\"month\") FROM demand_monthly", String.class);
        String maxMonth = jdbcTemplate.queryForObject("SELECT MAX(\"month\") FROM demand_monthly", String.class);

        String effectiveFrom = from;
        String effectiveTo = to;

        if (minMonth != null && maxMonth != null) {
            if (effectiveFrom == null || effectiveFrom.isBlank()) {
                effectiveFrom = minMonth;
            }
            if (effectiveTo == null || effectiveTo.isBlank()) {
                effectiveTo = maxMonth;
            }
        }

        if (effectiveFrom != null && effectiveTo != null && effectiveFrom.compareTo(effectiveTo) > 0) {
            throw new BadRequestException("from cannot be after to: " + effectiveFrom + " > " + effectiveTo);
        }

        record DistrictInfo(Long id, String name, String state) {}
        List<DistrictInfo> allDistricts = jdbcTemplate.query(
            "SELECT id, name, state FROM district",
            (rs, rowNum) -> new DistrictInfo(rs.getLong("id"), rs.getString("name"), rs.getString("state"))
        );

        Map<Long, Long> districtPostings = new HashMap<>();
        if (effectiveFrom != null && effectiveTo != null) {
            String sql = "SELECT district_id, SUM(grp_total) AS postings FROM (" +
                "SELECT dm.district_id, dm.role_id, dm.\"month\", MAX(dm.postings_total) AS grp_total " +
                "FROM demand_monthly dm " +
                "WHERE dm.\"month\" >= ? AND dm.\"month\" <= ? " +
                "GROUP BY dm.district_id, dm.role_id, dm.\"month\"" +
                ") t GROUP BY district_id";

            jdbcTemplate.query(sql, rs -> {
                districtPostings.put(rs.getLong("district_id"), rs.getLong("postings"));
            }, effectiveFrom, effectiveTo);
        }

        List<DistrictDemandItem> list = new ArrayList<>();
        for (DistrictInfo d : allDistricts) {
            long postings = districtPostings.getOrDefault(d.id(), 0L);
            list.add(new DistrictDemandItem(d.id(), d.name(), d.state(), postings));
        }

        list.sort(Comparator.comparingLong(DistrictDemandItem::postings).reversed()
            .thenComparing(DistrictDemandItem::name));

        return new DistrictDemandResponse(effectiveFrom, effectiveTo, list);
    }
}

