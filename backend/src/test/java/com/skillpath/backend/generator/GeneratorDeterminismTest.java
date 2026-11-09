package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class GeneratorDeterminismTest {

    private static final List<String> ALL_7_TABLES = List.of(
        "skill",
        "skill_alias",
        "role",
        "district",
        "job_posting",
        "posting_skill",
        "demand_monthly"
    );

    @Autowired
    private DataGenerator dataGenerator;

    @Autowired
    private DemandMonthlyRebuilder demandMonthlyRebuilder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        cleanAllTables();
    }

    @AfterEach
    void tearDown() {
        cleanAllTables();
    }

    /**
     * Test-only cleanup helper deleting in reverse FK order across all 7 generator-owned tables.
     */
    private void cleanAllTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    @Test
    void pureGenerateReferenceDataCalledTwiceGivesEqualResults() {
        ReferenceData refData1 = dataGenerator.generateReferenceData();
        ReferenceData refData2 = dataGenerator.generateReferenceData();

        assertThat(refData1).isEqualTo(refData2);
        assertThat(refData1.skills()).hasSameElementsAs(refData2.skills());
        assertThat(refData1.aliases()).hasSameElementsAs(refData2.aliases());
        assertThat(refData1.roles()).hasSameElementsAs(refData2.roles());
        assertThat(refData1.districts()).hasSameElementsAs(refData2.districts());

        // Validate explicit sequential IDs starting at 1
        assertThat(refData1.skills().get(0).id()).isEqualTo(1L);
        assertThat(refData1.skills().get(refData1.skills().size() - 1).id()).isEqualTo((long) refData1.skills().size());
        assertThat(refData1.roles().get(0).id()).isEqualTo(1L);
        assertThat(refData1.districts().get(0).id()).isEqualTo(1L);

        // All skills active=true
        for (ReferenceData.SkillRow skill : refData1.skills()) {
            assertThat(skill.active()).isTrue();
        }
    }

    @Test
    void runOnEmptyDatabaseGeneratesIdenticalChecksumsAcrossCleanAndReRun() {
        dataGenerator.run();
        String checksum1 = DatasetChecksum.calculate(jdbcTemplate, ALL_7_TABLES);
        assertThat(checksum1).isNotBlank();

        cleanAllTables();

        dataGenerator.run();
        String checksum2 = DatasetChecksum.calculate(jdbcTemplate, ALL_7_TABLES);

        assertThat(checksum2).isEqualTo(checksum1);
    }

    @Test
    void differentSeedGivesDifferentPostingChecksum() {
        dataGenerator.run(42L);
        String postingChecksum42 = DatasetChecksum.calculate(
            jdbcTemplate,
            List.of("job_posting", "posting_skill")
        );

        cleanAllTables();

        dataGenerator.run(99L);
        String postingChecksum99 = DatasetChecksum.calculate(
            jdbcTemplate,
            List.of("job_posting", "posting_skill")
        );

        assertThat(postingChecksum99).isNotEqualTo(postingChecksum42);
    }

    @Test
    void demandMonthlyAggregationCorrectnessAndInvariants() {
        dataGenerator.run();

        record CellKey(long districtId, long roleId, String month) implements Comparable<CellKey> {
            @Override
            public int compareTo(CellKey o) {
                int c = Long.compare(this.districtId, o.districtId);
                if (c != 0) return c;
                c = Long.compare(this.roleId, o.roleId);
                if (c != 0) return c;
                return this.month.compareTo(o.month);
            }
        }

        record DemandKey(long districtId, long roleId, long skillId, String month) implements Comparable<DemandKey> {
            @Override
            public int compareTo(DemandKey o) {
                int c = Long.compare(this.districtId, o.districtId);
                if (c != 0) return c;
                c = Long.compare(this.roleId, o.roleId);
                if (c != 0) return c;
                c = Long.compare(this.skillId, o.skillId);
                if (c != 0) return c;
                return this.month.compareTo(o.month);
            }
        }

        // 1. Read job_posting to get expected cell counts
        Map<Long, CellKey> postingToCell = new TreeMap<>();
        Map<CellKey, Integer> expectedCellTotals = new TreeMap<>();
        jdbcTemplate.query("SELECT id, role_id, district_id, posted_on FROM job_posting", rs -> {
            long pId = rs.getLong("id");
            long rId = rs.getLong("role_id");
            long dId = rs.getLong("district_id");
            Date date = rs.getDate("posted_on");
            LocalDate ld = date.toLocalDate();
            String month = String.format("%04d-%02d", ld.getYear(), ld.getMonthValue());

            CellKey cell = new CellKey(dId, rId, month);
            postingToCell.put(pId, cell);
            expectedCellTotals.merge(cell, 1, Integer::sum);
        });

        // 2. Read posting_skill to derive expected skill counts and role universe
        Map<DemandKey, Integer> expectedSkillCounts = new TreeMap<>();
        Map<Long, Set<Long>> expectedRoleUniverse = new TreeMap<>();
        Map<Long, Integer> expectedSkillTotalCount = new TreeMap<>();

        jdbcTemplate.query("SELECT posting_id, skill_id FROM posting_skill", rs -> {
            long pId = rs.getLong("posting_id");
            long sId = rs.getLong("skill_id");
            CellKey cell = postingToCell.get(pId);
            if (cell != null) {
                expectedSkillCounts.merge(new DemandKey(cell.districtId(), cell.roleId(), sId, cell.month()), 1, Integer::sum);
                expectedRoleUniverse.computeIfAbsent(cell.roleId(), k -> new TreeSet<>()).add(sId);
            }
            expectedSkillTotalCount.merge(sId, 1, Integer::sum);
        });

        // 3. Verify demand_monthly rows
        Map<CellKey, Integer> actualCellRowCount = new TreeMap<>();
        Map<Long, Integer> actualSkillSum = new TreeMap<>();
        int zeroCountRows = 0;

        List<DemandMonthlyRebuilder.DemandMonthlyRow> demandRows = jdbcTemplate.query(
            "SELECT district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total FROM demand_monthly",
            (rs, rowNum) -> new DemandMonthlyRebuilder.DemandMonthlyRow(
                rs.getLong("district_id"),
                rs.getLong("role_id"),
                rs.getLong("skill_id"),
                rs.getString("month"),
                rs.getInt("postings_with_skill"),
                rs.getInt("postings_total")
            )
        );

        for (DemandMonthlyRebuilder.DemandMonthlyRow r : demandRows) {
            CellKey cell = new CellKey(r.districtId(), r.roleId(), r.month());
            actualCellRowCount.merge(cell, 1, Integer::sum);
            actualSkillSum.merge(r.skillId(), r.postingsWithSkill(), Integer::sum);

            // Per cell, postings_total equals count of job_posting rows in that cell
            int expectedTotal = expectedCellTotals.get(cell);
            assertThat(r.postingsTotal())
                .as("postings_total for cell %s", cell)
                .isEqualTo(expectedTotal);

            // postings_with_skill equals matching posting_skill count
            int expectedWithSkill = expectedSkillCounts.getOrDefault(
                new DemandKey(r.districtId(), r.roleId(), r.skillId(), r.month()),
                0
            );
            assertThat(r.postingsWithSkill())
                .as("postings_with_skill for skill %d in cell %s", r.skillId(), cell)
                .isEqualTo(expectedWithSkill);

            // postings_with_skill <= postings_total
            assertThat(r.postingsWithSkill()).isLessThanOrEqualTo(r.postingsTotal());

            if (r.postingsWithSkill() == 0) {
                zeroCountRows++;
            }
        }

        // Zero-count rows exist
        assertThat(zeroCountRows)
            .as("Demand monthly must include zero-count rows for skills in role universe")
            .isGreaterThan(0);

        // Row count per cell equals the role's universe size
        for (Map.Entry<CellKey, Integer> entry : expectedCellTotals.entrySet()) {
            CellKey cell = entry.getKey();
            int universeSize = expectedRoleUniverse.getOrDefault(cell.roleId(), Set.of()).size();
            int actualRowCount = actualCellRowCount.getOrDefault(cell, 0);
            assertThat(actualRowCount)
                .as("Row count for cell %s must equal role's universe size %d", cell, universeSize)
                .isEqualTo(universeSize);
        }

        // SUM(postings_with_skill) per skill equals COUNT(posting_skill) per skill
        for (Map.Entry<Long, Integer> entry : expectedSkillTotalCount.entrySet()) {
            long sId = entry.getKey();
            int expectedCount = entry.getValue();
            int actualSum = actualSkillSum.getOrDefault(sId, 0);
            assertThat(actualSum)
                .as("SUM(postings_with_skill) for skill %d must equal COUNT(posting_skill)", sId)
                .isEqualTo(expectedCount);
        }

        // Calling rebuild twice leaves an identical table checksum
        String checksumBefore = DatasetChecksum.calculate(jdbcTemplate, List.of("demand_monthly"));
        demandMonthlyRebuilder.rebuild();
        String checksumAfter = DatasetChecksum.calculate(jdbcTemplate, List.of("demand_monthly"));
        assertThat(checksumAfter).isEqualTo(checksumBefore);
    }

    @Test
    void runOnNonEmptyDatabaseThrowsIllegalStateExceptionAndLeavesTablesUnchanged() {
        dataGenerator.run();
        String checksumBefore = DatasetChecksum.calculate(jdbcTemplate, ALL_7_TABLES);

        assertThatThrownBy(() -> dataGenerator.run())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Database reference or posting tables are not empty");

        String checksumAfter = DatasetChecksum.calculate(jdbcTemplate, ALL_7_TABLES);
        assertThat(checksumAfter).isEqualTo(checksumBefore);
    }
}
