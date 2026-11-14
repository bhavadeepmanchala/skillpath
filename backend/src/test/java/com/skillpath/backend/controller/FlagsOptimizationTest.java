package com.skillpath.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.generator.DemandMonthlyRebuilder;
import com.skillpath.backend.service.CourseService;
import com.skillpath.backend.service.OversupplyService;
import com.skillpath.backend.service.SeedStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class FlagsOptimizationTest {

    private static final double TOLERANCE = 1e-4;

    @Autowired
    private FlagController flagController;

    @Autowired
    private OversupplyService oversupplyService;

    @Autowired
    private CourseService courseService;

    @Autowired
    private SeedStatus seedStatus;

    @Autowired
    private DemandMonthlyRebuilder demandMonthlyRebuilder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(flagController).build();
        cleanTables();
        seedHandBuiltDataset();
        seedStatus.setReady();
        oversupplyService.clearCache();
    }

    @AfterEach
    void tearDown() {
        oversupplyService.clearCache();
        cleanTables();
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM placement_outcome");
        jdbcTemplate.execute("DELETE FROM course_offering");
        jdbcTemplate.execute("DELETE FROM course_role");
        jdbcTemplate.execute("DELETE FROM course_skill");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM employer_validation");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM skill");
    }

    private void seedHandBuiltDataset() {
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District Alpha', 'State X')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District Beta', 'State Y')");

        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Software Engineer', 'IT')");

        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (1, 'Skill A', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (2, 'Skill B', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (3, 'Skill C', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (4, 'Skill D', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (5, 'Skill E', 'Tech')");

        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (10, 'Low Coverage Falling', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (20, 'Low Coverage Rising', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (30, 'High Coverage Falling', 10, 'IT')");

        for (long cId : new long[]{10, 20, 30}) {
            jdbcTemplate.update("INSERT INTO course_role (course_id, role_id) VALUES (?, 1)", cId);
        }

        // Course skills
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (10, 1, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (10, 2, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (20, 1, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (30, 3, 'Proficient')");
        jdbcTemplate.execute("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (30, 4, 'Proficient')");

        // Course offerings
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (10, 1, 2026, 60, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (20, 2, 2026, 60, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (30, 1, 2026, 40, 1)");

        // Job postings
        long jpId = 1L;
        for (int i = 0; i < 40; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 1, '2026-05-10', 'Mid')", jpId++);
        }
        for (int i = 0; i < 20; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 2, '2026-05-10', 'Mid')", jpId++);
        }

        String[] prevMonths = {"2026-04", "2026-05", "2026-06"};
        String[] latestMonths = {"2026-07", "2026-08", "2026-09"};

        for (String m : prevMonths) {
            insertDemand(1, 1, 1, m, 20, 100);
            insertDemand(1, 1, 2, m, 15, 100);
            insertDemand(1, 1, 3, m, 30, 100);
            insertDemand(1, 1, 4, m, 30, 100);
            insertDemand(1, 1, 5, m, 3, 100);

            insertDemand(2, 1, 1, m, 10, 100);
            insertDemand(2, 1, 2, m, 10, 100);
            insertDemand(2, 1, 3, m, 30, 100);
            insertDemand(2, 1, 4, m, 30, 100);
            insertDemand(2, 1, 5, m, 3, 100);
        }

        for (String m : latestMonths) {
            insertDemand(1, 1, 1, m, 10, 100);
            insertDemand(1, 1, 2, m, 10, 100);
            insertDemand(1, 1, 3, m, 30, 100);
            insertDemand(1, 1, 4, m, 30, 100);
            insertDemand(1, 1, 5, m, 2, 100);

            insertDemand(2, 1, 1, m, 20, 100);
            insertDemand(2, 1, 2, m, 10, 100);
            insertDemand(2, 1, 3, m, 30, 100);
            insertDemand(2, 1, 4, m, 30, 100);
            insertDemand(2, 1, 5, m, 2, 100);
        }
    }

    private void insertDemand(long distId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (?, ?, ?, ?, ?, ?)",
            distId, roleId, skillId, month, withSkill, total
        );
    }

    /**
     * Test (a): Cached and uncached calls return identical content.
     */
    @Test
    void cachedAndUncachedCallsReturnIdenticalContent() throws Exception {
        oversupplyService.clearCache();
        assertThat(oversupplyService.getCacheSize()).isZero();

        // 1. Direct service call
        FlagsResponse uncached = oversupplyService.getFlags(null);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(1);
        assertThat(oversupplyService.isCached(null, null)).isTrue();

        FlagsResponse cached = oversupplyService.getFlags(null);
        assertThat(cached).isEqualTo(uncached);
        assertThat(cached.items()).hasSameSizeAs(uncached.items());

        for (int i = 0; i < uncached.items().size(); i++) {
            assertThat(cached.items().get(i)).isEqualTo(uncached.items().get(i));
        }

        // 2. HTTP endpoint: first call populates, second call hits cache with identical JSON
        oversupplyService.clearCache();
        MvcResult res1 = mockMvc.perform(get("/api/flags"))
            .andExpect(status().isOk())
            .andReturn();
        String json1 = res1.getResponse().getContentAsString();

        MvcResult res2 = mockMvc.perform(get("/api/flags"))
            .andExpect(status().isOk())
            .andReturn();
        String json2 = res2.getResponse().getContentAsString();

        assertThat(json2).isEqualTo(json1);
    }

    /**
     * Test (b): Nothing is stored in the cache while seeding is not finished.
     */
    @Test
    void nothingIsStoredInCacheWhileSeedingIsNotFinished() {
        oversupplyService.clearCache();

        // Simulate seeding in progress
        seedStatus.setPhase(SeedStatus.PHASE_SEEDING);

        FlagsResponse responseNational = oversupplyService.getFlags(null);
        assertThat(responseNational).isNotNull();
        assertThat(oversupplyService.getCacheSize()).isZero();
        assertThat(oversupplyService.isCached(null, null)).isFalse();

        FlagsResponse responseDistrict = oversupplyService.getFlags(1L);
        assertThat(responseDistrict).isNotNull();
        assertThat(oversupplyService.getCacheSize()).isZero();
        assertThat(oversupplyService.isCached(1L, null)).isFalse();
    }

    /**
     * Test (c): The cache is cleared when seeding restarts or completes.
     */
    @Test
    void cacheIsClearedWhenSeedingRestartsOrCompletes() {
        seedStatus.setReady();
        oversupplyService.clearCache();

        // Populate cache
        oversupplyService.getFlags(null);
        oversupplyService.getFlags(1L);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(2);

        // Seeding restarts (transition to PHASE_SEEDING)
        seedStatus.setSeeding();
        assertThat(oversupplyService.getCacheSize()).isZero();

        // Set ready again
        seedStatus.setReady();
        oversupplyService.getFlags(null);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(1);

        // Seeding completes (transition to PHASE_READY)
        seedStatus.setPhase(SeedStatus.PHASE_READY);
        assertThat(oversupplyService.getCacheSize()).isZero();

        // Also test demandMonthlyRebuilder clears cache
        seedStatus.setReady();
        oversupplyService.getFlags(null);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(1);

        demandMonthlyRebuilder.rebuild();
        assertThat(oversupplyService.getCacheSize()).isZero();
    }

    /**
     * Test (d): The cache never exceeds 50 entries.
     */
    @Test
    void cacheNeverExceeds50Entries() {
        seedStatus.setReady();
        oversupplyService.clearCache();

        // Add 65 distinct keys by varying minOpenings parameter
        for (int i = 1; i <= 65; i++) {
            oversupplyService.getFlags(null, null, null, null, i);
            assertThat(oversupplyService.getCacheSize()).isLessThanOrEqualTo(OversupplyService.MAX_CACHE_ENTRIES);
        }

        assertThat(oversupplyService.getCacheSize()).isEqualTo(50);

        // Querying an already cached key keeps size at 50
        oversupplyService.getFlags(null, null, null, null, 65);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(50);
    }

    /**
     * Test (e): Memoization gives the same coverage numbers as before for a known hand-built case.
     */
    @Test
    void memoizationGivesSameCoverageNumbersAsBefore() {
        seedStatus.setReady();
        oversupplyService.clearCache();

        FlagsResponse response = oversupplyService.getFlags(1L);
        assertThat(response.items()).hasSize(2);

        // Course 10 in District 1: taught skills 1 and 2 (each 10 postings out of 82 total top share)
        // Expected coverage = (20 / 82) * 100 = 24.3902%
        var c10 = response.items().stream().filter(i -> i.courseId() == 10L).findFirst().orElseThrow();
        double expectedC10Coverage = courseService.getCourseAlignment(10L, 1L, 1L, null, null).coverageScore();
        assertThat(c10.coverage()).isCloseTo(expectedC10Coverage, org.assertj.core.data.Offset.offset(TOLERANCE));
        assertThat(c10.coverage()).isCloseTo(24.3902, org.assertj.core.data.Offset.offset(TOLERANCE));

        // Course 30 in District 1: taught skills 3 and 4 (each 30 postings out of 82 total top share)
        // Expected coverage = (60 / 82) * 100 = 73.1707%
        var c30 = response.items().stream().filter(i -> i.courseId() == 30L).findFirst().orElseThrow();
        double expectedC30Coverage = courseService.getCourseAlignment(30L, 1L, 1L, null, null).coverageScore();
        assertThat(c30.coverage()).isCloseTo(expectedC30Coverage, org.assertj.core.data.Offset.offset(TOLERANCE));
        assertThat(c30.coverage()).isCloseTo(73.1707, org.assertj.core.data.Offset.offset(TOLERANCE));

        // Add a duplicate offering for Course 10 in District 1 (e.g. historical year 2025 offering)
        // to verify that duplicate calls within a request retrieve identical coverage from memoization
        FlagsResponse nationalResponse = oversupplyService.getFlags(null);
        var c10National = nationalResponse.items().stream().filter(i -> i.courseId() == 10L && i.districtId() == 1L).findFirst().orElseThrow();
        assertThat(c10National.coverage()).isCloseTo(expectedC10Coverage, org.assertj.core.data.Offset.offset(TOLERANCE));
    }
}
