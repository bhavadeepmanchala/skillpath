package com.skillpath.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.skillpath.backend.service.OversupplyService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class DistrictPlanControllerTest {

    private static final double TOLERANCE = 1e-4;

    @Autowired
    private PlanController planController;

    @Autowired
    private FlagController flagController;

    @Autowired
    private CourseController courseController;

    @Autowired
    private OversupplyService oversupplyService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;
    private MockMvc flagsMockMvc;
    private MockMvc courseMockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(planController).build();
        flagsMockMvc = MockMvcBuilders.standaloneSetup(flagController).build();
        courseMockMvc = MockMvcBuilders.standaloneSetup(courseController).build();
        cleanTables();
        oversupplyService.clearCache();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
        oversupplyService.clearCache();
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
     * Hand-built tiny dataset:
     * Districts:
     *   1: District Alpha
     *   2: District Beta (no offerings)
     *
     * Roles:
     *   1: Role Alpha
     *   2: Role Beta
     *
     * Skills:
     *   1: Skill 1 (declining: 60/300 -> 30/300)
     *   2: Skill 2 (declining: 45/300 -> 30/300)
     *   3: Skill 3 (stable high demand: 90/300 -> 90/300)
     *   4: Skill 4 (stable high demand: 90/300 -> 90/300)
     *   5: Skill 5 (low volume)
     *
     * Courses:
     *   1: Course Oversupplied (linked to Role 1, teaches Skills 3 & 4: high cov, not obsolete)
     *      Offerings in D1: seats=60, trainers=2, openings=20 -> ratio=3.0 -> REDUCE
     *   2: Course Obsolete (linked to Role 1, teaches Skills 1 & 2: low cov 24.39%, falling trend -> obsolete)
     *      Offerings in D1: seats=50, trainers=2, openings=50 -> ratio=1.0 -> REVISE
     *   3: Course Both Oversupplied and Obsolete (linked to Role 1, teaches Skills 1 & 2: obsolete)
     *      Offerings in D1: seats=90, trainers=3, openings=30 -> ratio=3.0 -> REDUCE + REVISE
     *   4: Course UnderSupplied (linked to Role 1, teaches Skills 3 & 4)
     *      Offerings in D1: seats=20, trainers=1, openings=40 -> ratio=0.50 (<0.7) -> EXPAND
     *   5: Course WithinRange (linked to Role 1, teaches Skills 3 & 4)
     *      Offerings in D1: seats=50, trainers=2, openings=50 -> ratio=1.0 -> KEEP (WITHIN_RANGE)
     *   6: Course LowOpenings (linked to Role 2, teaches Skills 3 & 4)
     *      Offerings in D1: seats=30, trainers=2, openings=10 (<20 min-openings) -> KEEP (INSUFFICIENT_DATA)
     */
    private void seedHandBuiltDataset() {
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District Alpha', 'State 1')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District Beta', 'State 2')");

        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Role Alpha', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (2, 'Role Beta', 'IT')");

        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (1, 'Skill 1', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (2, 'Skill 2', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (3, 'Skill 3', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (4, 'Skill 4', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (5, 'Skill 5', 'Tech')");

        // Courses
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'Course Oversupplied', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (2, 'Course Obsolete', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (3, 'Course Both', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (4, 'Course UnderSupplied', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (5, 'Course WithinRange', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (6, 'Course LowOpenings', 10, 'IT')");

        // Course roles
        for (long cId : new long[]{1, 2, 3, 4, 5}) {
            jdbcTemplate.update("INSERT INTO course_role (course_id, role_id) VALUES (?, 1)", cId);
        }
        jdbcTemplate.update("INSERT INTO course_role (course_id, role_id) VALUES (6, 2)");

        // Course skills:
        // C1, C4, C5, C6 teach Skills 3 & 4 (High coverage, not obsolete)
        for (long cId : new long[]{1, 4, 5, 6}) {
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 3, 'Proficient')", cId);
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 4, 'Proficient')", cId);
        }

        // C2, C3 teach Skills 1 & 2 (Low coverage 24.39%, obsolete)
        for (long cId : new long[]{2, 3}) {
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 1, 'Proficient')", cId);
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 2, 'Proficient')", cId);
        }

        // Course offerings in District 1
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (1, 1, 2026, 60, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (2, 1, 2026, 50, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (3, 1, 2026, 90, 3)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (4, 1, 2026, 20, 1)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (5, 1, 2026, 50, 2)");
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (6, 1, 2026, 30, 2)");

        jdbcTemplate.execute("INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (1, 1, 1, '2026-09', 10, 20)");
        jdbcTemplate.execute("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (1, 1, 1, '2026-09-30', 'Mid')");
    }

    private void setupDistinctRolesForCourses() {
        cleanTables();

        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District Alpha', 'State 1')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District Beta', 'State 2')");

        // Roles 1 to 6
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Role 1', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (2, 'Role 2', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (3, 'Role 3', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (4, 'Role 4', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (5, 'Role 5', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (6, 'Role 6', 'IT')");

        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (1, 'Skill 1', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (2, 'Skill 2', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (3, 'Skill 3', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (4, 'Skill 4', 'Tech')");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category) VALUES (5, 'Skill 5', 'Tech')");

        // Courses
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'Course Oversupplied', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (2, 'Course Obsolete', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (3, 'Course Both', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (4, 'Course UnderSupplied', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (5, 'Course WithinRange', 10, 'IT')");
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (6, 'Course LowOpenings', 10, 'IT')");

        // Course roles (1:1 mapping for clean per-course postings)
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (1, 1)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (2, 2)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (3, 3)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (4, 4)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (5, 5)");
        jdbcTemplate.execute("INSERT INTO course_role (course_id, role_id) VALUES (6, 6)");

        // Course skills:
        // C1, C4, C5, C6 teach Skills 3 & 4 (High coverage, not obsolete)
        for (long cId : new long[]{1, 4, 5, 6}) {
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 3, 'Proficient')", cId);
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 4, 'Proficient')", cId);
        }

        // C2, C3 teach Skills 1 & 2 (Low coverage, obsolete)
        for (long cId : new long[]{2, 3}) {
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 1, 'Proficient')", cId);
            jdbcTemplate.update("INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, 2, 'Proficient')", cId);
        }

        // Offerings in District 1:
        // C1: seats = 60, trainers = 2, openings = 20 -> ratio = 3.0 -> REDUCE
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (1, 1, 2026, 60, 2)");
        // C2: seats = 50, trainers = 2, openings = 50 -> ratio = 1.0 -> REVISE
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (2, 1, 2026, 50, 2)");
        // C3: seats = 90, trainers = 3, openings = 30 -> ratio = 3.0 -> REDUCE + REVISE
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (3, 1, 2026, 90, 3)");
        // C4: seats = 20, trainers = 1, openings = 40 -> ratio = 0.50 -> EXPAND
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (4, 1, 2026, 20, 1)");
        // C5: seats = 50, trainers = 2, openings = 50 -> ratio = 1.0 -> KEEP (WITHIN_RANGE)
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (5, 1, 2026, 50, 2)");
        // C6: seats = 30, trainers = 2, openings = 10 -> ratio = 3.0 (<20 min-openings) -> KEEP (INSUFFICIENT_DATA)
        jdbcTemplate.execute("INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (6, 1, 2026, 30, 2)");

        // Job postings for each role in District 1:
        long jpId = 1L;
        // Role 1 (C1): 20 postings
        for (int i = 0; i < 20; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 1, '2026-05-10', 'Mid')", jpId++);
        }
        // Role 2 (C2): 50 postings
        for (int i = 0; i < 50; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 2, 1, '2026-05-10', 'Mid')", jpId++);
        }
        // Role 3 (C3): 30 postings
        for (int i = 0; i < 30; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 3, 1, '2026-05-10', 'Mid')", jpId++);
        }
        // Role 4 (C4): 40 postings
        for (int i = 0; i < 40; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 4, 1, '2026-05-10', 'Mid')", jpId++);
        }
        // Role 5 (C5): 50 postings
        for (int i = 0; i < 50; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 5, 1, '2026-05-10', 'Mid')", jpId++);
        }
        // Role 6 (C6): 10 postings
        for (int i = 0; i < 10; i++) {
            jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 6, 1, '2026-05-10', 'Mid')", jpId++);
        }
        // Reference max date: 2026-09-30
        jdbcTemplate.update("INSERT INTO job_posting (id, role_id, district_id, posted_on, level) VALUES (?, 1, 1, '2026-09-30', 'Mid')", jpId++);

        // Monthly demand for 6 months (2026-04 to 2026-09) across roles
        String[] prevMonths = {"2026-04", "2026-05", "2026-06"};
        String[] latestMonths = {"2026-07", "2026-08", "2026-09"};

        for (long rId : new long[]{1, 2, 3, 4, 5, 6}) {
            for (String m : prevMonths) {
                // S1:20, S2:15, S3:30, S4:30, S5:3 (total 100)
                insertDemand(1, rId, 1, m, 20, 100);
                insertDemand(1, rId, 2, m, 15, 100);
                insertDemand(1, rId, 3, m, 30, 100);
                insertDemand(1, rId, 4, m, 30, 100);
                insertDemand(1, rId, 5, m, 3, 100);
            }
            for (String m : latestMonths) {
                // S1:10 (falling!), S2:10 (falling!), S3:30 (stable), S4:30 (stable), S5:2
                insertDemand(1, rId, 1, m, 10, 100);
                insertDemand(1, rId, 2, m, 10, 100);
                insertDemand(1, rId, 3, m, 30, 100);
                insertDemand(1, rId, 4, m, 30, 100);
                insertDemand(1, rId, 5, m, 2, 100);
            }
        }
    }

    private void insertDemand(long distId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (?, ?, ?, ?, ?, ?)",
            distId, roleId, skillId, month, withSkill, total
        );
    }

    /**
     * Test 1: Oversupplied course gets REDUCE with exact recommendedSeats, seatChange, trainersNeeded.
     */
    @Test
    void testOversuppliedCourseGetsReduceWithExactNumbers() throws Exception {
        setupDistinctRolesForCourses();

        // Course 1: seats=60, trainers=2, openings=21.0 (20+1 on max date)
        // oversupplyRatio = 60 / 21.0 = 2.857 (> 1.5)
        // targetRatio = 1.0 -> recommendedSeats = ceil(21.0 * 1.0) = 21
        // seatChange = 21 - 60 = -39
        // seatsPerTrainer = 25 -> trainersNeeded = ceil(21 / 25.0) = 1
        // trainerChange = 1 - 2 = -1
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].actions", hasItem(contains("REDUCE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].reasons", hasItem(contains("OVERSUPPLIED"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].recommendedSeats").value(21))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].seatChange").value(-39))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].trainersNeeded").value(1))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].trainerChange").value(-1));
    }

    /**
     * Test 2: Obsolete course gets REVISE with add and retire skills.
     */
    @Test
    void testObsoleteCourseGetsReviseWithAddAndRetireSkills() throws Exception {
        setupDistinctRolesForCourses();

        // Course 2: teaches Skills 1 & 2 (cov = 24.39% < 40%, keySkillTrend < 0 -> obsolete = true)
        // openings = 50.0, seats = 50, trainers = 2, ratio = 1.0 (not oversupplied, not expand)
        // actions = ["REVISE"], reasons = ["OBSOLETE"]
        // recommendedSeats = 50 (unchanged), trainersNeeded = ceil(50/25) = 2, seatChange = 0, trainerChange = 0
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].actions", hasItem(contains("REVISE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].reasons", hasItem(contains("OBSOLETE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].recommendedSeats").value(50))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].seatChange").value(0))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].trainersNeeded").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].trainerChange").value(0))
            // Carries ADD skills (Skills 3 & 4 are not taught and high demand)
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].add").isNotEmpty())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].add[0][0].skillName", notNullValue()))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].add[0][0].latestShare", notNullValue()))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].add[0][0].trend", notNullValue()))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].add[0][0].score", notNullValue()))
            // Carries RETIRE skills (Skills 1 & 2 are taught and declining)
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].retire").isNotEmpty());
    }

    /**
     * Test 3: A course that is both oversupplied and obsolete gets both actions.
     */
    @Test
    void testCourseBothOversuppliedAndObsoleteGetsBothActions() throws Exception {
        setupDistinctRolesForCourses();

        // Course 3: teaches Skills 1 & 2 (obsolete), seats=90, trainers=3, openings=30.0 -> ratio=3.0 (oversupplied)
        // actions = ["REDUCE", "REVISE"], reasons = ["OVERSUPPLIED", "OBSOLETE"]
        // recommendedSeats = ceil(30.0 * 1.0) = 30
        // seatChange = 30 - 90 = -60
        // trainersNeeded = ceil(30 / 25.0) = 2
        // trainerChange = 2 - 3 = -1
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].actions", hasItem(contains("REDUCE", "REVISE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].reasons", hasItem(contains("OVERSUPPLIED", "OBSOLETE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].recommendedSeats").value(30))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].seatChange").value(-60))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].trainersNeeded").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].trainerChange").value(-1))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].add").isNotEmpty());
    }

    /**
     * Test 4: Under-supplied course gets EXPAND with exact numbers.
     */
    @Test
    void testUnderSuppliedCourseGetsExpandWithExactNumbers() throws Exception {
        setupDistinctRolesForCourses();

        // Course 4: seats=20, trainers=1, openings=40.0 -> ratio=0.50 (< 0.70) -> EXPAND
        // coverage = 73.17% (not obsolete, not low coverage)
        // actions = ["EXPAND"], reasons = ["UNDER_SUPPLIED"]
        // recommendedSeats = ceil(40.0 * 1.0) = 40
        // seatChange = 40 - 20 = 20
        // trainersNeeded = ceil(40 / 25.0) = 2
        // trainerChange = 2 - 1 = 1
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].actions", hasItem(contains("EXPAND"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].reasons", hasItem(contains("UNDER_SUPPLIED"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].recommendedSeats").value(40))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].seatChange").value(20))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainersNeeded").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainerChange").value(1));
    }

    /**
     * Test 5: Course within range gets KEEP with WITHIN_RANGE.
     */
    @Test
    void testCourseWithinRangeGetsKeepWithWithinRange() throws Exception {
        setupDistinctRolesForCourses();

        // Course 5: seats=50, trainers=2, openings=50.0 -> ratio=1.0 (between 0.7 and 1.5)
        // coverage = 73.17% (>= 40.0%)
        // actions = ["KEEP"], reasons = ["WITHIN_RANGE"]
        // recommendedSeats = 50, seatChange = 0
        // trainersNeeded = ceil(50 / 25.0) = 2, trainerChange = 0
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 5)].actions", hasItem(contains("KEEP"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 5)].reasons", hasItem(contains("WITHIN_RANGE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 5)].recommendedSeats").value(50))
            .andExpect(jsonPath("$.items[?(@.courseId == 5)].seatChange").value(0))
            .andExpect(jsonPath("$.items[?(@.courseId == 5)].trainersNeeded").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 5)].trainerChange").value(0));
    }

    /**
     * Test 6: Offering below min-openings gets KEEP with INSUFFICIENT_DATA and unchanged seats.
     */
    @Test
    void testOfferingBelowMinOpeningsGetsKeepWithInsufficientData() throws Exception {
        setupDistinctRolesForCourses();

        // Course 6: seats=30, trainers=2, openings=10.0 (< 20 min-openings)
        // actions = ["KEEP"], reasons = ["INSUFFICIENT_DATA"]
        // recommendedSeats = seats = 30, trainersNeeded = trainers = 2
        // seatChange = 0, trainerChange = 0
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 6)].actions", hasItem(contains("KEEP"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 6)].reasons", hasItem(contains("INSUFFICIENT_DATA"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 6)].recommendedSeats").value(30))
            .andExpect(jsonPath("$.items[?(@.courseId == 6)].seatChange").value(0))
            .andExpect(jsonPath("$.items[?(@.courseId == 6)].trainersNeeded").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 6)].trainerChange").value(0));
    }

    /**
     * Test 7: Ceil rounding case.
     */
    @Test
    void testCeilRoundingCase() throws Exception {
        setupDistinctRolesForCourses();

        // Target ratio = 1.05 for Course 4 (openings = 40.0) -> recommendedSeats = ceil(40.0 * 1.05) = ceil(42.0) = 42
        // What if openings has fractional part? Let's override targetRatio to 1.01:
        // Course 3: openings = 30.0 -> 30.0 * 1.01 = 30.3 -> ceil(30.3) = 31!
        // trainersNeeded = ceil(31 / 25.0) = ceil(1.24) = 2!
        mockMvc.perform(get("/api/districts/1/plan").param("targetRatio", "1.01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].recommendedSeats").value(31))
            .andExpect(jsonPath("$.items[?(@.courseId == 3)].trainersNeeded").value(2));
    }

    /**
     * Test 8: Counts and totals add up correctly.
     */
    @Test
    void testCountsAndTotalsAddUp() throws Exception {
        setupDistinctRolesForCourses();

        // Actions across the 6 courses:
        // C1: REDUCE
        // C2: REVISE
        // C3: REDUCE, REVISE (counts in both!)
        // C4: EXPAND
        // C5: KEEP
        // C6: KEEP
        // Total reduce = 2 (C1, C3)
        // Total revise = 2 (C2, C3)
        // Total expand = 1 (C4)
        // Total keep   = 2 (C5, C6)
        //
        // Totals:
        // totalSeats: 60 + 50 + 90 + 20 + 50 + 30 = 300
        // totalRecommendedSeats: 21 + 50 + 30 + 40 + 50 + 30 = 221
        // totalTrainers: 2 + 2 + 3 + 1 + 2 + 2 = 12
        // totalTrainersNeeded: 1 + 2 + 2 + 2 + 2 + 2 = 11
        // trainerChange: 11 - 12 = -1
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId").value(1))
            .andExpect(jsonPath("$.districtName").value("District Alpha"))
            .andExpect(jsonPath("$.synthetic").value(true))
            .andExpect(jsonPath("$.counts.reduce").value(2))
            .andExpect(jsonPath("$.counts.revise").value(2))
            .andExpect(jsonPath("$.counts.expand").value(1))
            .andExpect(jsonPath("$.counts.keep").value(2))
            .andExpect(jsonPath("$.totals.totalSeats").value(300))
            .andExpect(jsonPath("$.totals.totalRecommendedSeats").value(221))
            .andExpect(jsonPath("$.totals.totalTrainers").value(12))
            .andExpect(jsonPath("$.totals.totalTrainersNeeded").value(11))
            .andExpect(jsonPath("$.totals.trainerChange").value(-1));
    }

    /**
     * Test 9: Ordering rule: actions priority (REDUCE, REVISE, EXPAND, KEEP), then ratio descending, then courseId.
     */
    @Test
    void testOrderingRule() throws Exception {
        setupDistinctRolesForCourses();

        // Priority order:
        // REDUCE items:
        // C3 (ratio 3.0, courseId 3) vs C1 (ratio 2.857, courseId 1)
        // Ratio descending: C3 (3.0) comes before C1 (2.857)
        //
        // REVISE items:
        // C2 (ratio 1.0, courseId 2)
        //
        // EXPAND items:
        // C4 (ratio 0.50, courseId 4)
        //
        // KEEP items:
        // C6 (ratio 3.0, courseId 6) vs C5 (ratio 1.0, courseId 5)
        // Ratio descending: C6 (3.0) comes before C5 (1.0)
        //
        // Expected order: Course 3, Course 1, Course 2, Course 4, Course 6, Course 5
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].courseId").value(3))
            .andExpect(jsonPath("$.items[1].courseId").value(1))
            .andExpect(jsonPath("$.items[2].courseId").value(2))
            .andExpect(jsonPath("$.items[3].courseId").value(4))
            .andExpect(jsonPath("$.items[4].courseId").value(6))
            .andExpect(jsonPath("$.items[5].courseId").value(5));
    }

    /**
     * Test 10: Unknown district gives 404 in existing style.
     */
    @Test
    void testUnknownDistrictGives404() throws Exception {
        mockMvc.perform(get("/api/districts/999/plan"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", notNullValue()))
            .andExpect(jsonPath("$.message", notNullValue()));
    }

    /**
     * Test 11: District with no offerings gives 200 with empty lists and zero totals.
     */
    @Test
    void testDistrictWithNoOfferingsGivesEmptyListsAndZeroTotals() throws Exception {
        // District 2 exists but has no offerings
        mockMvc.perform(get("/api/districts/2/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId").value(2))
            .andExpect(jsonPath("$.districtName").value("District Beta"))
            .andExpect(jsonPath("$.items", empty()))
            .andExpect(jsonPath("$.counts.reduce").value(0))
            .andExpect(jsonPath("$.counts.revise").value(0))
            .andExpect(jsonPath("$.counts.expand").value(0))
            .andExpect(jsonPath("$.counts.keep").value(0))
            .andExpect(jsonPath("$.totals.totalSeats").value(0))
            .andExpect(jsonPath("$.totals.totalRecommendedSeats").value(0))
            .andExpect(jsonPath("$.totals.totalTrainers").value(0))
            .andExpect(jsonPath("$.totals.totalTrainersNeeded").value(0))
            .andExpect(jsonPath("$.totals.trainerChange").value(0))
            .andExpect(jsonPath("$.synthetic").value(true));
    }

    /**
     * Test 12: Changing a config value changes the result as expected.
     */
    @Test
    void testChangingConfigChangesResult() throws Exception {
        setupDistinctRolesForCourses();

        // If targetRatio = 1.5:
        // Course 4 (openings = 40.0) -> recommendedSeats = ceil(40.0 * 1.5) = 60
        // seatChange = 60 - 20 = 40
        // If seatsPerTrainer = 10:
        // trainersNeeded = ceil(60 / 10.0) = 6
        // trainerChange = 6 - 1 = 5
        mockMvc.perform(get("/api/districts/1/plan")
                .param("targetRatio", "1.5")
                .param("seatsPerTrainer", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.config.targetRatio").value(1.5))
            .andExpect(jsonPath("$.config.seatsPerTrainer").value(10))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].recommendedSeats").value(60))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].seatChange").value(40))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainersNeeded").value(6))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainerChange").value(5));
    }

    /**
     * Test 13: Existing flags and recommendations JSON unchanged.
     */
    @Test
    void testExistingFlagsAndRecommendationsJsonUnchanged() throws Exception {
        setupDistinctRolesForCourses();

        // Existing flags endpoint
        flagsMockMvc.perform(get("/api/flags?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.windowMonths").value(12))
            .andExpect(jsonPath("$.scalingFactor").value(1.0))
            .andExpect(jsonPath("$.oversupplyThreshold").value(1.5))
            .andExpect(jsonPath("$.minOpenings").value(20))
            .andExpect(jsonPath("$.obsoleteCoverageThreshold").value(40.0))
            .andExpect(jsonPath("$.items", hasSize(6)));

        // Existing recommendations endpoint
        courseMockMvc.perform(get("/api/courses/2/recommendations?district=1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.courseId").value(2))
            .andExpect(jsonPath("$.courseName").value("Course Obsolete"))
            .andExpect(jsonPath("$.districtId").value(1))
            .andExpect(jsonPath("$.add").isArray())
            .andExpect(jsonPath("$.retire").isArray());
    }

    /**
     * Test 14 (a): While not ready the plan returns 503 with the Retry-After header, and once ready it returns 200.
     */
    @Test
    void testNotReadyReturns503WithRetryAfterHeaderAndReadyReturns200() throws Exception {
        // When not ready (demand_monthly empty and seed profile not active)
        cleanTables();
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(header().string("Retry-After", "5"))
            .andExpect(jsonPath("$.error", is("Data is still loading, try again shortly")))
            .andExpect(jsonPath("$.message", is("Data is still loading, try again shortly")));

        // Once ready (demand_monthly has data)
        setupDistinctRolesForCourses();
        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.districtId", is(1)));
    }

    /**
     * Test 15 (b): A REVISE-only course keeps trainers and trainerChange is 0 even when seats / seats-per-trainer would round differently.
     */
    @Test
    void testReviseOnlyCourseKeepsTrainersAndTrainerChangeZeroWhenRoundingDiffers() throws Exception {
        setupDistinctRolesForCourses();
        // Update Course 2 (REVISE-only) to 57 seats, 2 trainers.
        // With default 25 seats per trainer, ceil(57 / 25) = 3.
        // Because recommendedSeats == seats (57 == 57), trainersNeeded must stay 2 and trainerChange must be 0.
        jdbcTemplate.update("UPDATE course_offering SET seats = 57, trainers = 2 WHERE course_id = 2 AND district_id = 1");

        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].actions", hasItem(contains("REVISE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].seats").value(57))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].recommendedSeats").value(57))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].trainers").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].trainersNeeded").value(2))
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].trainerChange").value(0));
    }

    /**
     * Test 16 (c): An EXPAND course never gets fewer trainers than it has.
     */
    @Test
    void testExpandCourseNeverGetsFewerTrainersThanItHas() throws Exception {
        setupDistinctRolesForCourses();
        // Course 4 is EXPAND (seats = 20, openings = 40.0 -> recommendedSeats = 40).
        // Set current trainers to 3 and seatsPerTrainer = 50.
        // ceil(40 / 50) = 1, but max(trainers, ceil(...)) ensures trainersNeeded is max(3, 1) = 3.
        jdbcTemplate.update("UPDATE course_offering SET seats = 20, trainers = 3 WHERE course_id = 4 AND district_id = 1");

        mockMvc.perform(get("/api/districts/1/plan").param("seatsPerTrainer", "50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].actions", hasItem(contains("EXPAND"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].recommendedSeats").value(40))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainers").value(3))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainersNeeded").value(3))
            .andExpect(jsonPath("$.items[?(@.courseId == 4)].trainerChange").value(0));
    }

    /**
     * Test 17 (d): A REDUCE course still gets ceil(recommendedSeats / seats-per-trainer).
     */
    @Test
    void testReduceCourseStillGetsPlainCeil() throws Exception {
        setupDistinctRolesForCourses();
        // Course 1 is REDUCE (seats = 60, recommendedSeats = 21). Set trainers = 4.
        // Plain ceil(21 / 25) = 1, so trainersNeeded = 1 and trainerChange = 1 - 4 = -3.
        jdbcTemplate.update("UPDATE course_offering SET trainers = 4 WHERE course_id = 1 AND district_id = 1");

        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].actions", hasItem(contains("REDUCE"))))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].recommendedSeats").value(21))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].trainers").value(4))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].trainersNeeded").value(1))
            .andExpect(jsonPath("$.items[?(@.courseId == 1)].trainerChange").value(-3));
    }

    /**
     * Test 18 (e): Totals match the sum of the items.
     */
    @Test
    void testTotalsMatchSumOfItems() throws Exception {
        setupDistinctRolesForCourses();

        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(result -> {
                String json = result.getResponse().getContentAsString();
                java.util.List<Integer> seats = JsonPath.read(json, "$.items[*].seats");
                java.util.List<Integer> recSeats = JsonPath.read(json, "$.items[*].recommendedSeats");
                java.util.List<Integer> trainers = JsonPath.read(json, "$.items[*].trainers");
                java.util.List<Integer> trainersNeeded = JsonPath.read(json, "$.items[*].trainersNeeded");
                java.util.List<Integer> trainerChange = JsonPath.read(json, "$.items[*].trainerChange");

                int sumSeats = seats.stream().mapToInt(Integer::intValue).sum();
                int sumRecSeats = recSeats.stream().mapToInt(Integer::intValue).sum();
                int sumTrainers = trainers.stream().mapToInt(Integer::intValue).sum();
                int sumTrainersNeeded = trainersNeeded.stream().mapToInt(Integer::intValue).sum();
                int sumTrainerChange = trainerChange.stream().mapToInt(Integer::intValue).sum();

                int totalSeats = JsonPath.read(json, "$.totals.totalSeats");
                int totalRecommendedSeats = JsonPath.read(json, "$.totals.totalRecommendedSeats");
                int totalTrainers = JsonPath.read(json, "$.totals.totalTrainers");
                int totalTrainersNeeded = JsonPath.read(json, "$.totals.totalTrainersNeeded");
                int totalTrainerChange = JsonPath.read(json, "$.totals.trainerChange");

                assertThat(totalSeats).isEqualTo(sumSeats);
                assertThat(totalRecommendedSeats).isEqualTo(sumRecSeats);
                assertThat(totalTrainers).isEqualTo(sumTrainers);
                assertThat(totalTrainersNeeded).isEqualTo(sumTrainersNeeded);
                assertThat(totalTrainerChange).isEqualTo(sumTrainerChange);
                assertThat(totalTrainerChange).isEqualTo(totalTrainersNeeded - totalTrainers);
            });
    }

    /**
     * Test 19 (f): The JSON of a plan item contains "add" and "retire" and does NOT contain "addSkills" or "retireSkills".
     */
    @Test
    void testJsonContainsAddAndRetireAndNotAddSkillsOrRetireSkills() throws Exception {
        setupDistinctRolesForCourses();

        mockMvc.perform(get("/api/districts/1/plan"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].add").exists())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].retire").exists())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].addSkills").doesNotExist())
            .andExpect(jsonPath("$.items[?(@.courseId == 2)].retireSkills").doesNotExist())
            .andExpect(result -> {
                String content = result.getResponse().getContentAsString();
                assertThat(content)
                    .contains("\"add\":")
                    .contains("\"retire\":")
                    .doesNotContain("\"addSkills\"")
                    .doesNotContain("\"retireSkills\"");
            });
    }
}
