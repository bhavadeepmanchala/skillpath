package com.skillpath.backend.service;

import com.skillpath.backend.dto.DemandTrendsResponse;
import com.skillpath.backend.dto.SkillTrendItem;
import com.skillpath.backend.dto.TrendWindowRange;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class TrendService {

    private final JdbcTemplate jdbcTemplate;
    private final int minPostings;

    public TrendService(
        JdbcTemplate jdbcTemplate,
        @Value("${skillpath.trends.min-postings:20}") int minPostings
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.minPostings = minPostings;
    }

    public DemandTrendsResponse getTrends(Long roleId, Long districtId, Integer window, Integer limit) {
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
        if (window != null && (window < 1 || window > 9)) {
            throw new BadRequestException("Window must be between 1 and 9");
        }
        int effectiveWindow = (window == null) ? 3 : window;

        if (limit != null && limit < 1) {
            throw new BadRequestException("Limit must be at least 1");
        }
        int effectiveLimit = (limit == null) ? 5 : Math.min(limit, 20);

        List<String> distinctMonths = jdbcTemplate.queryForList(
            "SELECT DISTINCT \"month\" FROM demand_monthly ORDER BY \"month\" ASC",
            String.class
        );

        int requiredMonths = 2 * effectiveWindow;
        if (distinctMonths.size() < requiredMonths) {
            throw new BadRequestException("Not enough distinct months: required " + requiredMonths + ", available " + distinctMonths.size());
        }

        int totalMonths = distinctMonths.size();
        String prevFrom = distinctMonths.get(totalMonths - 2 * effectiveWindow);
        String prevTo = distinctMonths.get(totalMonths - effectiveWindow - 1);
        String latestFrom = distinctMonths.get(totalMonths - effectiveWindow);
        String latestTo = distinctMonths.get(totalMonths - 1);

        TrendWindowRange previousWindow = new TrendWindowRange(prevFrom, prevTo);
        TrendWindowRange latestWindow = new TrendWindowRange(latestFrom, latestTo);

        long denomPrevious = calculateDenominator(prevFrom, prevTo, roleId, districtId);
        long denomLatest = calculateDenominator(latestFrom, latestTo, roleId, districtId);

        List<Object> skillParams = new ArrayList<>();
        StringBuilder skillSql = new StringBuilder(
            "SELECT dm.skill_id, s.name, s.category, " +
            "SUM(CASE WHEN dm.\"month\" >= ? AND dm.\"month\" <= ? THEN dm.postings_with_skill ELSE 0 END) AS postings_prev, " +
            "SUM(CASE WHEN dm.\"month\" >= ? AND dm.\"month\" <= ? THEN dm.postings_with_skill ELSE 0 END) AS postings_latest " +
            "FROM demand_monthly dm " +
            "JOIN skill s ON dm.skill_id = s.id " +
            "WHERE dm.\"month\" >= ? AND dm.\"month\" <= ?"
        );

        skillParams.add(prevFrom);
        skillParams.add(prevTo);
        skillParams.add(latestFrom);
        skillParams.add(latestTo);
        skillParams.add(prevFrom);
        skillParams.add(latestTo);

        if (roleId != null) {
            skillSql.append(" AND dm.role_id = ?");
            skillParams.add(roleId);
        }
        if (districtId != null) {
            skillSql.append(" AND dm.district_id = ?");
            skillParams.add(districtId);
        }

        skillSql.append(" GROUP BY dm.skill_id, s.name, s.category");

        List<SkillTrendItem> rising = new ArrayList<>();
        List<SkillTrendItem> declining = new ArrayList<>();

        jdbcTemplate.query(skillSql.toString(), rs -> {
            long skillId = rs.getLong("skill_id");
            String name = rs.getString("name");
            String category = rs.getString("category");
            long postingsPrev = rs.getLong("postings_prev");
            long postingsLatest = rs.getLong("postings_latest");

            if (postingsLatest + postingsPrev < minPostings) {
                return;
            }

            double sharePrevious = (denomPrevious > 0) ? ((double) postingsPrev / denomPrevious) : 0.0;
            double shareLatest = (denomLatest > 0) ? ((double) postingsLatest / denomLatest) : 0.0;
            double change = shareLatest - sharePrevious;

            Double relativeGrowth = null;
            if (sharePrevious > 0.0) {
                relativeGrowth = change / sharePrevious;
            }

            SkillTrendItem item = new SkillTrendItem(
                skillId,
                name,
                category,
                shareLatest,
                sharePrevious,
                change,
                relativeGrowth,
                postingsLatest,
                postingsPrev
            );

            if (change > 0.0) {
                rising.add(item);
            } else if (change < 0.0) {
                declining.add(item);
            }
        }, skillParams.toArray());

        rising.sort((a, b) -> {
            int cmp = Double.compare(b.change(), a.change());
            if (cmp != 0) {
                return cmp;
            }
            return a.name().compareTo(b.name());
        });

        declining.sort((a, b) -> {
            int cmp = Double.compare(a.change(), b.change());
            if (cmp != 0) {
                return cmp;
            }
            return a.name().compareTo(b.name());
        });

        List<SkillTrendItem> limitedRising = rising.stream().limit(effectiveLimit).toList();
        List<SkillTrendItem> limitedDeclining = declining.stream().limit(effectiveLimit).toList();

        return new DemandTrendsResponse(
            effectiveWindow,
            minPostings,
            roleId,
            districtId,
            latestWindow,
            previousWindow,
            limitedRising,
            limitedDeclining
        );
    }

    private long calculateDenominator(String from, String to, Long roleId, Long districtId) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
            "SELECT COALESCE(SUM(grp_total), 0) FROM (" +
            "SELECT MAX(dm.postings_total) AS grp_total FROM demand_monthly dm " +
            "WHERE dm.\"month\" >= ? AND dm.\"month\" <= ?"
        );
        params.add(from);
        params.add(to);

        if (roleId != null) {
            sql.append(" AND dm.role_id = ?");
            params.add(roleId);
        }
        if (districtId != null) {
            sql.append(" AND dm.district_id = ?");
            params.add(districtId);
        }

        sql.append(" GROUP BY dm.district_id, dm.role_id, dm.\"month\") t");

        Long result = jdbcTemplate.queryForObject(sql.toString(), Long.class, params.toArray());
        return result != null ? result : 0L;
    }
}

