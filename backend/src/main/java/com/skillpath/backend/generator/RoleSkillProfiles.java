package com.skillpath.backend.generator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Synthetic profile mappings from roles to skills across three base probability tiers:
 * core (0.85 - 0.95), common (0.40 - 0.65), and occasional (0.08 - 0.15).
 * All probabilities and weights are synthetic and illustrative design choices.
 */
public final class RoleSkillProfiles {

    public enum Tier {
        CORE,
        COMMON,
        OCCASIONAL
    }

    public record SkillProbability(String skillName, double baseProbability, Tier tier) {}

    public record LevelMix(double entry, double mid, double senior) {
        public LevelMix {
            if (Math.abs(entry + mid + senior - 1.0) > 1e-6) {
                throw new IllegalArgumentException("Level mix probabilities must sum to 1.0");
            }
        }
    }

    public record RoleProfile(
        String roleName,
        int roleWeight,
        LevelMix levelMix,
        List<SkillProbability> skills,
        SkillProbability highestBaseSkill
    ) {}

    private static final List<RoleProfile> ALL_PROFILES;
    private static final Map<String, RoleProfile> BY_NAME_MAP;

    static {
        List<RoleProfile> profiles = new ArrayList<>();

        // 1. Software Engineer
        profiles.add(buildProfile(
            "Software Engineer",
            4,
            new LevelMix(0.35, 0.45, 0.20),
            List.of(
                skill("Data Structures & Algorithms", 0.95, Tier.CORE),
                skill("Object-Oriented Programming", 0.92, Tier.CORE),
                skill("Java", 0.90, Tier.CORE),
                skill("SQL", 0.88, Tier.CORE),
                skill("JavaScript", 0.85, Tier.CORE),

                skill("Python", 0.55, Tier.COMMON),
                skill("React", 0.50, Tier.COMMON),
                skill("Node.js", 0.50, Tier.COMMON),
                skill("HTML5 & CSS3", 0.45, Tier.COMMON),
                skill("Docker", 0.45, Tier.COMMON),
                skill("Kubernetes", 0.45, Tier.COMMON),
                skill("Angular", 0.45, Tier.COMMON),

                skill("TypeScript", 0.15, Tier.OCCASIONAL),
                skill("Business Communication", 0.15, Tier.OCCASIONAL),
                skill("Android Development", 0.12, Tier.OCCASIONAL),
                skill("C++", 0.12, Tier.OCCASIONAL),
                skill("C#", 0.12, Tier.OCCASIONAL),
                skill("Go", 0.10, Tier.OCCASIONAL),
                skill("Flutter", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 2. Data Scientist
        profiles.add(buildProfile(
            "Data Scientist",
            2,
            new LevelMix(0.25, 0.50, 0.25),
            List.of(
                skill("Python", 0.95, Tier.CORE),
                skill("SQL", 0.92, Tier.CORE),
                skill("Data Visualization", 0.88, Tier.CORE),
                skill("Artificial Intelligence", 0.86, Tier.CORE),
                skill("Deep Learning", 0.85, Tier.CORE),

                skill("Critical Thinking & Problem Solving", 0.55, Tier.COMMON),
                skill("Data Structures & Algorithms", 0.50, Tier.COMMON),
                skill("Machine Learning", 0.50, Tier.COMMON),
                skill("Natural Language Processing", 0.45, Tier.COMMON),
                skill("Computer Vision", 0.40, Tier.COMMON),

                skill("Google Cloud Platform", 0.15, Tier.OCCASIONAL),
                skill("Amazon Web Services", 0.15, Tier.OCCASIONAL),
                skill("Business Communication", 0.12, Tier.OCCASIONAL)
            )
        ));

        // 3. DevOps Engineer
        profiles.add(buildProfile(
            "DevOps Engineer",
            2,
            new LevelMix(0.20, 0.55, 0.25),
            List.of(
                skill("Docker", 0.95, Tier.CORE),
                skill("Linux System Administration", 0.92, Tier.CORE),
                skill("Continuous Integration & Deployment", 0.90, Tier.CORE),
                skill("Amazon Web Services", 0.88, Tier.CORE),
                skill("Python", 0.85, Tier.CORE),

                skill("Kubernetes", 0.50, Tier.COMMON),
                skill("Microsoft Azure", 0.45, Tier.COMMON),
                skill("Go", 0.45, Tier.COMMON),
                skill("Google Cloud Platform", 0.40, Tier.COMMON),

                skill("Team Leadership", 0.15, Tier.OCCASIONAL),
                skill("Java", 0.12, Tier.OCCASIONAL),
                skill("Rust", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 4. Embedded Systems Engineer
        profiles.add(buildProfile(
            "Embedded Systems Engineer",
            2,
            new LevelMix(0.35, 0.45, 0.20),
            List.of(
                skill("Embedded C", 0.95, Tier.CORE),
                skill("Microcontrollers", 0.92, Tier.CORE),
                skill("PCB Design", 0.88, Tier.CORE),
                skill("C++", 0.86, Tier.CORE),
                skill("VLSI Design", 0.85, Tier.CORE),

                skill("Internet of Things", 0.50, Tier.COMMON),
                skill("Critical Thinking & Problem Solving", 0.50, Tier.COMMON),
                skill("PLC Programming", 0.45, Tier.COMMON),
                skill("Python", 0.40, Tier.COMMON),

                skill("Linux System Administration", 0.15, Tier.OCCASIONAL),
                skill("Electrical Power Systems", 0.12, Tier.OCCASIONAL),
                skill("Workplace Ethics & Compliance", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 5. Electrical Maintenance Technician
        profiles.add(buildProfile(
            "Electrical Maintenance Technician",
            2,
            new LevelMix(0.50, 0.40, 0.10),
            List.of(
                skill("Electrical Power Systems", 0.95, Tier.CORE),
                skill("Industrial Safety & OSHA", 0.92, Tier.CORE),
                skill("HVAC Systems", 0.88, Tier.CORE),
                skill("PLC Programming", 0.86, Tier.CORE),
                skill("Total Productive Maintenance", 0.85, Tier.CORE),

                skill("Pneumatics & Hydraulics", 0.50, Tier.COMMON),
                skill("Time Management", 0.50, Tier.COMMON),
                skill("AutoCAD", 0.45, Tier.COMMON),
                skill("Microcontrollers", 0.40, Tier.COMMON),

                skill("Quality Control & Assurance", 0.15, Tier.OCCASIONAL),
                skill("Workplace Ethics & Compliance", 0.12, Tier.OCCASIONAL),
                skill("Embedded C", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 6. CNC Machine Operator
        profiles.add(buildProfile(
            "CNC Machine Operator",
            2,
            new LevelMix(0.55, 0.35, 0.10),
            List.of(
                skill("CNC Machining", 0.95, Tier.CORE),
                skill("Industrial Safety & OSHA", 0.92, Tier.CORE),
                skill("Quality Control & Assurance", 0.88, Tier.CORE),
                skill("Total Productive Maintenance", 0.86, Tier.CORE),
                skill("AutoCAD", 0.85, Tier.CORE),

                skill("SolidWorks", 0.45, Tier.COMMON),
                skill("Lean Manufacturing", 0.45, Tier.COMMON),
                skill("Time Management", 0.45, Tier.COMMON),
                skill("Material Handling Equipment", 0.40, Tier.COMMON),

                skill("Six Sigma", 0.12, Tier.OCCASIONAL),
                skill("Electrical Power Systems", 0.12, Tier.OCCASIONAL),
                skill("Workplace Ethics & Compliance", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 7. Quality Control Inspector
        profiles.add(buildProfile(
            "Quality Control Inspector",
            2,
            new LevelMix(0.45, 0.45, 0.10),
            List.of(
                skill("Quality Control & Assurance", 0.95, Tier.CORE),
                skill("Industrial Safety & OSHA", 0.92, Tier.CORE),
                skill("Six Sigma", 0.88, Tier.CORE),
                skill("Lean Manufacturing", 0.86, Tier.CORE),
                skill("Total Productive Maintenance", 0.85, Tier.CORE),

                skill("Critical Thinking & Problem Solving", 0.55, Tier.COMMON),
                skill("SolidWorks", 0.45, Tier.COMMON),
                skill("AutoCAD", 0.45, Tier.COMMON),
                skill("Internal Auditing", 0.40, Tier.COMMON),

                skill("CNC Machining", 0.15, Tier.OCCASIONAL),
                skill("Workplace Ethics & Compliance", 0.15, Tier.OCCASIONAL),
                skill("Business Communication", 0.12, Tier.OCCASIONAL)
            )
        ));

        // 8. Production Engineer
        profiles.add(buildProfile(
            "Production Engineer",
            2,
            new LevelMix(0.30, 0.50, 0.20),
            List.of(
                skill("Lean Manufacturing", 0.92, Tier.CORE),
                skill("Six Sigma", 0.90, Tier.CORE),
                skill("Total Productive Maintenance", 0.88, Tier.CORE),
                skill("Industrial Safety & OSHA", 0.88, Tier.CORE),
                skill("SolidWorks", 0.85, Tier.CORE),

                skill("Supply Chain Analytics", 0.50, Tier.COMMON),
                skill("Team Leadership", 0.50, Tier.COMMON),
                skill("Pneumatics & Hydraulics", 0.45, Tier.COMMON),
                skill("CNC Machining", 0.45, Tier.COMMON),

                skill("AutoCAD", 0.15, Tier.OCCASIONAL),
                skill("PLC Programming", 0.12, Tier.OCCASIONAL),
                skill("Cost Accounting", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 9. General Duty Medical Assistant
        profiles.add(buildProfile(
            "General Duty Medical Assistant",
            2,
            new LevelMix(0.60, 0.35, 0.05),
            List.of(
                skill("Patient Assessment", 0.95, Tier.CORE),
                skill("Basic Life Support", 0.92, Tier.CORE),
                skill("Infection Prevention & Control", 0.92, Tier.CORE),
                skill("Medical Record Documentation", 0.88, Tier.CORE),
                skill("Workplace Ethics & Compliance", 0.85, Tier.CORE),

                skill("Time Management", 0.55, Tier.COMMON),
                skill("Business Communication", 0.50, Tier.COMMON),
                skill("Medical Phlebotomy", 0.45, Tier.COMMON),
                skill("Pharmacy Dispensing", 0.40, Tier.COMMON),

                skill("Critical Thinking & Problem Solving", 0.15, Tier.OCCASIONAL),
                skill("Clinical Laboratory Diagnostics", 0.12, Tier.OCCASIONAL),
                skill("Industrial Safety & OSHA", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 10. Phlebotomy Technician
        profiles.add(buildProfile(
            "Phlebotomy Technician",
            2,
            new LevelMix(0.55, 0.40, 0.05),
            List.of(
                skill("Medical Phlebotomy", 0.95, Tier.CORE),
                skill("Infection Prevention & Control", 0.92, Tier.CORE),
                skill("Clinical Laboratory Diagnostics", 0.90, Tier.CORE),
                skill("Basic Life Support", 0.88, Tier.CORE),
                skill("Medical Record Documentation", 0.86, Tier.CORE),

                skill("Workplace Ethics & Compliance", 0.55, Tier.COMMON),
                skill("Time Management", 0.50, Tier.COMMON),
                skill("Patient Assessment", 0.45, Tier.COMMON),
                skill("Pharmacy Dispensing", 0.40, Tier.COMMON),

                skill("Business Communication", 0.15, Tier.OCCASIONAL),
                skill("Critical Thinking & Problem Solving", 0.12, Tier.OCCASIONAL),
                skill("Industrial Safety & OSHA", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 11. Retail Store Executive
        profiles.add(buildProfile(
            "Retail Store Executive",
            2,
            new LevelMix(0.60, 0.35, 0.05),
            List.of(
                skill("Customer Relationship Management", 0.92, Tier.CORE),
                skill("Visual Merchandising", 0.88, Tier.CORE),
                skill("Business Communication", 0.88, Tier.CORE),
                skill("Sales Negotiation", 0.85, Tier.CORE),
                skill("Time Management", 0.85, Tier.CORE),

                skill("Retail Store Inventory", 0.50, Tier.COMMON),
                skill("Point of Sale Systems", 0.50, Tier.COMMON),
                skill("Digital Marketing", 0.45, Tier.COMMON),
                skill("Team Leadership", 0.45, Tier.COMMON),
                skill("Tally Prime", 0.40, Tier.COMMON),

                skill("Warehouse Inventory Management", 0.15, Tier.OCCASIONAL),
                skill("Workplace Ethics & Compliance", 0.12, Tier.OCCASIONAL),
                skill("Goods & Services Tax Filing", 0.10, Tier.OCCASIONAL)
            )
        ));

               // 12. Digital Sales Specialist
        profiles.add(buildProfile(
            "Digital Sales Specialist",
            2,
            new LevelMix(0.40, 0.45, 0.15),
            List.of(
                skill("Customer Relationship Management", 0.92, Tier.CORE),
                skill("Sales Negotiation", 0.90, Tier.CORE),
                skill("Business Communication", 0.88, Tier.CORE),
                skill("Time Management", 0.85, Tier.CORE),
                skill("Digital Marketing", 0.85, Tier.CORE),

                skill("Critical Thinking & Problem Solving", 0.50, Tier.COMMON),
                skill("Data Analysis", 0.45, Tier.COMMON),
                skill("Data Visualization", 0.45, Tier.COMMON),
                skill("Team Leadership", 0.45, Tier.COMMON),
                skill("SQL", 0.40, Tier.COMMON),

                skill("Visual Merchandising", 0.12, Tier.OCCASIONAL),
                skill("Workplace Ethics & Compliance", 0.10, Tier.OCCASIONAL),
                skill("Artificial Intelligence", 0.08, Tier.OCCASIONAL)
            )
        ));

        // 13. Accounts Executive
        profiles.add(buildProfile(
            "Accounts Executive",
            2,
            new LevelMix(0.50, 0.40, 0.10),
            List.of(
                skill("Financial Accounting", 0.95, Tier.CORE),
                skill("Tally Prime", 0.92, Tier.CORE),
                skill("Goods & Services Tax Filing", 0.90, Tier.CORE),
                skill("Cost Accounting", 0.88, Tier.CORE),
                skill("Workplace Ethics & Compliance", 0.85, Tier.CORE),

                skill("Business Communication", 0.55, Tier.COMMON),
                skill("Internal Auditing", 0.50, Tier.COMMON),
                skill("Time Management", 0.50, Tier.COMMON),
                skill("Critical Thinking & Problem Solving", 0.45, Tier.COMMON),
                skill("Point of Sale Systems", 0.40, Tier.COMMON),

                skill("Credit Analysis", 0.15, Tier.OCCASIONAL),
                skill("Risk Assessment", 0.12, Tier.OCCASIONAL),
                skill("Financial Modeling", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 14. Financial Analyst
        profiles.add(buildProfile(
            "Financial Analyst",
            2,
            new LevelMix(0.30, 0.50, 0.20),
            List.of(
                skill("Financial Modeling", 0.95, Tier.CORE),
                skill("Financial Accounting", 0.90, Tier.CORE),
                skill("Risk Assessment", 0.88, Tier.CORE),
                skill("Cost Accounting", 0.85, Tier.CORE),
                skill("SQL", 0.85, Tier.CORE),

                skill("Critical Thinking & Problem Solving", 0.55, Tier.COMMON),
                skill("Data Analysis", 0.50, Tier.COMMON),
                skill("Credit Analysis", 0.50, Tier.COMMON),
                skill("Business Communication", 0.50, Tier.COMMON),
                skill("Data Visualization", 0.45, Tier.COMMON),

                skill("Python", 0.15, Tier.OCCASIONAL),
                skill("Internal Auditing", 0.15, Tier.OCCASIONAL),
                skill("Goods & Services Tax Filing", 0.12, Tier.OCCASIONAL)
            )
        ));

        // 15. Loan Processing Officer
        profiles.add(buildProfile(
            "Loan Processing Officer",
            2,
            new LevelMix(0.50, 0.40, 0.10),
            List.of(
                skill("Credit Analysis", 0.95, Tier.CORE),
                skill("Risk Assessment", 0.92, Tier.CORE),
                skill("Workplace Ethics & Compliance", 0.90, Tier.CORE),
                skill("Business Communication", 0.88, Tier.CORE),
                skill("Customer Relationship Management", 0.85, Tier.CORE),

                skill("Financial Accounting", 0.50, Tier.COMMON),
                skill("Time Management", 0.50, Tier.COMMON),
                skill("Critical Thinking & Problem Solving", 0.50, Tier.COMMON),
                skill("Goods & Services Tax Filing", 0.45, Tier.COMMON),

                skill("Sales Negotiation", 0.15, Tier.OCCASIONAL),
                skill("Internal Auditing", 0.15, Tier.OCCASIONAL),
                skill("Tally Prime", 0.12, Tier.OCCASIONAL)
            )
        ));

        // 16. Warehouse Supervisor
        profiles.add(buildProfile(
            "Warehouse Supervisor",
            2,
            new LevelMix(0.40, 0.45, 0.15),
            List.of(
                skill("Warehouse Inventory Management", 0.95, Tier.CORE),
                skill("Material Handling Equipment", 0.92, Tier.CORE),
                skill("Industrial Safety & OSHA", 0.90, Tier.CORE),
                skill("Team Leadership", 0.88, Tier.CORE),
                skill("Time Management", 0.85, Tier.CORE),

                skill("Fleet Routing & Dispatch", 0.50, Tier.COMMON),
                skill("Workplace Ethics & Compliance", 0.50, Tier.COMMON),
                skill("Cold Chain Logistics", 0.45, Tier.COMMON),
                skill("Critical Thinking & Problem Solving", 0.45, Tier.COMMON),

                skill("Procurement & Sourcing", 0.15, Tier.OCCASIONAL),
                skill("Freight Forwarding", 0.15, Tier.OCCASIONAL),
                skill("Total Productive Maintenance", 0.12, Tier.OCCASIONAL)
            )
        ));

        // 17. Logistics Coordinator
        profiles.add(buildProfile(
            "Logistics Coordinator",
            2,
            new LevelMix(0.45, 0.45, 0.10),
            List.of(
                skill("Fleet Routing & Dispatch", 0.95, Tier.CORE),
                skill("Freight Forwarding", 0.92, Tier.CORE),
                skill("Warehouse Inventory Management", 0.88, Tier.CORE),
                skill("Business Communication", 0.88, Tier.CORE),
                skill("Time Management", 0.85, Tier.CORE),

                skill("Cold Chain Logistics", 0.50, Tier.COMMON),
                skill("Workplace Ethics & Compliance", 0.50, Tier.COMMON),
                skill("Procurement & Sourcing", 0.45, Tier.COMMON),
                skill("Customer Relationship Management", 0.45, Tier.COMMON),

                skill("Material Handling Equipment", 0.15, Tier.OCCASIONAL),
                skill("Critical Thinking & Problem Solving", 0.15, Tier.OCCASIONAL),
                skill("Tally Prime", 0.10, Tier.OCCASIONAL)
            )
        ));

        // 18. Supply Chain Associate
        profiles.add(buildProfile(
            "Supply Chain Associate",
            2,
            new LevelMix(0.45, 0.45, 0.10),
            List.of(
                skill("Procurement & Sourcing", 0.92, Tier.CORE),
                skill("Supply Chain Analytics", 0.90, Tier.CORE),
                skill("Freight Forwarding", 0.88, Tier.CORE),
                skill("Warehouse Inventory Management", 0.85, Tier.CORE),
                skill("Sales Negotiation", 0.85, Tier.CORE),

                skill("Critical Thinking & Problem Solving", 0.50, Tier.COMMON),
                skill("Data Analysis", 0.45, Tier.COMMON),
                skill("Cost Accounting", 0.45, Tier.COMMON),
                skill("Cold Chain Logistics", 0.40, Tier.COMMON),

                skill("SQL", 0.15, Tier.OCCASIONAL),
                skill("Business Communication", 0.15, Tier.OCCASIONAL),
                skill("Lean Manufacturing", 0.12, Tier.OCCASIONAL)
            )
        ));

        ALL_PROFILES = Collections.unmodifiableList(profiles);

        Map<String, RoleProfile> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (RoleProfile p : ALL_PROFILES) {
            map.put(p.roleName(), p);
        }
        BY_NAME_MAP = Collections.unmodifiableMap(map);
    }

    private static SkillProbability skill(String skillName, double baseProbability, Tier tier) {
        // Validation via catalog byName ensures typos fail fast at startup
        String canonicalName = SkillCatalog.byName(skillName).name();
        return new SkillProbability(canonicalName, baseProbability, tier);
    }

    private static RoleProfile buildProfile(
        String roleName,
        int roleWeight,
        LevelMix levelMix,
        List<SkillProbability> skills
    ) {
        String canonicalRoleName = RoleCatalog.byName(roleName).name();

        SkillProbability highest = null;
        for (SkillProbability s : skills) {
            if (highest == null || s.baseProbability() > highest.baseProbability()) {
                highest = s;
            }
        }

        return new RoleProfile(
            canonicalRoleName,
            roleWeight,
            levelMix,
            Collections.unmodifiableList(skills),
            highest
        );
    }

    private RoleSkillProfiles() {}

    public static List<RoleProfile> all() {
        return ALL_PROFILES;
    }

    public static RoleProfile byName(String roleName) {
        if (roleName == null) {
            throw new IllegalArgumentException("Role name must not be null");
        }
        RoleProfile profile = BY_NAME_MAP.get(roleName);
        if (profile == null) {
            throw new IllegalArgumentException("Unknown role profile: '" + roleName + "'");
        }
        return profile;
    }
}
