package com.skillpath.backend.generator;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CourseGenerator {

    private static final Logger log = LoggerFactory.getLogger(CourseGenerator.class);
    private static final int BATCH_SIZE = 1000;

    private final JdbcTemplate jdbcTemplate;
    private final GeneratorProperties properties;

    @org.springframework.beans.factory.annotation.Autowired
    public CourseGenerator(JdbcTemplate jdbcTemplate, GeneratorProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    public CourseGenerator(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, new GeneratorProperties());
    }

    private record CourseTemplate(
        String name,
        String sector,
        int durationWeeks,
        List<String> linkedRoles,
        List<String> candidateSkills
    ) {
        CourseTemplate(String name, String sector, int durationWeeks, String primaryRole, List<String> candidateSkills) {
            this(name, sector, durationWeeks, List.of(primaryRole), candidateSkills);
        }
    }

    private record CourseRow(long id, String name, int durationWeeks, String sector) {}
    private record CourseSkillRow(long courseId, long skillId, String taughtLevel) {}
    private record CourseRoleRow(long courseId, long roleId) {}
    private record CourseOfferingRow(long courseId, long districtId, int year, int seats, int trainers) {}
    private record PlacementOutcomeRow(long courseId, long districtId, int year, double placedPct) {}

    // Planted UNTAUGHT skill: Critical Thinking & Problem Solving (Rank #3 nationally with 25.3% 3-month demand share; 0 courses teach it)
    // Business Communication (Rank #2 nationally) is also kept untaught across all courses.
    private static final List<CourseTemplate> COURSE_TEMPLATES = List.of(
        // Existing 20 courses preserved in exact order and IDs
        new CourseTemplate(
            "Full Stack Web Development",
            Sectors.IT_AND_SOFTWARE,
            16,
            "Software Engineer",
            List.of("JavaScript", "TypeScript", "React", "Node.js", "HTML5 & CSS3", "Java", "SQL", "Object-Oriented Programming")
        ),
        // Planted OVERSUPPLIED course: Course 2 (Data Science & Machine Learning)
        // In at least 60% of the districts where it is offered (here 100%), factor = 3.0 to 4.5
        new CourseTemplate(
            "Data Science & Machine Learning",
            Sectors.IT_AND_SOFTWARE,
            14,
            "Data Scientist",
            List.of("Python", "Machine Learning", "Data Analysis", "Data Visualization", "SQL", "Artificial Intelligence", "Deep Learning", "Natural Language Processing")
        ),
        new CourseTemplate(
            "DevOps & Cloud Infrastructure",
            Sectors.IT_AND_SOFTWARE,
            12,
            "DevOps Engineer",
            List.of("Docker", "Kubernetes", "Amazon Web Services", "Continuous Integration & Deployment", "Linux System Administration", "Google Cloud Platform", "Microsoft Azure", "Python")
        ),
        // Planted LOW-COVERAGE course: Course 4 (Modern Frontend Engineering) linked to Software Engineer (Role 1)
        // Teaches only 1 of Software Engineer's top 15 skills (HTML5 & CSS3) and the rest from low-demand/occasional skills for that role
        new CourseTemplate(
            "Modern Frontend Engineering",
            Sectors.IT_AND_SOFTWARE,
            10,
            "Software Engineer",
            List.of("HTML5 & CSS3", "Flutter", "Android Development", "C#", "C++", "Go")
        ),
        new CourseTemplate(
            "Backend Systems Architecture",
            Sectors.IT_AND_SOFTWARE,
            12,
            "Software Engineer",
            List.of("Java", "Go", "SQL", "Data Structures & Algorithms", "Object-Oriented Programming", "Docker", "Amazon Web Services", "Linux System Administration")
        ),
        new CourseTemplate(
            "Embedded Systems & IoT Engineering",
            Sectors.ELECTRONICS_AND_ELECTRICAL,
            14,
            "Embedded Systems Engineer",
            List.of("Embedded C", "Microcontrollers", "Internet of Things", "PCB Design", "VLSI Design", "PLC Programming")
        ),
        new CourseTemplate(
            "Industrial Electrical Maintenance",
            Sectors.ELECTRONICS_AND_ELECTRICAL,
            8,
            "Electrical Maintenance Technician",
            List.of("Electrical Power Systems", "PLC Programming", "HVAC Systems", "Industrial Safety & OSHA", "Microcontrollers", "Total Productive Maintenance")
        ),
        new CourseTemplate(
            "PCB Design & Circuit Fabrication",
            Sectors.ELECTRONICS_AND_ELECTRICAL,
            10,
            "Embedded Systems Engineer",
            List.of("PCB Design", "VLSI Design", "Embedded C", "Microcontrollers", "AutoCAD", "SolidWorks")
        ),
        new CourseTemplate(
            "CNC Machining & Precision Turning",
            Sectors.MANUFACTURING_AND_AUTOMOTIVE,
            12,
            "CNC Machine Operator",
            List.of("CNC Machining", "AutoCAD", "SolidWorks", "Pneumatics & Hydraulics", "Quality Control & Assurance", "Lean Manufacturing")
        ),
        new CourseTemplate(
            "Quality Control & Industrial Inspection",
            Sectors.MANUFACTURING_AND_AUTOMOTIVE,
            8,
            "Quality Control Inspector",
            List.of("Quality Control & Assurance", "Six Sigma", "Lean Manufacturing", "Total Productive Maintenance", "Industrial Safety & OSHA", "AutoCAD")
        ),
        new CourseTemplate(
            "Automated Manufacturing & Robotics",
            Sectors.MANUFACTURING_AND_AUTOMOTIVE,
            14,
            "Production Engineer",
            List.of("Lean Manufacturing", "Six Sigma", "Total Productive Maintenance", "Pneumatics & Hydraulics", "SolidWorks", "CNC Machining", "Industrial Safety & OSHA")
        ),
        new CourseTemplate(
            "General Duty Healthcare Assistance",
            Sectors.HEALTHCARE,
            12,
            "General Duty Medical Assistant",
            List.of("Patient Assessment", "Basic Life Support", "Infection Prevention & Control", "Medical Record Documentation", "Pharmacy Dispensing", "Workplace Ethics & Compliance")
        ),
        new CourseTemplate(
            "Phlebotomy & Clinical Lab Diagnostics",
            Sectors.HEALTHCARE,
            8,
            "Phlebotomy Technician",
            List.of("Medical Phlebotomy", "Clinical Laboratory Diagnostics", "Infection Prevention & Control", "Patient Assessment", "Medical Record Documentation", "Basic Life Support")
        ),
        new CourseTemplate(
            "Modern Retail Store Operations",
            Sectors.RETAIL_AND_ECOMMERCE,
            8,
            "Retail Store Executive",
            List.of("Retail Store Inventory", "Point of Sale Systems", "Customer Relationship Management", "Visual Merchandising", "Sales Negotiation")
        ),
        new CourseTemplate(
            "E-Commerce Operations & Digital Marketing",
            Sectors.RETAIL_AND_ECOMMERCE,
            10,
            "Digital Sales Specialist",
            List.of("Digital Marketing", "Customer Relationship Management", "Sales Negotiation", "Visual Merchandising", "Point of Sale Systems", "Data Analysis")
        ),
        new CourseTemplate(
            "Financial Accounting & Tally Prime",
            Sectors.BANKING_AND_FINANCE,
            8,
            "Accounts Executive",
            List.of("Financial Accounting", "Tally Prime", "Goods & Services Tax Filing", "Cost Accounting", "Internal Auditing", "Workplace Ethics & Compliance")
        ),
        new CourseTemplate(
            "Financial Analytics & Risk Modeling",
            Sectors.BANKING_AND_FINANCE,
            12,
            "Financial Analyst",
            List.of("Financial Modeling", "Risk Assessment", "Financial Accounting", "Credit Analysis", "Data Analysis", "SQL")
        ),
        new CourseTemplate(
            "Retail Banking & Loan Processing",
            Sectors.BANKING_AND_FINANCE,
            10,
            "Loan Processing Officer",
            List.of("Credit Analysis", "Risk Assessment", "Financial Accounting", "Customer Relationship Management", "Internal Auditing", "Sales Negotiation")
        ),
        new CourseTemplate(
            "Warehouse Operations & Inventory Management",
            Sectors.LOGISTICS,
            8,
            "Warehouse Supervisor",
            List.of("Warehouse Inventory Management", "Material Handling Equipment", "Cold Chain Logistics", "Industrial Safety & OSHA", "Customer Relationship Management", "Time Management")
        ),
        new CourseTemplate(
            "Supply Chain Coordination & Freight Logistics",
            Sectors.LOGISTICS,
            10,
            "Logistics Coordinator",
            List.of("Supply Chain Analytics", "Freight Forwarding", "Procurement & Sourcing", "Fleet Routing & Dispatch", "Warehouse Inventory Management", "Cold Chain Logistics")
        ),
        // Planted OBSOLETE-LOOKING course: Course 21 (Legacy Retail & Point of Sale Operations)
        // Mainly teaches declining skills (Retail Store Inventory, Point of Sale Systems) linked to Retail Store Executive
        new CourseTemplate(
            "Legacy Retail & Point of Sale Operations",
            Sectors.RETAIL_AND_ECOMMERCE,
            8,
            List.of("Retail Store Executive"),
            List.of("Retail Store Inventory", "Point of Sale Systems", "Visual Merchandising", "Customer Relationship Management", "Tally Prime")
        ),
        // Additional normal courses (total 24)
        new CourseTemplate(
            "Supply Chain Analytics & Sourcing",
            Sectors.LOGISTICS,
            10,
            List.of("Supply Chain Associate", "Logistics Coordinator"),
            List.of("Procurement & Sourcing", "Supply Chain Analytics", "Freight Forwarding", "Warehouse Inventory Management", "Sales Negotiation", "Cost Accounting")
        ),
        new CourseTemplate(
            "Cloud Security & DevSecOps",
            Sectors.IT_AND_SOFTWARE,
            12,
            List.of("DevOps Engineer", "Software Engineer"),
            List.of("Docker", "Kubernetes", "Continuous Integration & Deployment", "Amazon Web Services", "Linux System Administration", "Python", "Google Cloud Platform")
        ),
        new CourseTemplate(
            "Industrial Automation & PLC Systems",
            Sectors.ELECTRONICS_AND_ELECTRICAL,
            12,
            List.of("Electrical Maintenance Technician", "Embedded Systems Engineer"),
            List.of("Electrical Power Systems", "PLC Programming", "HVAC Systems", "Total Productive Maintenance", "Microcontrollers", "Industrial Safety & OSHA")
        )
    );

    @Transactional
    public void run() {
        run(properties.getSeed());
    }

    @Transactional
    public void run(long seed) {
        Long existingCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM course", Long.class);
        if (existingCount != null && existingCount > 0) {
            throw new IllegalStateException("Course table is not empty. Clear database before running course generator.");
        }

        SeededRandoms randoms = new SeededRandoms(seed);
        Random skillRng = randoms.forStream("courses.skills");
        Random levelRng = randoms.forStream("courses.levels");
        Random offeringRng = randoms.forStream("courses.offerings");

        Map<String, Long> skillIdsByName = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        jdbcTemplate.query("SELECT id, name FROM skill", rs -> {
            skillIdsByName.put(rs.getString("name"), rs.getLong("id"));
        });

        Map<String, Long> roleIdsByName = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        jdbcTemplate.query("SELECT id, name FROM role", rs -> {
            roleIdsByName.put(rs.getString("name"), rs.getLong("id"));
        });

        List<Long> districtIds = jdbcTemplate.queryForList("SELECT id FROM district ORDER BY id", Long.class);

        // Pre-query job postings over the last 12 months ending at latest posted_on date
        Date maxDateSql = jdbcTemplate.queryForObject("SELECT MAX(posted_on) FROM job_posting", Date.class);
        LocalDate windowEnd = (maxDateSql != null) ? maxDateSql.toLocalDate() : properties.getAsOfDate();
        LocalDate windowStart = windowEnd.minusMonths(12).plusDays(1);

        Map<Long, Map<Long, Integer>> postingsByDistrictAndRole = new TreeMap<>();
        if (maxDateSql != null) {
            jdbcTemplate.query(
                "SELECT district_id, role_id, COUNT(*) AS cnt FROM job_posting WHERE posted_on >= ? AND posted_on <= ? GROUP BY district_id, role_id",
                rs -> {
                    long dId = rs.getLong("district_id");
                    long rId = rs.getLong("role_id");
                    int count = rs.getInt("cnt");
                    postingsByDistrictAndRole.computeIfAbsent(dId, k -> new TreeMap<>()).put(rId, count);
                },
                Date.valueOf(windowStart),
                Date.valueOf(windowEnd)
            );
        }

        List<CourseRow> courseRows = new ArrayList<>(COURSE_TEMPLATES.size());
        List<CourseSkillRow> courseSkillRows = new ArrayList<>();
        List<CourseRoleRow> courseRoleRows = new ArrayList<>();
        List<CourseOfferingRow> offeringRows = new ArrayList<>();
        List<PlacementOutcomeRow> placementRows = new ArrayList<>();

        long courseId = 1;
        for (CourseTemplate template : COURSE_TEMPLATES) {
            courseRows.add(new CourseRow(courseId, template.name(), template.durationWeeks(), template.sector()));

            List<Long> linkedRoleIds = new ArrayList<>();
            for (String roleName : template.linkedRoles()) {
                Long roleId = roleIdsByName.get(roleName);
                if (roleId != null) {
                    courseRoleRows.add(new CourseRoleRow(courseId, roleId));
                    linkedRoleIds.add(roleId);
                }
            }

            // Each course teaches 4-8 existing skills
            List<String> pool = new ArrayList<>(template.candidateSkills());
            for (int i = pool.size() - 1; i > 0; i--) {
                int j = skillRng.nextInt(i + 1);
                String tmp = pool.get(i);
                pool.set(i, pool.get(j));
                pool.set(j, tmp);
            }
            int minSkills = 4;
            int maxSkills = Math.min(8, pool.size());
            int numSkills = minSkills + (maxSkills > minSkills ? skillRng.nextInt(maxSkills - minSkills + 1) : 0);
            for (int i = 0; i < numSkills; i++) {
                String skillName = pool.get(i);
                Long skillId = skillIdsByName.get(skillName);
                if (skillId != null) {
                    String level = Levels.REQUIRED_LEVELS.get(levelRng.nextInt(Levels.REQUIRED_LEVELS.size()));
                    courseSkillRows.add(new CourseSkillRow(courseId, skillId, level));
                }
            }

            // Course offerings across 3-5 districts for 2025 and 2026
            int numDistricts = 3 + offeringRng.nextInt(3);
            Set<Long> pickedDistricts = new TreeSet<>();
            if (!districtIds.isEmpty()) {
                while (pickedDistricts.size() < numDistricts && pickedDistricts.size() < districtIds.size()) {
                    pickedDistricts.add(districtIds.get(offeringRng.nextInt(districtIds.size())));
                }
            }

            int[] years = new int[]{2025, 2026};
            for (Long districtId : pickedDistricts) {
                int baseOpenings = 0;
                Map<Long, Integer> roleMap = postingsByDistrictAndRole.get(districtId);
                if (roleMap != null) {
                    for (Long rId : linkedRoleIds) {
                        baseOpenings += roleMap.getOrDefault(rId, 0);
                    }
                }

                for (int year : years) {
                    double factor;
                    if (courseId == 2) {
                        // Planted OVERSUPPLIED course: Course 2 (Data Science & Machine Learning)
                        // In at least 60% of districts where offered (here 100%), factor = 3.0 to 4.5
                        factor = 3.0 + offeringRng.nextDouble() * 1.5;
                    } else {
                        factor = 0.6 + offeringRng.nextDouble() * 0.8;
                    }

                    int seats = Math.max(10, (int) Math.round(baseOpenings * factor));
                    int trainers = Math.max(1, (int) Math.round((double) seats / 25.0));
                    offeringRows.add(new CourseOfferingRow(courseId, districtId, year, seats, trainers));

                    double placedPct = 55.0 + offeringRng.nextInt(35);
                    placementRows.add(new PlacementOutcomeRow(courseId, districtId, year, placedPct));
                }
            }

            courseId++;
        }

        // Batch inserts
        jdbcTemplate.batchUpdate(
            "INSERT INTO course (id, name, duration_weeks, sector) VALUES (?, ?, ?, ?)",
            courseRows,
            BATCH_SIZE,
            (ps, c) -> {
                ps.setLong(1, c.id());
                ps.setString(2, c.name());
                ps.setInt(3, c.durationWeeks());
                ps.setString(4, c.sector());
            }
        );

        jdbcTemplate.batchUpdate(
            "INSERT INTO course_skill (course_id, skill_id, taught_level) VALUES (?, ?, ?)",
            courseSkillRows,
            BATCH_SIZE,
            (ps, cs) -> {
                ps.setLong(1, cs.courseId());
                ps.setLong(2, cs.skillId());
                ps.setString(3, cs.taughtLevel());
            }
        );

        jdbcTemplate.batchUpdate(
            "INSERT INTO course_role (course_id, role_id) VALUES (?, ?)",
            courseRoleRows,
            BATCH_SIZE,
            (ps, cr) -> {
                ps.setLong(1, cr.courseId());
                ps.setLong(2, cr.roleId());
            }
        );

        jdbcTemplate.batchUpdate(
            "INSERT INTO course_offering (course_id, district_id, \"year\", seats, trainers) VALUES (?, ?, ?, ?, ?)",
            offeringRows,
            BATCH_SIZE,
            (ps, co) -> {
                ps.setLong(1, co.courseId());
                ps.setLong(2, co.districtId());
                ps.setInt(3, co.year());
                ps.setInt(4, co.seats());
                ps.setInt(5, co.trainers());
            }
        );

        jdbcTemplate.batchUpdate(
            "INSERT INTO placement_outcome (course_id, district_id, \"year\", placed_pct) VALUES (?, ?, ?, ?)",
            placementRows,
            BATCH_SIZE,
            (ps, po) -> {
                ps.setLong(1, po.courseId());
                ps.setLong(2, po.districtId());
                ps.setInt(3, po.year());
                ps.setDouble(4, po.placedPct());
            }
        );

        log.info("Seeded course generator tables: course={}, course_skill={}, course_role={}, course_offering={}, placement_outcome={}",
            courseRows.size(), courseSkillRows.size(), courseRoleRows.size(), offeringRows.size(), placementRows.size());
    }
}
