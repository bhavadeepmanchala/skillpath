package com.skillpath.backend.generator;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rebuilds the demand_monthly aggregate table from job_posting and posting_skill data.
 * Pure aggregation is performed in Java using TreeMaps for deterministic cross-database portability.
 */
@Component
public class DemandMonthlyRebuilder {

    private static final Logger log = LoggerFactory.getLogger(DemandMonthlyRebuilder.class);
    private static final int BATCH_SIZE = 5000;

    private final JdbcTemplate jdbcTemplate;

    public DemandMonthlyRebuilder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private record PostingMeta(long roleId, long districtId, String month) {}

    public record CellKey(long districtId, long roleId, String month) implements Comparable<CellKey> {
        @Override
        public int compareTo(CellKey o) {
            int c = Long.compare(this.districtId, o.districtId);
            if (c != 0) return c;
            c = Long.compare(this.roleId, o.roleId);
            if (c != 0) return c;
            return this.month.compareTo(o.month);
        }
    }

    public record SkillKey(long districtId, long roleId, long skillId, String month) implements Comparable<SkillKey> {
        @Override
        public int compareTo(SkillKey o) {
            int c = Long.compare(this.districtId, o.districtId);
            if (c != 0) return c;
            c = Long.compare(this.roleId, o.roleId);
            if (c != 0) return c;
            c = Long.compare(this.skillId, o.skillId);
            if (c != 0) return c;
            return this.month.compareTo(o.month);
        }
    }

    public record DemandMonthlyRow(
        long districtId,
        long roleId,
        long skillId,
        String month,
        int postingsWithSkill,
        int postingsTotal
    ) {}

    /**
     * Reads job_posting and posting_skill, aggregates counts, deletes demand_monthly,
     * and batch re-inserts aggregate rows in sorted order (district, role, skill, month).
     *
     * @return count of inserted demand_monthly rows
     */
    @Transactional
    public long rebuild() {
        log.info("Starting demand_monthly rebuild from database postings...");

        // 1. Read job_posting metadata and compute cell totals
        Map<Long, PostingMeta> postingMetas = new TreeMap<>();
        Map<CellKey, Integer> cellTotals = new TreeMap<>();

        jdbcTemplate.query(
            "SELECT id, role_id, district_id, posted_on FROM job_posting",
            rs -> {
                long postingId = rs.getLong("id");
                long roleId = rs.getLong("role_id");
                long districtId = rs.getLong("district_id");
                Date postedOnDate = rs.getDate("posted_on");
                LocalDate postedOn = postedOnDate.toLocalDate();
                String month = String.format("%04d-%02d", postedOn.getYear(), postedOn.getMonthValue());

                postingMetas.put(postingId, new PostingMeta(roleId, districtId, month));
                cellTotals.merge(new CellKey(districtId, roleId, month), 1, Integer::sum);
            }
        );

        // 2. Read posting_skill, build role skill universe, and aggregate skill counts
        Map<Long, TreeSet<Long>> roleUniverse = new TreeMap<>();
        Map<SkillKey, Integer> skillCounts = new TreeMap<>();

        jdbcTemplate.query(
            "SELECT posting_id, skill_id FROM posting_skill",
            rs -> {
                long postingId = rs.getLong("posting_id");
                long skillId = rs.getLong("skill_id");

                PostingMeta meta = postingMetas.get(postingId);
                if (meta != null) {
                    roleUniverse.computeIfAbsent(meta.roleId(), k -> new TreeSet<>()).add(skillId);
                    skillCounts.merge(new SkillKey(meta.districtId(), meta.roleId(), skillId, meta.month()), 1, Integer::sum);
                }
            }
        );

        // 3. Construct rows: for every cell with postings_total > 0, emit row for every skill in role's universe
        List<DemandMonthlyRow> rows = new ArrayList<>();

        for (Map.Entry<CellKey, Integer> entry : cellTotals.entrySet()) {
            CellKey cell = entry.getKey();
            int total = entry.getValue();
            if (total <= 0) {
                continue;
            }

            TreeSet<Long> universe = roleUniverse.get(cell.roleId());
            if (universe == null || universe.isEmpty()) {
                continue;
            }

            for (Long skillId : universe) {
                int withSkill = skillCounts.getOrDefault(
                    new SkillKey(cell.districtId(), cell.roleId(), skillId, cell.month()),
                    0
                );
                rows.add(new DemandMonthlyRow(
                    cell.districtId(),
                    cell.roleId(),
                    skillId,
                    cell.month(),
                    withSkill,
                    total
                ));
            }
        }

        // Sort rows deterministically by (district, role, skill, month)
        rows.sort(Comparator
            .comparingLong(DemandMonthlyRow::districtId)
            .thenComparingLong(DemandMonthlyRow::roleId)
            .thenComparingLong(DemandMonthlyRow::skillId)
            .thenComparing(DemandMonthlyRow::month)
        );

        // 4. Delete existing rows
        jdbcTemplate.update("DELETE FROM demand_monthly");

        // 5. Batch insert
        jdbcTemplate.batchUpdate(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (?, ?, ?, ?, ?, ?)",
            rows,
            BATCH_SIZE,
            (ps, row) -> {
                ps.setLong(1, row.districtId());
                ps.setLong(2, row.roleId());
                ps.setLong(3, row.skillId());
                ps.setString(4, row.month());
                ps.setInt(5, row.postingsWithSkill());
                ps.setInt(6, row.postingsTotal());
            }
        );

        log.info("Rebuilt demand_monthly: inserted {} aggregate rows across {} active cells",
            rows.size(), cellTotals.size());
        return rows.size();
    }
}
