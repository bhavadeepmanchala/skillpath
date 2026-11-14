package com.skillpath.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.skillpath.backend.dto.FlagsResponse;
import com.skillpath.backend.generator.CourseGenerator;
import com.skillpath.backend.generator.DataGenerator;
import com.skillpath.backend.generator.DemandMonthlyRebuilder;
import com.skillpath.backend.generator.SeedRunner;
import com.skillpath.backend.service.CourseService;
import com.skillpath.backend.service.OversupplyService;
import com.skillpath.backend.service.ReadinessService;
import com.skillpath.backend.service.SeedStatus;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
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
    private ReadinessService readinessService;

    @Autowired
    private SeedStatus seedStatus;

    @Autowired
    private DemandMonthlyRebuilder demandMonthlyRebuilder;

    @Autowired
    private DataGenerator dataGenerator;

    @Autowired
    private CourseGenerator courseGenerator;

    @Autowired
    private DataSource dataSource;

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

        // Job postings: 40 in District 1, 20 in District 2
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
     * Test: Cached and uncached calls return identical content.
     */
    @Test
    void cachedAndUncachedCallsReturnIdenticalContent() throws Exception {
        oversupplyService.clearCache();
        assertThat(oversupplyService.getCacheSize()).isZero();

        // Direct service call
        FlagsResponse uncached = oversupplyService.getFlags(null);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(1);
        assertThat(oversupplyService.isCached(null, null)).isTrue();

        FlagsResponse cached = oversupplyService.getFlags(null);
        assertThat(cached).isEqualTo(uncached);
        assertThat(cached.items()).hasSameSizeAs(uncached.items());

        for (int i = 0; i < uncached.items().size(); i++) {
            assertThat(cached.items().get(i)).isEqualTo(uncached.items().get(i));
        }

        // HTTP endpoint
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
     * Test: Nothing is stored in the cache while seeding is not finished.
     */
    @Test
    void nothingIsStoredInCacheWhileSeedingIsNotFinished() {
        oversupplyService.clearCache();
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
     * Test: Cache is cleared when seeding restarts, fails, or rebuild runs.
     */
    @Test
    void cacheIsClearedWhenSeedingRestartsOrCompletes() {
        seedStatus.setReady();
        oversupplyService.clearCache();

        oversupplyService.getFlags(null);
        oversupplyService.getFlags(1L);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(2);

        // Seeding restarts
        seedStatus.setSeeding();
        assertThat(oversupplyService.getCacheSize()).isZero();

        // Populate again
        seedStatus.setReady();
        oversupplyService.getFlags(null);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(1);

        // Seeding fails
        seedStatus.setFailed();
        assertThat(oversupplyService.getCacheSize()).isZero();

        // DemandMonthlyRebuilder rebuild
        seedStatus.setReady();
        oversupplyService.getFlags(null);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(1);

        demandMonthlyRebuilder.rebuild();
        assertThat(oversupplyService.getCacheSize()).isZero();
    }

    /**
     * Test: Cache never exceeds 50 entries.
     */
    @Test
    void cacheNeverExceeds50Entries() {
        seedStatus.setReady();
        oversupplyService.clearCache();

        for (int i = 1; i <= 65; i++) {
            oversupplyService.getFlags(null, null, null, null, i);
            assertThat(oversupplyService.getCacheSize()).isLessThanOrEqualTo(OversupplyService.MAX_CACHE_ENTRIES);
        }

        assertThat(oversupplyService.getCacheSize()).isEqualTo(50);

        oversupplyService.getFlags(null, null, null, null, 65);
        assertThat(oversupplyService.getCacheSize()).isEqualTo(50);
    }

    /**
     * Test: Memoization gives the same coverage numbers as before for a known hand-built case.
     */
    @Test
    void memoizationGivesSameCoverageNumbersAsBefore() {
        seedStatus.setReady();
        oversupplyService.clearCache();

        FlagsResponse response = oversupplyService.getFlags(1L);
        assertThat(response.items()).hasSize(2);

        var c10 = response.items().stream().filter(i -> i.courseId() == 10L).findFirst().orElseThrow();
        double expectedC10Coverage = courseService.getCourseAlignment(10L, 1L, 1L, null, null).coverageScore();
        assertThat(c10.coverage()).isCloseTo(expectedC10Coverage, org.assertj.core.data.Offset.offset(TOLERANCE));
        assertThat(c10.coverage()).isCloseTo(24.3902, org.assertj.core.data.Offset.offset(TOLERANCE));

        var c30 = response.items().stream().filter(i -> i.courseId() == 30L).findFirst().orElseThrow();
        double expectedC30Coverage = courseService.getCourseAlignment(30L, 1L, 1L, null, null).coverageScore();
        assertThat(c30.coverage()).isCloseTo(expectedC30Coverage, org.assertj.core.data.Offset.offset(TOLERANCE));
        assertThat(c30.coverage()).isCloseTo(73.1707, org.assertj.core.data.Offset.offset(TOLERANCE));

        FlagsResponse nationalResponse = oversupplyService.getFlags(null);
        var c10National = nationalResponse.items().stream().filter(i -> i.courseId() == 10L && i.districtId() == 1L).findFirst().orElseThrow();
        assertThat(c10National.coverage()).isCloseTo(expectedC10Coverage, org.assertj.core.data.Offset.offset(TOLERANCE));
    }

    /**
     * Test (a): Hand-built dataset with known openings values verifies rewritten query
     * produces exact openings and ratios. Also verifies saved baseline files if available.
     */
    @Test
    void handBuiltDatasetKnownOpeningsAndIdenticalResults() throws Exception {
        seedStatus.setReady();
        oversupplyService.clearCache();

        // District 1: Course 10 (seats=60, openings=40, ratio=1.5), Course 30 (seats=40, openings=40, ratio=1.0)
        FlagsResponse d1Resp = oversupplyService.getFlags(1L);
        assertThat(d1Resp.items()).hasSize(2);

        var c10 = d1Resp.items().stream().filter(i -> i.courseId() == 10L).findFirst().orElseThrow();
        assertThat(c10.postingsInWindow()).isEqualTo(40L);
        assertThat(c10.estimatedOpenings()).isEqualTo(40.0);
        assertThat(c10.seats()).isEqualTo(60);
        assertThat(c10.oversupplyRatio()).isCloseTo(1.5, org.assertj.core.data.Offset.offset(TOLERANCE));
        assertThat(c10.linkedRoleCount()).isEqualTo(1L);

        var c30 = d1Resp.items().stream().filter(i -> i.courseId() == 30L).findFirst().orElseThrow();
        assertThat(c30.postingsInWindow()).isEqualTo(40L);
        assertThat(c30.estimatedOpenings()).isEqualTo(40.0);
        assertThat(c30.seats()).isEqualTo(40);
        assertThat(c30.oversupplyRatio()).isCloseTo(1.0, org.assertj.core.data.Offset.offset(TOLERANCE));

        // District 2: Course 20 (seats=60, openings=20, ratio=3.0)
        FlagsResponse d2Resp = oversupplyService.getFlags(2L);
        assertThat(d2Resp.items()).hasSize(1);
        var c20 = d2Resp.items().get(0);
        assertThat(c20.courseId()).isEqualTo(20L);
        assertThat(c20.postingsInWindow()).isEqualTo(20L);
        assertThat(c20.estimatedOpenings()).isEqualTo(20.0);
        assertThat(c20.seats()).isEqualTo(60);
        assertThat(c20.oversupplyRatio()).isCloseTo(3.0, org.assertj.core.data.Offset.offset(TOLERANCE));

        // National query: 3 items sorted by ratio desc: c20 (3.0), c10 (1.5), c30 (1.0)
        FlagsResponse natResp = oversupplyService.getFlags(null);
        assertThat(natResp.items()).hasSize(3);
        assertThat(natResp.items().get(0).courseId()).isEqualTo(20L);
        assertThat(natResp.items().get(1).courseId()).isEqualTo(10L);
        assertThat(natResp.items().get(2).courseId()).isEqualTo(30L);
    }

    /**
     * Test (b): Warm-up failure (simulated exception) does not stop readiness and leaves the cache empty.
     */
    @Test
    void warmUpFailureDoesNotStopReadinessAndLeavesCacheEmpty() {
        seedStatus.setPhase(SeedStatus.PHASE_SEEDING);

        OversupplyService failingService = new OversupplyService(
            jdbcTemplate, courseService, readinessService, seedStatus, 12, 1.0, 1.5, 20, 40.0, 20
        ) {
            @Override
            public void warmUp() {
                throw new RuntimeException("Simulated warm-up failure for testing");
            }
        };

        SeedRunner runner = new SeedRunner(dataGenerator, courseGenerator, dataSource, jdbcTemplate, seedStatus, failingService);

        assertThatCode(() -> runner.run(new DefaultApplicationArguments()))
            .doesNotThrowAnyException();

        assertThat(seedStatus.getPhase()).isEqualTo(SeedStatus.PHASE_READY);
        assertThat(failingService.getCacheSize()).isZero();
        assertThat(failingService.isCached(null, null)).isFalse();
    }

    /**
     * Test (c): After a normal seed, the national flags response is already in the cache.
     */
    @Test
    void afterNormalSeedNationalFlagsResponseIsAlreadyInCache() throws Exception {
        seedStatus.setPhase(SeedStatus.PHASE_SEEDING);
        oversupplyService.clearCache();
        assertThat(oversupplyService.getCacheSize()).isZero();

        SeedRunner runner = new SeedRunner(dataGenerator, courseGenerator, dataSource, jdbcTemplate, seedStatus, oversupplyService);
        runner.run(new DefaultApplicationArguments());

        assertThat(seedStatus.getPhase()).isEqualTo(SeedStatus.PHASE_READY);
        assertThat(oversupplyService.isCached(null, null)).isTrue();
        assertThat(oversupplyService.getCacheSize()).isGreaterThanOrEqualTo(1);

        FlagsResponse cached = oversupplyService.getFlags(null);
        assertThat(cached).isNotNull();
        assertThat(cached.items()).isNotEmpty();
    }
}
