package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class DemandMonthlyRebuilderTest {

    private static final long EXPECTED_ROW_COUNT_SEED42 = 128205L;
    private static final long EXPECTED_SUM_WITH_SKILL_SEED42 = 284188L;
    private static final long EXPECTED_SUM_TOTAL_SEED42 = 522502L;
    private static final String EXPECTED_ROW_HASH_SEED42 = "276eb2af28fba8b3f04c16c7622524801245cc19fee5fed80e7e7f3595c924ce";
    private static final String EXPECTED_DATASET_CHECKSUM_SEED42 = "c0cac5ac20e81e4f98b60fbd702b2b2dba6e2c6fc5d6b0364c2c91ae67a75fb3";

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

    private void cleanAllTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    private String calculateRowOrderedHash() {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String sql = "SELECT district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total "
                + "FROM demand_monthly ORDER BY district_id, role_id, skill_id, \"month\"";
            jdbcTemplate.query(sql, rs -> {
                String line = rs.getLong(1) + "|"
                    + rs.getLong(2) + "|"
                    + rs.getLong(3) + "|"
                    + rs.getString(4) + "|"
                    + rs.getInt(5) + "|"
                    + rs.getInt(6) + "\n";
                digest.update(line.getBytes(StandardCharsets.UTF_8));
            });
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    @Test
    void rebuildOnSeed42MatchesExactFingerprint() {
        dataGenerator.run(42L);

        Long rowCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM demand_monthly", Long.class);
        Long sumPostingsWithSkill = jdbcTemplate.queryForObject("SELECT SUM(postings_with_skill) FROM demand_monthly", Long.class);
        Long sumPostingsTotal = jdbcTemplate.queryForObject("SELECT SUM(postings_total) FROM demand_monthly", Long.class);
        String rowHash = calculateRowOrderedHash();
        String datasetChecksum = DatasetChecksum.calculate(jdbcTemplate, List.of("demand_monthly"));

        assertThat(rowCount).isEqualTo(EXPECTED_ROW_COUNT_SEED42);
        assertThat(sumPostingsWithSkill).isEqualTo(EXPECTED_SUM_WITH_SKILL_SEED42);
        assertThat(sumPostingsTotal).isEqualTo(EXPECTED_SUM_TOTAL_SEED42);
        assertThat(rowHash).isEqualTo(EXPECTED_ROW_HASH_SEED42);
        assertThat(datasetChecksum).isEqualTo(EXPECTED_DATASET_CHECKSUM_SEED42);

        // Calling rebuild again directly cleans and produces identical counts and hash
        long secondRebuildCount = demandMonthlyRebuilder.rebuild();
        assertThat(secondRebuildCount).isEqualTo(EXPECTED_ROW_COUNT_SEED42);
        assertThat(calculateRowOrderedHash()).isEqualTo(EXPECTED_ROW_HASH_SEED42);
    }

    @Test
    void tinyHandBuiltDatasetKnownAnswersAndZeroCountInvariants() {
        // 2 districts
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District North', 'State North')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District South', 'State South')");

        // 2 roles
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (10, 'Software Engineer', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (20, 'Data Analyst', 'IT')");

        // 3 skills: Skill 100, 101, 102
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (100, 'Java', 'Backend', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (101, 'Python', 'Backend', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (102, 'Tableau', 'Analytics', true)");

        // Postings:
        // District 1, Role 10:
        //   Month 2026-05: 2 postings (posting 1: Skill 100; posting 2: Skill 100) -> neither has Skill 101
        //   Month 2026-06: 1 posting (posting 3: Skill 100)
        // District 2, Role 10:
        //   Month 2026-05: 1 posting (posting 4: Skill 101) -> seen ONLY in District 2
        // District 1, Role 20:
        //   Month 2026-05: 1 posting (posting 5: Skill 102)

        jdbcTemplate.execute("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (1, 10, 1, DATE '2026-05-10', 'Mid')");
        jdbcTemplate.execute("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (2, 10, 1, DATE '2026-05-15', 'Senior')");
        jdbcTemplate.execute("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (3, 10, 1, DATE '2026-06-01', 'Entry')");
        jdbcTemplate.execute("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (4, 10, 2, DATE '2026-05-20', 'Mid')");
        jdbcTemplate.execute("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (5, 20, 1, DATE '2026-05-18', 'Entry')");

        // posting_skill
        jdbcTemplate.execute("INSERT INTO posting_skill (posting_id, skill_id, required_level) VALUES (1, 100, 'Mid')");
        jdbcTemplate.execute("INSERT INTO posting_skill (posting_id, skill_id, required_level) VALUES (2, 100, 'Senior')");
        jdbcTemplate.execute("INSERT INTO posting_skill (posting_id, skill_id, required_level) VALUES (3, 100, 'Entry')");
        jdbcTemplate.execute("INSERT INTO posting_skill (posting_id, skill_id, required_level) VALUES (4, 101, 'Mid')");
        jdbcTemplate.execute("INSERT INTO posting_skill (posting_id, skill_id, required_level) VALUES (5, 102, 'Entry')");

        // Role 10's universe across all postings is {100, 101}
        // Role 20's universe across all postings is {102}
        // Notice:
        // - In District 1, Role 10 only saw Skill 100. Skill 101 was ONLY seen in District 2.
        //   Yet Skill 101 must appear in District 1 for Role 10 with postings_with_skill = 0.
        // - In District 2, Role 10 only saw Skill 101. Skill 100 was ONLY seen in District 1.
        //   Yet Skill 100 must appear in District 2 for Role 10 with postings_with_skill = 0.

        long rowsInserted = demandMonthlyRebuilder.rebuild();

        // Cells:
        // (D1, R10, 2026-05): 2 postings, universe size 2 -> 2 rows
        // (D1, R10, 2026-06): 1 posting,  universe size 2 -> 2 rows
        // (D2, R10, 2026-05): 1 posting,  universe size 2 -> 2 rows
        // (D1, R20, 2026-05): 1 posting,  universe size 1 -> 1 row
        // Total expected rows = 2 + 2 + 2 + 1 = 7 rows
        assertThat(rowsInserted).isEqualTo(7L);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total "
                + "FROM demand_monthly ORDER BY district_id, role_id, skill_id, \"month\""
        );
        assertThat(rows).hasSize(7);

        // Helper to find a specific row
        // 1. Check District 1, Role 10, Month 2026-05:
        //    postings_total must be 2
        //    Skill 100 (Java): postings_with_skill = 2
        //    Skill 101 (Python, seen only in District 2): postings_with_skill = 0
        Map<String, Object> d1R10S100M05 = findRow(rows, 1L, 10L, 100L, "2026-05");
        assertThat(d1R10S100M05.get("postings_total")).isEqualTo(2);
        assertThat(d1R10S100M05.get("postings_with_skill")).isEqualTo(2);

        Map<String, Object> d1R10S101M05 = findRow(rows, 1L, 10L, 101L, "2026-05");
        assertThat(d1R10S101M05.get("postings_total")).isEqualTo(2);
        assertThat(d1R10S101M05.get("postings_with_skill")).isEqualTo(0);

        // 2. Check District 1, Role 10, Month 2026-06:
        //    postings_total must be 1
        //    Skill 100: postings_with_skill = 1
        //    Skill 101: postings_with_skill = 0
        Map<String, Object> d1R10S100M06 = findRow(rows, 1L, 10L, 100L, "2026-06");
        assertThat(d1R10S100M06.get("postings_total")).isEqualTo(1);
        assertThat(d1R10S100M06.get("postings_with_skill")).isEqualTo(1);

        Map<String, Object> d1R10S101M06 = findRow(rows, 1L, 10L, 101L, "2026-06");
        assertThat(d1R10S101M06.get("postings_total")).isEqualTo(1);
        assertThat(d1R10S101M06.get("postings_with_skill")).isEqualTo(0);

        // 3. Check District 2, Role 10, Month 2026-05:
        //    postings_total must be 1
        //    Skill 100 (seen only in District 1): postings_with_skill = 0
        //    Skill 101: postings_with_skill = 1
        Map<String, Object> d2R10S100M05 = findRow(rows, 2L, 10L, 100L, "2026-05");
        assertThat(d2R10S100M05.get("postings_total")).isEqualTo(1);
        assertThat(d2R10S100M05.get("postings_with_skill")).isEqualTo(0);

        Map<String, Object> d2R10S101M05 = findRow(rows, 2L, 10L, 101L, "2026-05");
        assertThat(d2R10S101M05.get("postings_total")).isEqualTo(1);
        assertThat(d2R10S101M05.get("postings_with_skill")).isEqualTo(1);

        // 4. Check District 1, Role 20, Month 2026-05:
        //    postings_total must be 1
        //    Skill 102: postings_with_skill = 1
        Map<String, Object> d1R20S102M05 = findRow(rows, 1L, 20L, 102L, "2026-05");
        assertThat(d1R20S102M05.get("postings_total")).isEqualTo(1);
        assertThat(d1R20S102M05.get("postings_with_skill")).isEqualTo(1);

        // Role 20's universe does NOT contain Skill 100 or 101
        assertThat(rows.stream().noneMatch(r ->
            ((Number) r.get("role_id")).longValue() == 20L
                && (((Number) r.get("skill_id")).longValue() == 100L || ((Number) r.get("skill_id")).longValue() == 101L)
        )).isTrue();
    }

    private Map<String, Object> findRow(List<Map<String, Object>> rows, long districtId, long roleId, long skillId, String month) {
        return rows.stream()
            .filter(r -> ((Number) r.get("district_id")).longValue() == districtId
                && ((Number) r.get("role_id")).longValue() == roleId
                && ((Number) r.get("skill_id")).longValue() == skillId
                && month.equals(r.get("month")))
            .findFirst()
            .orElseThrow(() -> new AssertionError(String.format("Row not found for (%d, %d, %d, %s)", districtId, roleId, skillId, month)));
    }
}
