package com.skillpath.backend.controller;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
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
class SkillControllerTest {

    @Autowired
    private SkillController skillController;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(skillController).build();
        cleanTables();
        seedHandBuiltDataset();
    }

    @AfterEach
    void tearDown() {
        cleanTables();
    }

    private void cleanTables() {
        jdbcTemplate.execute("DELETE FROM demand_monthly");
        jdbcTemplate.execute("DELETE FROM posting_skill");
        jdbcTemplate.execute("DELETE FROM course_offering");
        jdbcTemplate.execute("DELETE FROM placement_outcome");
        jdbcTemplate.execute("DELETE FROM course_role");
        jdbcTemplate.execute("DELETE FROM course_skill");
        jdbcTemplate.execute("DELETE FROM course");
        jdbcTemplate.execute("DELETE FROM skill_alias");
        jdbcTemplate.execute("DELETE FROM job_posting");
        jdbcTemplate.execute("DELETE FROM skill");
        jdbcTemplate.execute("DELETE FROM role");
        jdbcTemplate.execute("DELETE FROM district");
    }

    /**
     * Hand-built test dataset:
     * Skills:
     *   1: Python (Category: Programming & Software, active: true)
     *   2: Java (Category: Programming & Software, active: true)
     *   3: React (Category: Web & Mobile, active: true)
     *   4: Docker (Category: Cloud & DevOps, active: true)
     *
     * Skill Aliases:
     *   Skill 1 (Python): "Python3", "Py"
     *   Skill 2 (Java): "Java SE"
     *   Skill 3 (React): "ReactJS"
     *   Skill 4 (Docker): none
     *
     * Expected sorted by name:
     *   Index 0: Docker (id 4, Cloud & DevOps, aliases: [])
     *   Index 1: Java (id 2, Programming & Software, aliases: ["Java SE"])
     *   Index 2: Python (id 1, Programming & Software, aliases: ["Py", "Python3"])
     *   Index 3: React (id 3, Web & Mobile, aliases: ["ReactJS"])
     */
    private void seedHandBuiltDataset() {
        jdbcTemplate.execute(
            "INSERT INTO skill (id, name, category, active) VALUES " +
            "(1, 'Python', 'Programming & Software', true)," +
            "(2, 'Java', 'Programming & Software', true)," +
            "(3, 'React', 'Web & Mobile', true)," +
            "(4, 'Docker', 'Cloud & DevOps', true)"
        );

        jdbcTemplate.execute(
            "INSERT INTO skill_alias (skill_id, alias) VALUES " +
            "(1, 'Python3')," +
            "(1, 'Py')," +
            "(2, 'Java SE')," +
            "(3, 'ReactJS')"
        );
    }

    @Test
    void getSkills_returnsSortedByNameWithCorrectFieldNames() throws Exception {
        // Expected total count: 4 skills
        // Response fields: id, name, category, aliases
        // Ordered by name ASC: Docker, Java, Python, React
        mockMvc.perform(get("/api/skills"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(4)))
            // Item 0: Docker
            .andExpect(jsonPath("$[0].id", equalTo(4)))
            .andExpect(jsonPath("$[0].name", equalTo("Docker")))
            .andExpect(jsonPath("$[0].category", equalTo("Cloud & DevOps")))
            .andExpect(jsonPath("$[0].aliases", empty()))
            // Item 1: Java
            .andExpect(jsonPath("$[1].id", equalTo(2)))
            .andExpect(jsonPath("$[1].name", equalTo("Java")))
            .andExpect(jsonPath("$[1].category", equalTo("Programming & Software")))
            // Item 2: Python
            .andExpect(jsonPath("$[2].id", equalTo(1)))
            .andExpect(jsonPath("$[2].name", equalTo("Python")))
            .andExpect(jsonPath("$[2].category", equalTo("Programming & Software")))
            // Item 3: React
            .andExpect(jsonPath("$[3].id", equalTo(3)))
            .andExpect(jsonPath("$[3].name", equalTo("React")))
            .andExpect(jsonPath("$[3].category", equalTo("Web & Mobile")));
    }

    @Test
    void getSkills_aliasesAttachedToRightSkillAndSorted() throws Exception {
        // Skill 1 (Python) should have aliases ["Py", "Python3"] sorted alphabetically
        // Skill 2 (Java) should have alias ["Java SE"]
        // Skill 3 (React) should have alias ["ReactJS"]
        mockMvc.perform(get("/api/skills"))
            .andExpect(status().isOk())
            // Python is at index 2
            .andExpect(jsonPath("$[2].name", equalTo("Python")))
            .andExpect(jsonPath("$[2].aliases", hasSize(2)))
            .andExpect(jsonPath("$[2].aliases[0]", equalTo("Py")))
            .andExpect(jsonPath("$[2].aliases[1]", equalTo("Python3")))
            // Java is at index 1
            .andExpect(jsonPath("$[1].name", equalTo("Java")))
            .andExpect(jsonPath("$[1].aliases", hasSize(1)))
            .andExpect(jsonPath("$[1].aliases[0]", equalTo("Java SE")))
            // React is at index 3
            .andExpect(jsonPath("$[3].name", equalTo("React")))
            .andExpect(jsonPath("$[3].aliases", hasSize(1)))
            .andExpect(jsonPath("$[3].aliases[0]", equalTo("ReactJS")));
    }

    @Test
    void getSkills_skillWithoutAliasesReturnsEmptyList() throws Exception {
        // Skill 4 (Docker) has no rows in skill_alias table
        // Expect empty list [] (not null, not absent)
        mockMvc.perform(get("/api/skills"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name", equalTo("Docker")))
            .andExpect(jsonPath("$[0].aliases", empty()));
    }
}
