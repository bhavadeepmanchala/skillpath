package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class FlagControllerTest {

    private static final double TOLERANCE = 1e-6;

    @Autowired
    private FlagController flagController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(flagController).build();
        cleanTables();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
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

    /**
     * Hand-built test dataset:
     * Districts:
     *   1: District North
     *   2: District South
     *   3: District East (no offerings)
     *
     * Roles:
     *   1: Cloud Engineer
     *   2: DevOps Specialist
     *   3: Graphic Designer
     *
     * Courses:
     *   1: Cloud & DevOps Engineering (linked to Role 1 and Role 2) -> 2 linked roles
     *   2: Digital Media Design (linked to Role 3) -> 1 linked role
     *
     * Offerings:
     *   Course 1:
     *     District 1, 2025: seats = 20, trainers = 1 (Older offering - must be ignored)
     *     District 1, 2026: seats = 60, trainers = 2 (Latest offering)
     *     District 2, 2026: seats = 80, trainers = 3
     *   Course 2:
     *     District 1, 2026: seats = 40, trainers = 1
     *     District 2, 2026: seats = 50, trainers = 2
     *
     * Latest posted_on in job_posting: 2026-09-30
     * 12-month window: 2025-10-01 to 2026-09-30
     *
     * Postings:
     *   District 1:
     *     Role 1 (linked to Course 1):
     *       2026-04-15: 20 postings (in window)
     *     Role 2 (linked to Course 1):
     *       2026-05-20: 10 postings (in window)
     *       2026-09-30: 10 postings (in window, exactly on latest date)
     *       2025-09-30: 15 postings (OUTSIDE window! Ignored: 1 day before 2025-10-01)
     *     Role 3 (NOT linked to Course 1, linked to Course 2):
     *       2026-06-01: 20 postings (in window)
     *   District 2:
     *     Role 1 (linked to Course 1):
     *       2026-07-10: 100 postings (in window)
     *     Role 2: 0 postings
     *     Role 3: 0 postings (in District 2, Course 2 has 0 openings)
     *
     * Expected calculations (scalingFactor = 1.0, oversupplyThreshold = 1.5):
     *
     * 1. Course 2, District 1:
     *    year = 2026, seats = 40, trainers = 1, linkedRoleCount = 1
     *    postingsInWindow = 20 (Role 3)
     *    estimatedOpenings = 20.0
     *    oversupplyRatio = 40 / 20.0 = 2.0
     *    oversupplied = true (2.0 > 1.5)
     *
     * 2. Course 1, District 1:
     *    year = 2026, seats = 60, trainers = 2, linkedRoleCount = 2
     *    postingsInWindow = 20 (Role 1) + 20 (Role 2) = 40
     *    (15 postings on 2025-09-30 ignored; 20 postings of Role 3 ignored)
     *    estimatedOpenings = 40.0
     *    oversupplyRatio = 60 / 40.0 = 1.5
     *    oversupplied = false (1.5 is NOT > 1.5; exact threshold equality is not oversupplied)
     *
     * 3. Course 1, District 2:
     *    year = 2026, seats = 80, trainers = 3, linkedRoleCount = 2
     *    postingsInWindow = 100 (Role 1)
     *    estimatedOpenings = 100.0
     *    oversupplyRatio = 80 / 100.0 = 0.8
     *    oversupplied = false (0.8 < 1.5)
     *
     * 4. Course 2, District 2:
     *    year = 2026, seats = 50, trainers = 2, linkedRoleCount = 1
     *    postingsInWindow = 0
     *    estimatedOpenings = 0.0
     *    oversupplyRatio = null
     *    oversupplied = false (null ratio is not oversupplied)
     *
     * Sorted order descending (nulls last):
     *   [0]: Course 2, District 1 (ratio = 2.0)
     *   [1]: Course 1, District 1 (ratio = 1.5)
     *   [2]: Course 1, District 2 (ratio = 0.8)
     *   [3]: Course 2, District 2 (ratio = null)
     */
    private void seedHandBuiltDataset() {
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District North', 'State A')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District South', 'State B')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (3, 'District East', 'State C')");

        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Cloud Engineer', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (2, 'DevOps Specialist', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (3, 'Graphic Designer', 'Design')");

        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'Cloud & DevOps Engineering', 12, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (2, 'Digital Media Design', 8, 'Design')");

        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (1, 1)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (1, 2)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (2, 3)");

        // Offerings: Course 1 has an older 2025 row in District 1 which must be ignored in favor of 2026
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (1, 1, 2025, 20, 1)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (1, 1, 2026, 60, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (1, 2, 2026, 80, 3)");

        // Offerings for Course 2
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (2, 1, 2026, 40, 1)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (2, 2, 2026, 50, 2)");

        long postingId = 1L;

        // District 1, Role 1 (linked to Course 1): 20 postings on 2026-04-15
        for (int i = 0; i < 20; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 1, '2026-04-15', 'Mid')", postingId++);
        }

        // District 1, Role 2 (linked to Course 1): 10 postings on 2026-05-20
        for (int i = 0; i < 10; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 2, 1, '2026-05-20', 'Mid')", postingId++);
        }

        // District 1, Role 2 (linked to Course 1): 10 postings on 2026-09-30 (latest date)
        for (int i = 0; i < 10; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 2, 1, '2026-09-30', 'Senior')", postingId++);
        }

        // District 1, Role 2: 15 postings on 2025-09-30 (OUTSIDE the 12-month window: 1 day before 2025-10-01)
        for (int i = 0; i < 15; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 2, 1, '2025-09-30', 'Entry')", postingId++);
        }

        // District 1, Role 3 (NOT linked to Course 1, linked to Course 2): 20 postings on 2026-06-01
        for (int i = 0; i < 20; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 3, 1, '2026-06-01', 'Mid')", postingId++);
        }

        // District 2, Role 1 (linked to Course 1): 100 postings on 2026-07-10
        for (int i = 0; i < 100; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 2, '2026-07-10', 'Senior')", postingId++);
        }
    }

    @Test
    void testGetAllFlagsReturnsCorrectMetadataAndSortedItems() throws Exception {
        mockMvc.perform(get("/api/flags"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.windowMonths", is(12)))
            .andExpect(jsonPath("$.windowStart", is("2025-10-01")))
            .andExpect(jsonPath("$.windowEnd", is("2026-09-30")))
            .andExpect(jsonPath("$.scalingFactor", closeTo(1.0, TOLERANCE)))
            .andExpect(jsonPath("$.oversupplyThreshold", closeTo(1.5, TOLERANCE)))
            .andExpect(jsonPath("$.minOpenings", is(20)))
            .andExpect(jsonPath("$.items", hasSize(4)))
            // Rank 1: Course 2 in District 1 (ratio = 2.0, oversupplied = true, lowSample = false)
            .andExpect(jsonPath("$.items[0].courseId", is(2)))
            .andExpect(jsonPath("$.items[0].courseName", is("Digital Media Design")))
            .andExpect(jsonPath("$.items[0].districtId", is(1)))
            .andExpect(jsonPath("$.items[0].districtName", is("District North")))
            .andExpect(jsonPath("$.items[0].year", is(2026)))
            .andExpect(jsonPath("$.items[0].seats", is(40)))
            .andExpect(jsonPath("$.items[0].trainers", is(1)))
            .andExpect(jsonPath("$.items[0].linkedRoleCount", is(1)))
            .andExpect(jsonPath("$.items[0].postingsInWindow", is(20)))
            .andExpect(jsonPath("$.items[0].estimatedOpenings", closeTo(20.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].oversupplyRatio", closeTo(2.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].oversupplied", is(true)))
            .andExpect(jsonPath("$.items[0].lowSample", is(false)))
            // Rank 2: Course 1 in District 1 (ratio = 1.5, threshold equality -> oversupplied = false, lowSample = false)
            .andExpect(jsonPath("$.items[1].courseId", is(1)))
            .andExpect(jsonPath("$.items[1].courseName", is("Cloud & DevOps Engineering")))
            .andExpect(jsonPath("$.items[1].districtId", is(1)))
            .andExpect(jsonPath("$.items[1].districtName", is("District North")))
            .andExpect(jsonPath("$.items[1].year", is(2026)))
            .andExpect(jsonPath("$.items[1].seats", is(60)))
            .andExpect(jsonPath("$.items[1].trainers", is(2)))
            .andExpect(jsonPath("$.items[1].linkedRoleCount", is(2)))
            .andExpect(jsonPath("$.items[1].postingsInWindow", is(40)))
            .andExpect(jsonPath("$.items[1].estimatedOpenings", closeTo(40.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", closeTo(1.5, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplied", is(false)))
            .andExpect(jsonPath("$.items[1].lowSample", is(false)))
            // Rank 3: Course 1 in District 2 (ratio = 0.8, oversupplied = false, lowSample = false)
            .andExpect(jsonPath("$.items[2].courseId", is(1)))
            .andExpect(jsonPath("$.items[2].courseName", is("Cloud & DevOps Engineering")))
            .andExpect(jsonPath("$.items[2].districtId", is(2)))
            .andExpect(jsonPath("$.items[2].districtName", is("District South")))
            .andExpect(jsonPath("$.items[2].year", is(2026)))
            .andExpect(jsonPath("$.items[2].seats", is(80)))
            .andExpect(jsonPath("$.items[2].trainers", is(3)))
            .andExpect(jsonPath("$.items[2].linkedRoleCount", is(2)))
            .andExpect(jsonPath("$.items[2].postingsInWindow", is(100)))
            .andExpect(jsonPath("$.items[2].estimatedOpenings", closeTo(100.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[2].oversupplyRatio", closeTo(0.8, TOLERANCE)))
            .andExpect(jsonPath("$.items[2].oversupplied", is(false)))
            .andExpect(jsonPath("$.items[2].lowSample", is(false)))
            // Rank 4: Course 2 in District 2 (0 postings -> ratio = null, oversupplied = false, lowSample = true)
            .andExpect(jsonPath("$.items[3].courseId", is(2)))
            .andExpect(jsonPath("$.items[3].courseName", is("Digital Media Design")))
            .andExpect(jsonPath("$.items[3].districtId", is(2)))
            .andExpect(jsonPath("$.items[3].districtName", is("District South")))
            .andExpect(jsonPath("$.items[3].year", is(2026)))
            .andExpect(jsonPath("$.items[3].seats", is(50)))
            .andExpect(jsonPath("$.items[3].trainers", is(2)))
            .andExpect(jsonPath("$.items[3].linkedRoleCount", is(1)))
            .andExpect(jsonPath("$.items[3].postingsInWindow", is(0)))
            .andExpect(jsonPath("$.items[3].estimatedOpenings", closeTo(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[3].oversupplyRatio", nullValue()))
            .andExpect(jsonPath("$.items[3].oversupplied", is(false)))
            .andExpect(jsonPath("$.items[3].lowSample", is(true)));
    }

    @Test
    void testDistrictFilterWorks() throws Exception {
        mockMvc.perform(get("/api/flags").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(2)))
            .andExpect(jsonPath("$.items[0].courseId", is(2)))
            .andExpect(jsonPath("$.items[0].districtId", is(1)))
            .andExpect(jsonPath("$.items[0].oversupplyRatio", closeTo(2.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].oversupplied", is(true)))
            .andExpect(jsonPath("$.items[1].courseId", is(1)))
            .andExpect(jsonPath("$.items[1].districtId", is(1)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", closeTo(1.5, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplied", is(false)));

        // Test with parameter 'districtId' as well
        mockMvc.perform(get("/api/flags").param("districtId", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(2)))
            .andExpect(jsonPath("$.items[0].courseId", is(1)))
            .andExpect(jsonPath("$.items[0].districtId", is(2)))
            .andExpect(jsonPath("$.items[0].oversupplyRatio", closeTo(0.8, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].courseId", is(2)))
            .andExpect(jsonPath("$.items[1].districtId", is(2)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", nullValue()));
    }

    @Test
    void testDistrictWithNoOfferingsReturnsEmptyItems() throws Exception {
        mockMvc.perform(get("/api/flags").param("district", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void testUnknownDistrictReturns404() throws Exception {
        mockMvc.perform(get("/api/flags").param("district", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", is("District not found: 999")));
    }

    @Test
    void testOutsideWindowPostingsAreIgnored() throws Exception {
        // District 1 has 15 postings on 2025-09-30 (1 day before windowStart 2025-10-01).
        // If these 15 postings were counted, Role 2 postings would be 10 + 10 + 15 = 35,
        // making total postings 20 + 35 = 55 instead of 40, and ratio 60 / 55.0 = 1.0909.
        // We verify that postingsInWindow is exactly 40 and ratio is exactly 1.5.
        mockMvc.perform(get("/api/flags").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[1].courseId", is(1)))
            .andExpect(jsonPath("$.items[1].postingsInWindow", is(40)))
            .andExpect(jsonPath("$.items[1].estimatedOpenings", closeTo(40.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", closeTo(1.5, TOLERANCE)));
    }

    @Test
    void testUnlinkedRolePostingsAreIgnored() throws Exception {
        // District 1 has 20 postings for Role 3 (Graphic Designer).
        // Role 3 is NOT linked to Course 1 (Cloud & DevOps Engineering).
        // Course 1 postingsInWindow must NOT include Role 3's 20 postings.
        mockMvc.perform(get("/api/flags").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[1].courseId", is(1)))
            .andExpect(jsonPath("$.items[1].linkedRoleCount", is(2)))
            .andExpect(jsonPath("$.items[1].postingsInWindow", is(40)));
    }

    @Test
    void testZeroOpeningsGivesNullRatioAndOversuppliedFalse() throws Exception {
        // District 2 has 0 postings for Role 3, which is linked to Course 2.
        mockMvc.perform(get("/api/flags").param("district", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[1].courseId", is(2)))
            .andExpect(jsonPath("$.items[1].postingsInWindow", is(0)))
            .andExpect(jsonPath("$.items[1].estimatedOpenings", closeTo(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", nullValue()))
            .andExpect(jsonPath("$.items[1].oversupplied", is(false)));
    }

    @Test
    void testThresholdExactEqualityIsNotOversupplied() throws Exception {
        // Course 1 in District 1 has ratio 1.5, which is exactly equal to threshold 1.5.
        // Rule: ratio > threshold is strictly greater than; equality is NOT oversupplied.
        mockMvc.perform(get("/api/flags").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[1].courseId", is(1)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", closeTo(1.5, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplied", is(false)));
    }

    @Test
    void testEstimatedOpeningsJustBelowMinGivesLowSampleTrueAndOversuppliedFalseEvenWithHighRatio() throws Exception {
        // District 1 Role 3 currently has 20 postings. Replace with 19 postings.
        jdbcTemplate.execute("DELETE FROM job_posting WHERE district_id = 1 AND role_id = 3");
        for (long id = 1000L; id < 1019L; id++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 3, 1, '2026-06-01', 'Mid')", id);
        }

        // Course 2 has 40 seats. estimatedOpenings = 19.0 (< minOpenings 20).
        // oversupplyRatio = 40 / 19.0 = 2.105263 (> threshold 1.5).
        // Guard check: lowSample = true and oversupplied = false despite ratio > 1.5.
        mockMvc.perform(get("/api/flags").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minOpenings", is(20)))
            .andExpect(jsonPath("$.items[0].courseId", is(2)))
            .andExpect(jsonPath("$.items[0].seats", is(40)))
            .andExpect(jsonPath("$.items[0].postingsInWindow", is(19)))
            .andExpect(jsonPath("$.items[0].estimatedOpenings", closeTo(19.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].oversupplyRatio", closeTo(40.0 / 19.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].lowSample", is(true)))
            .andExpect(jsonPath("$.items[0].oversupplied", is(false)));
    }

    @Test
    void testEstimatedOpeningsExactlyAtMinGivesLowSampleFalseAndOversuppliedTrueWhenRatioAboveThreshold() throws Exception {
        // District 1 Role 3 has 20 postings. Course 2 has 40 seats.
        // estimatedOpenings = 20.0 (== minOpenings 20).
        // oversupplyRatio = 40 / 20.0 = 2.0 (> threshold 1.5).
        // Guard check: lowSample = false, oversupplied = true.
        mockMvc.perform(get("/api/flags").param("district", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minOpenings", is(20)))
            .andExpect(jsonPath("$.items[0].courseId", is(2)))
            .andExpect(jsonPath("$.items[0].seats", is(40)))
            .andExpect(jsonPath("$.items[0].postingsInWindow", is(20)))
            .andExpect(jsonPath("$.items[0].estimatedOpenings", closeTo(20.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].oversupplyRatio", closeTo(2.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[0].lowSample", is(false)))
            .andExpect(jsonPath("$.items[0].oversupplied", is(true)));
    }

    @Test
    void testNullRatioGivesLowSampleConsistentWithOpeningsZeroAndOversuppliedFalse() throws Exception {
        // District 2 has 0 postings for Role 3 (Course 2).
        // estimatedOpenings = 0.0 (< minOpenings 20).
        // oversupplyRatio = null.
        // Guard check: lowSample = true, oversupplied = false.
        mockMvc.perform(get("/api/flags").param("district", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minOpenings", is(20)))
            .andExpect(jsonPath("$.items[1].courseId", is(2)))
            .andExpect(jsonPath("$.items[1].postingsInWindow", is(0)))
            .andExpect(jsonPath("$.items[1].estimatedOpenings", closeTo(0.0, TOLERANCE)))
            .andExpect(jsonPath("$.items[1].oversupplyRatio", nullValue()))
            .andExpect(jsonPath("$.items[1].lowSample", is(true)))
            .andExpect(jsonPath("$.items[1].oversupplied", is(false)));
    }

    @Test
    void testMinOpeningsOverrideQueryParam() throws Exception {
        // Course 2 in District 1 has 20 postings and ratio 2.0 (> 1.5).
        // If minOpenings is overridden to 25: 20 < 25 -> lowSample = true, oversupplied = false
        mockMvc.perform(get("/api/flags").param("district", "1").param("minOpenings", "25"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minOpenings", is(25)))
            .andExpect(jsonPath("$.items[0].courseId", is(2)))
            .andExpect(jsonPath("$.items[0].lowSample", is(true)))
            .andExpect(jsonPath("$.items[0].oversupplied", is(false)));

        // If minOpenings is overridden to 10: 20 >= 10 -> lowSample = false, oversupplied = true
        mockMvc.perform(get("/api/flags").param("district", "1").param("minOpenings", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minOpenings", is(10)))
            .andExpect(jsonPath("$.items[0].courseId", is(2)))
            .andExpect(jsonPath("$.items[0].lowSample", is(false)))
            .andExpect(jsonPath("$.items[0].oversupplied", is(true)));
    }
}

