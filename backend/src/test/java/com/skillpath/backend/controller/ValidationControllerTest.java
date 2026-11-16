package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.skillpath.backend.repository.EmployerValidationRepository;
import com.skillpath.backend.repository.RoleRepository;
import com.skillpath.backend.repository.SkillRepository;
import com.skillpath.backend.service.DemandService;
import com.skillpath.backend.service.ValidationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
class ValidationControllerTest {

    private static final double TOLERANCE = 1e-4;

    @Autowired
    private ValidationController validationController;

    @Autowired
    private DemandController demandController;

    @Autowired
    private ValidationService validationService;

    @Autowired
    private DemandService demandService;

    @Autowired
    private EmployerValidationRepository employerValidationRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(validationController, demandController).build();
        cleanTables();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM employer_validation");
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    private void seedHandBuiltDataset() {
        // 2 districts
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (1, 'District 1', 'State 1')");
        jdbcTemplate.execute("INSERT INTO district (id, name, state) VALUES (2, 'District 2', 'State 2')");

        // 2 roles
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (1, 'Software Engineer', 'IT')");
        jdbcTemplate.execute("INSERT INTO role (id, name, sector) VALUES (2, 'Data Analyst', 'IT')");

        // 3 skills
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (1, 'Java', 'Programming', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (2, 'SQL', 'Database', true)");
        jdbcTemplate.execute("INSERT INTO skill (id, name, category, active) VALUES (3, 'Python', 'Programming', true)");

        // 1 course
        jdbcTemplate.execute("INSERT INTO course (id, name, duration_weeks, sector) VALUES (1, 'Java Course', 12, 'IT')");

        // demand_monthly: 2 months (2026-08, 2026-09)
        // Month 2026-08:
        // Role 1 in District 1: 100 postings total
        // Skill 1 (Java): 40 postings
        // Skill 2 (SQL): 30 postings
        // Skill 3 (Python): 10 postings
        insertDemand(1, 1, 1, "2026-08", 40, 100);
        insertDemand(1, 1, 2, "2026-08", 30, 100);
        insertDemand(1, 1, 3, "2026-08", 10, 100);

        // Month 2026-09:
        // Role 1 in District 1: 100 postings total
        // Skill 1 (Java): 50 postings
        // Skill 2 (SQL): 30 postings
        // Skill 3 (Python): 20 postings
        insertDemand(1, 1, 1, "2026-09", 50, 100);
        insertDemand(1, 1, 2, "2026-09", 30, 100);
        insertDemand(1, 1, 3, "2026-09", 20, 100);
    }

    private void insertDemand(long districtId, long roleId, long skillId, String month, int withSkill, int total) {
        jdbcTemplate.update(
            "INSERT INTO demand_monthly (district_id, role_id, skill_id, \"month\", postings_with_skill, postings_total) VALUES (?, ?, ?, ?, ?, ?)",
            districtId, roleId, skillId, month, withSkill, total
        );
    }

    @Test
    void testPostCreatesRecordAndReturns201() throws Exception {
        String json = """
            {
                "roleId": 1,
                "skillId": 1,
                "status": "CONFIRMED",
                "note": "Critical foundational skill for software roles"
            }
            """;

        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andExpect(jsonPath("$.roleId", is(1)))
            .andExpect(jsonPath("$.skillId", is(1)))
            .andExpect(jsonPath("$.status", is("CONFIRMED")))
            .andExpect(jsonPath("$.note", is("Critical foundational skill for software roles")))
            .andExpect(jsonPath("$.confidence", closeTo(0.667, TOLERANCE)));
    }

    @Test
    void testPostCaseInsensitiveStatus() throws Exception {
        String json = """
            {
                "roleId": 1,
                "skillId": 2,
                "status": "disputed",
                "note": "Rarely used in this team"
            }
            """;

        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status", is("DISPUTED")))
            .andExpect(jsonPath("$.confidence", closeTo(0.333, TOLERANCE)));
    }

    @Test
    void testPostInvalidStatusReturns400() throws Exception {
        String json = """
            {
                "roleId": 1,
                "skillId": 1,
                "status": "MAYBE",
                "note": "Not sure"
            }
            """;

        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("Must be CONFIRMED or DISPUTED")));
    }

    @Test
    void testPostMissingStatusOrRoleOrSkillReturns400() throws Exception {
        // Missing status
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"roleId": 1, "skillId": 1}
                    """))
            .andExpect(status().isBadRequest());

        // Missing roleId
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"skillId": 1, "status": "CONFIRMED"}
                    """))
            .andExpect(status().isBadRequest());

        // Missing skillId
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"roleId": 1, "status": "CONFIRMED"}
                    """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void testPostNoteOver500CharsReturns400() throws Exception {
        String longNote = "a".repeat(501);
        String json = String.format("""
            {
                "roleId": 1,
                "skillId": 1,
                "status": "CONFIRMED",
                "note": "%s"
            }
            """, longNote);

        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", containsString("500 characters")));

        // Exactly 500 chars is accepted
        String exact500Note = "b".repeat(500);
        String validJson = String.format("""
            {
                "roleId": 1,
                "skillId": 1,
                "status": "CONFIRMED",
                "note": "%s"
            }
            """, exact500Note);

        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validJson))
            .andExpect(status().isCreated());
    }

    @Test
    void testPostUnknownRoleOrSkillReturns404() throws Exception {
        // Unknown role
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"roleId": 999, "skillId": 1, "status": "CONFIRMED"}
                    """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", containsString("Role not found")))
            .andExpect(jsonPath("$.message", containsString("Role not found")));

        // Unknown skill
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"roleId": 1, "skillId": 999, "status": "CONFIRMED"}
                    """))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error", containsString("Skill not found")))
            .andExpect(jsonPath("$.message", containsString("Skill not found")));
    }

    @Test
    void testGetUnknownRoleOrSkillReturns404() throws Exception {
        mockMvc.perform(get("/api/validations").param("role", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message", containsString("Role not found")));

        mockMvc.perform(get("/api/validations").param("skill", "999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message", containsString("Skill not found")));
    }

    @Test
    void testConfidenceFormulaValues() throws Exception {
        // Formula unit checks:
        // 0 confirm, 0 dispute -> 0.5
        assertEquals(0.5, ValidationService.calculateConfidence(0, 0), TOLERANCE);
        // 1 confirm, 0 dispute -> 0.667
        assertEquals(0.667, ValidationService.calculateConfidence(1, 0), TOLERANCE);
        // 0 confirm, 1 dispute -> 0.333
        assertEquals(0.333, ValidationService.calculateConfidence(0, 1), TOLERANCE);
        // 3 confirm, 1 dispute -> 0.667
        assertEquals(0.667, ValidationService.calculateConfidence(3, 1), TOLERANCE);

        // Progression via POST on (role 1, skill 1):
        // 1 confirm -> 0.667
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 1, \"status\": \"CONFIRMED\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.confidence", closeTo(0.667, TOLERANCE)));

        // 2 confirm -> 3/4 = 0.75
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 1, \"status\": \"CONFIRMED\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.confidence", closeTo(0.75, TOLERANCE)));

        // 3 confirm -> 4/5 = 0.8
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 1, \"status\": \"CONFIRMED\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.confidence", closeTo(0.8, TOLERANCE)));

        // 3 confirm, 1 dispute -> 4/6 = 0.667
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 1, \"status\": \"DISPUTED\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.confidence", closeTo(0.667, TOLERANCE)));
    }

    @Test
    void testGetListOrderingAnd100RowCap() throws Exception {
        // Insert validations for multiple pairs:
        // (1, 1): 4 validations (3 confirm, 1 dispute)
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 1, 'CONFIRMED', 'n')");
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 1, 'CONFIRMED', 'n')");
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 1, 'CONFIRMED', 'n')");
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 1, 'DISPUTED', 'n')");

        // (1, 2): 2 validations (1 confirm, 1 dispute)
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 2, 'CONFIRMED', 'n')");
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 2, 'DISPUTED', 'n')");

        // (2, 1): 2 validations (2 confirm) - tie with (1, 2) on count=2, but roleId=2 > 1
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (2, 1, 'CONFIRMED', 'n')");
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (2, 1, 'CONFIRMED', 'n')");

        // (1, 3): 1 validation
        jdbcTemplate.execute("INSERT INTO employer_validation (role_id, skill_id, status, note) VALUES (1, 3, 'DISPUTED', 'n')");

        mockMvc.perform(get("/api/validations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(4)))
            // Rank 1: (1, 1) total=4
            .andExpect(jsonPath("$[0].roleId", is(1)))
            .andExpect(jsonPath("$[0].skillId", is(1)))
            .andExpect(jsonPath("$[0].confirmedCount", is(3)))
            .andExpect(jsonPath("$[0].disputedCount", is(1)))
            .andExpect(jsonPath("$[0].confidence", closeTo(0.667, TOLERANCE)))
            // Rank 2: (1, 2) total=2, roleId=1
            .andExpect(jsonPath("$[1].roleId", is(1)))
            .andExpect(jsonPath("$[1].skillId", is(2)))
            .andExpect(jsonPath("$[1].confirmedCount", is(1)))
            .andExpect(jsonPath("$[1].disputedCount", is(1)))
            .andExpect(jsonPath("$[1].confidence", closeTo(0.5, TOLERANCE)))
            // Rank 3: (2, 1) total=2, roleId=2
            .andExpect(jsonPath("$[2].roleId", is(2)))
            .andExpect(jsonPath("$[2].skillId", is(1)))
            .andExpect(jsonPath("$[2].confirmedCount", is(2)))
            .andExpect(jsonPath("$[2].disputedCount", is(0)))
            .andExpect(jsonPath("$[2].confidence", closeTo(0.75, TOLERANCE)))
            // Rank 4: (1, 3) total=1
            .andExpect(jsonPath("$[3].roleId", is(1)))
            .andExpect(jsonPath("$[3].skillId", is(3)))
            .andExpect(jsonPath("$[3].confirmedCount", is(0)))
            .andExpect(jsonPath("$[3].disputedCount", is(1)))
            .andExpect(jsonPath("$[3].confidence", closeTo(0.333, TOLERANCE)));

        // Test 100-row cap: add 105 distinct skills and validations
        for (int i = 10; i <= 120; i++) {
            jdbcTemplate.execute(String.format(
                "INSERT INTO skill (id, name, category, active) VALUES (%d, 'Extra Skill %d', 'Cat', true)",
                i, i
            ));
            jdbcTemplate.execute(String.format(
                "INSERT INTO employer_validation (role_id, skill_id, status) VALUES (1, %d, 'CONFIRMED')",
                i
            ));
        }

        mockMvc.perform(get("/api/validations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(100)));
    }

    @Test
    void testTotalValidationsCapReturns429() throws Exception {
        // Create an isolated controller instance with maxTotal = 2
        ValidationService cappedService = new ValidationService(
            employerValidationRepository,
            roleRepository,
            skillRepository,
            jdbcTemplate,
            2
        );
        ValidationController cappedController = new ValidationController(cappedService);
        MockMvc cappedMockMvc = MockMvcBuilders.standaloneSetup(cappedController).build();

        // 1st POST succeeds
        cappedMockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 1, \"status\": \"CONFIRMED\"}"))
            .andExpect(status().isCreated());

        // 2nd POST succeeds
        cappedMockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 2, \"status\": \"DISPUTED\"}"))
            .andExpect(status().isCreated());

        // 3rd POST rejected with 429
        cappedMockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 3, \"status\": \"CONFIRMED\"}"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.error", containsString("Maximum total validations limit reached (2)")))
            .andExpect(jsonPath("$.message", containsString("Maximum total validations limit reached (2)")));
    }

    @Test
    void testDemandSkillsCarriesNewFieldsAndExistingUnchanged() throws Exception {
        // Without any validations:
        // S1 (Java): 90 / 200 = 0.45
        // S2 (SQL): 60 / 200 = 0.30
        // S3 (Python): 30 / 200 = 0.15
        mockMvc.perform(get("/api/demand/skills").param("role", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostingsInScope", is(200)))
            .andExpect(jsonPath("$.skills", hasSize(3)))
            // Skill 1
            .andExpect(jsonPath("$.skills[0].skillId", is(1)))
            .andExpect(jsonPath("$.skills[0].name", is("Java")))
            .andExpect(jsonPath("$.skills[0].postingsWithSkill", is(90)))
            .andExpect(jsonPath("$.skills[0].share", closeTo(0.45, TOLERANCE)))
            .andExpect(jsonPath("$.skills[0].confirmedCount", is(0)))
            .andExpect(jsonPath("$.skills[0].disputedCount", is(0)))
            .andExpect(jsonPath("$.skills[0].confidence", closeTo(0.5, TOLERANCE)))
            // Skill 2
            .andExpect(jsonPath("$.skills[1].skillId", is(2)))
            .andExpect(jsonPath("$.skills[1].name", is("SQL")))
            .andExpect(jsonPath("$.skills[1].postingsWithSkill", is(60)))
            .andExpect(jsonPath("$.skills[1].share", closeTo(0.30, TOLERANCE)))
            .andExpect(jsonPath("$.skills[1].confirmedCount", is(0)))
            .andExpect(jsonPath("$.skills[1].disputedCount", is(0)))
            .andExpect(jsonPath("$.skills[1].confidence", closeTo(0.5, TOLERANCE)));
    }

    @Test
    void testDemandCountsAndSharesUnchangedAfterValidationsAdded() throws Exception {
        // Add 1 confirmation for Skill 1 (Java)
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 1, \"status\": \"CONFIRMED\"}"))
            .andExpect(status().isCreated());

        // Add 1 dispute for Skill 2 (SQL)
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\": 1, \"skillId\": 2, \"status\": \"DISPUTED\"}"))
            .andExpect(status().isCreated());

        // Demand counts and shares must remain completely identical
        mockMvc.perform(get("/api/demand/skills").param("role", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPostingsInScope", is(200)))
            .andExpect(jsonPath("$.skills", hasSize(3)))
            // Skill 1 (Java): count and share identical; confidence updated to 0.667
            .andExpect(jsonPath("$.skills[0].skillId", is(1)))
            .andExpect(jsonPath("$.skills[0].postingsWithSkill", is(90)))
            .andExpect(jsonPath("$.skills[0].share", closeTo(0.45, TOLERANCE)))
            .andExpect(jsonPath("$.skills[0].confirmedCount", is(1)))
            .andExpect(jsonPath("$.skills[0].disputedCount", is(0)))
            .andExpect(jsonPath("$.skills[0].confidence", closeTo(0.667, TOLERANCE)))
            // Skill 2 (SQL): count and share identical; confidence updated to 0.333
            .andExpect(jsonPath("$.skills[1].skillId", is(2)))
            .andExpect(jsonPath("$.skills[1].postingsWithSkill", is(60)))
            .andExpect(jsonPath("$.skills[1].share", closeTo(0.30, TOLERANCE)))
            .andExpect(jsonPath("$.skills[1].confirmedCount", is(0)))
            .andExpect(jsonPath("$.skills[1].disputedCount", is(1)))
            .andExpect(jsonPath("$.skills[1].confidence", closeTo(0.333, TOLERANCE)))
            // Skill 3 (Python): 0 validations, confidence 0.5
            .andExpect(jsonPath("$.skills[2].skillId", is(3)))
            .andExpect(jsonPath("$.skills[2].postingsWithSkill", is(30)))
            .andExpect(jsonPath("$.skills[2].share", closeTo(0.15, TOLERANCE)))
            .andExpect(jsonPath("$.skills[2].confirmedCount", is(0)))
            .andExpect(jsonPath("$.skills[2].disputedCount", is(0)))
            .andExpect(jsonPath("$.skills[2].confidence", closeTo(0.5, TOLERANCE)));
    }

    @Test
    void testNotesNotExposedInList() throws Exception {
        mockMvc.perform(post("/api/validations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "roleId": 1,
                        "skillId": 1,
                        "status": "CONFIRMED",
                        "note": "Confidential employer review note"
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/validations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].roleId", is(1)))
            .andExpect(jsonPath("$[0].skillId", is(1)))
            .andExpect(jsonPath("$[0].confirmedCount", is(1)))
            .andExpect(jsonPath("$[0].disputedCount", is(0)))
            .andExpect(jsonPath("$[0].confidence", closeTo(0.667, TOLERANCE)))
            .andExpect(jsonPath("$[0].note").doesNotExist())
            .andExpect(jsonPath("$[0].notes").doesNotExist());
    }
}
