package com.skillpath.backend.generator;

import com.skillpath.backend.service.OversupplyService;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.BitSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rebuilds the demand_monthly aggregate table from job_posting and posting_skill data.
 * Pure aggregation is performed using compact primitive arrays, binary search lookups,
 * and streaming batch inserts in deterministic (district, role, skill, month) order.
 */
@Component
public class DemandMonthlyRebuilder {

    private static final Logger log = LoggerFactory.getLogger(DemandMonthlyRebuilder.class);
    private static final int BATCH_SIZE = 5000;

    private final JdbcTemplate jdbcTemplate;
    private final OversupplyService oversupplyService;

    public DemandMonthlyRebuilder(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, null);
    }

    @Autowired
    public DemandMonthlyRebuilder(
        JdbcTemplate jdbcTemplate,
        @Autowired(required = false) OversupplyService oversupplyService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.oversupplyService = oversupplyService;
    }

    public record DemandMonthlyRow(
        long districtId,
        long roleId,
        long skillId,
        String month,
        int postingsWithSkill,
        int postingsTotal
    ) {}

    private static String formatMonth(LocalDate date) {
        int y = date.getYear();
        int m = date.getMonthValue();
        if (m < 10) {
            return y + "-0" + m;
        }
        return y + "-" + m;
    }

    /**
     * Reads job_posting and posting_skill, aggregates counts using compact primitive arrays,
     * deletes demand_monthly, and streams aggregate rows in sorted order (district, role, skill, month).
     *
     * @return count of inserted demand_monthly rows
     */
    @Transactional
    public long rebuild() {
        if (oversupplyService != null) {
            oversupplyService.clearCache();
        }
        log.info("Starting demand_monthly rebuild from database postings...");

        // 1. Collect distinct dimensions with lightweight queries
        TreeSet<Long> districtSet = new TreeSet<>();
        jdbcTemplate.query("SELECT DISTINCT district_id FROM job_posting", rs -> {
            districtSet.add(rs.getLong(1));
        });

        if (districtSet.isEmpty()) {
            jdbcTemplate.update("DELETE FROM demand_monthly");
            return 0;
        }

        TreeSet<Long> roleSet = new TreeSet<>();
        jdbcTemplate.query("SELECT DISTINCT role_id FROM job_posting", rs -> {
            roleSet.add(rs.getLong(1));
        });

        TreeSet<String> monthSet = new TreeSet<>();
        jdbcTemplate.query("SELECT DISTINCT SUBSTRING(CAST(posted_on AS VARCHAR(10)), 1, 7) FROM job_posting", rs -> {
            monthSet.add(rs.getString(1));
        });

        Long maxIdObj = jdbcTemplate.queryForObject("SELECT MAX(id) FROM job_posting", Long.class);
        long maxPostingId = maxIdObj != null ? maxIdObj : 0L;

        // Distinct dimension arrays in sorted order
        long[] uniqueDistricts = districtSet.stream().mapToLong(Long::longValue).toArray();
        long[] uniqueRoles = roleSet.stream().mapToLong(Long::longValue).toArray();
        String[] uniqueMonths = monthSet.toArray(new String[0]);

        int numDistricts = uniqueDistricts.length;
        int numRoles = uniqueRoles.length;
        int numMonths = uniqueMonths.length;
        int numCells = numDistricts * numRoles * numMonths;

        // Map postingId -> cellIndex, and compute cellTotals
        int[] cellTotals = new int[numCells];
        boolean useDirectArray = maxPostingId <= 200_000;
        final int[] postingCellArray = useDirectArray ? new int[(int) maxPostingId + 1] : null;
        final Map<Long, Integer> postingCellMap = useDirectArray ? null : new TreeMap<>();

        jdbcTemplate.query(
            "SELECT id, role_id, district_id, posted_on FROM job_posting",
            rs -> {
                long id = rs.getLong("id");
                long roleId = rs.getLong("role_id");
                long districtId = rs.getLong("district_id");
                Date postedOnDate = rs.getDate("posted_on");
                String month = formatMonth(postedOnDate.toLocalDate());

                int d = Arrays.binarySearch(uniqueDistricts, districtId);
                int r = Arrays.binarySearch(uniqueRoles, roleId);
                int m = Arrays.binarySearch(uniqueMonths, month);
                int cellIdx = (d * numRoles + r) * numMonths + m;

                cellTotals[cellIdx]++;
                if (useDirectArray) {
                    postingCellArray[(int) id] = cellIdx;
                } else {
                    postingCellMap.put(id, cellIdx);
                }
            }
        );

        // 2. Read posting_skill to collect distinct skills and build counts
        TreeSet<Long> skillSet = new TreeSet<>();
        jdbcTemplate.query("SELECT DISTINCT skill_id FROM posting_skill", rs -> {
            skillSet.add(rs.getLong(1));
        });

        long[] uniqueSkills = skillSet.stream().mapToLong(Long::longValue).toArray();
        int numSkills = uniqueSkills.length;

        int[] skillCounts = new int[numCells * numSkills];
        BitSet[] roleUniverses = new BitSet[numRoles];
        for (int r = 0; r < numRoles; r++) {
            roleUniverses[r] = new BitSet(numSkills);
        }

        jdbcTemplate.query(
            "SELECT posting_id, skill_id FROM posting_skill",
            rs -> {
                long postingId = rs.getLong("posting_id");
                long skillId = rs.getLong("skill_id");

                int cellIdx;
                if (useDirectArray) {
                    if (postingId >= postingCellArray.length) return;
                    cellIdx = postingCellArray[(int) postingId];
                } else {
                    Integer c = postingCellMap.get(postingId);
                    if (c == null) return;
                    cellIdx = c;
                }

                int s = Arrays.binarySearch(uniqueSkills, skillId);
                if (s < 0) return;

                int roleIdx = (cellIdx / numMonths) % numRoles;
                roleUniverses[roleIdx].set(s);
                skillCounts[cellIdx * numSkills + s]++;
            }
        );

        if (postingCellMap != null) {
            postingCellMap.clear();
        }

        // 3. Delete existing rows
        jdbcTemplate.update("DELETE FROM demand_monthly");

        // 4. Stream rows in sorted order (district, role, skill, month) in batches of BATCH_SIZE
        String insertSql = "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (?, ?, ?, ?, ?, ?)";
        List<DemandMonthlyRow> batchBuffer = new ArrayList<>(BATCH_SIZE);
        long totalInserted = 0;

        for (int d = 0; d < numDistricts; d++) {
            long districtId = uniqueDistricts[d];
            for (int r = 0; r < numRoles; r++) {
                long roleId = uniqueRoles[r];
                BitSet universe = roleUniverses[r];
                if (universe.isEmpty()) continue;

                // Check if this (district, role) has any active cell
                boolean hasActiveCell = false;
                for (int m = 0; m < numMonths; m++) {
                    int cellIdx = (d * numRoles + r) * numMonths + m;
                    if (cellTotals[cellIdx] > 0) {
                        hasActiveCell = true;
                        break;
                    }
                }
                if (!hasActiveCell) continue;

                for (int s = 0; s < numSkills; s++) {
                    if (!universe.get(s)) continue;
                    long skillId = uniqueSkills[s];

                    for (int m = 0; m < numMonths; m++) {
                        int cellIdx = (d * numRoles + r) * numMonths + m;
                        int total = cellTotals[cellIdx];
                        if (total <= 0) continue;

                        int withSkill = skillCounts[cellIdx * numSkills + s];
                        String month = uniqueMonths[m];

                        batchBuffer.add(new DemandMonthlyRow(districtId, roleId, skillId, month, withSkill, total));
                        totalInserted++;

                        if (batchBuffer.size() >= BATCH_SIZE) {
                            insertBatch(insertSql, batchBuffer);
                            batchBuffer.clear();
                        }
                    }
                }
            }
        }

        if (!batchBuffer.isEmpty()) {
            insertBatch(insertSql, batchBuffer);
            batchBuffer.clear();
        }

        log.info("Rebuilt demand_monthly: inserted {} aggregate rows across active cells", totalInserted);
        if (oversupplyService != null) {
            oversupplyService.clearCache();
        }
        return totalInserted;
    }

    private void insertBatch(String sql, List<DemandMonthlyRow> batch) {
        jdbcTemplate.batchUpdate(
            sql,
            batch,
            batch.size(),
            (ps, row) -> {
                ps.setLong(1, row.districtId());
                ps.setLong(2, row.roleId());
                ps.setLong(3, row.skillId());
                ps.setString(4, row.month());
                ps.setInt(5, row.postingsWithSkill());
                ps.setInt(6, row.postingsTotal());
            }
        );
    }
}
