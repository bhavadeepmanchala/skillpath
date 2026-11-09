package com.skillpath.backend.generator;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public final class SkillCatalog {

    public record SkillDef(String name, String category, List<String> aliases) {
        public SkillDef {
            aliases = List.copyOf(aliases);
        }
    }

    private static final List<SkillDef> ALL_SKILLS = List.of(
        // Programming & Software (8)
        new SkillDef("Java", "Programming & Software", List.of("Java SE")),
        new SkillDef("Python", "Programming & Software", List.of("Python3")),
        new SkillDef("C++", "Programming & Software", List.of("CPP")),
        new SkillDef("C#", "Programming & Software", List.of("C-Sharp")),
        new SkillDef("Go", "Programming & Software", List.of("Golang")),
        new SkillDef("Rust", "Programming & Software", List.of()),
        new SkillDef("Data Structures & Algorithms", "Programming & Software", List.of("DSA")),
        new SkillDef("Object-Oriented Programming", "Programming & Software", List.of("OOP")),

        // Web & Mobile (8)
        new SkillDef("JavaScript", "Web & Mobile", List.of("JS")),
        new SkillDef("TypeScript", "Web & Mobile", List.of("TS")),
        new SkillDef("React", "Web & Mobile", List.of("ReactJS")),
        new SkillDef("Angular", "Web & Mobile", List.of()),
        new SkillDef("Node.js", "Web & Mobile", List.of("NodeJS")),
        new SkillDef("HTML5 & CSS3", "Web & Mobile", List.of("HTML/CSS")),
        new SkillDef("Android Development", "Web & Mobile", List.of()),
        new SkillDef("Flutter", "Web & Mobile", List.of()),

        // Data & AI (8)
        new SkillDef("Machine Learning", "Data & AI", List.of("ML")),
        new SkillDef("Artificial Intelligence", "Data & AI", List.of("AI")),
        new SkillDef("Deep Learning", "Data & AI", List.of("DL")),
        new SkillDef("Natural Language Processing", "Data & AI", List.of("NLP")),
        new SkillDef("Computer Vision", "Data & AI", List.of()),
        new SkillDef("SQL", "Data & AI", List.of("Structured Query Language")),
        new SkillDef("Data Analysis", "Data & AI", List.of()),
        new SkillDef("Data Visualization", "Data & AI", List.of()),

        // Cloud & DevOps (7)
        new SkillDef("Amazon Web Services", "Cloud & DevOps", List.of("AWS")),
        new SkillDef("Google Cloud Platform", "Cloud & DevOps", List.of("GCP")),
        new SkillDef("Microsoft Azure", "Cloud & DevOps", List.of("Azure Cloud")),
        new SkillDef("Docker", "Cloud & DevOps", List.of()),
        new SkillDef("Kubernetes", "Cloud & DevOps", List.of("K8s")),
        new SkillDef("Continuous Integration & Deployment", "Cloud & DevOps", List.of("CI/CD")),
        new SkillDef("Linux System Administration", "Cloud & DevOps", List.of()),

        // Electronics & Embedded (6)
        new SkillDef("Embedded C", "Electronics & Embedded", List.of()),
        new SkillDef("Microcontrollers", "Electronics & Embedded", List.of()),
        new SkillDef("Internet of Things", "Electronics & Embedded", List.of()),
        new SkillDef("PCB Design", "Electronics & Embedded", List.of()),
        new SkillDef("VLSI Design", "Electronics & Embedded", List.of()),
        new SkillDef("PLC Programming", "Electronics & Embedded", List.of()),

        // Electrical & Mechanical (6)
        new SkillDef("AutoCAD", "Electrical & Mechanical", List.of()),
        new SkillDef("SolidWorks", "Electrical & Mechanical", List.of()),
        new SkillDef("CNC Machining", "Electrical & Mechanical", List.of()),
        new SkillDef("HVAC Systems", "Electrical & Mechanical", List.of()),
        new SkillDef("Electrical Power Systems", "Electrical & Mechanical", List.of()),
        new SkillDef("Pneumatics & Hydraulics", "Electrical & Mechanical", List.of()),

        // Manufacturing & Quality (5)
        new SkillDef("Six Sigma", "Manufacturing & Quality", List.of()),
        new SkillDef("Lean Manufacturing", "Manufacturing & Quality", List.of()),
        new SkillDef("Quality Control & Assurance", "Manufacturing & Quality", List.of()),
        new SkillDef("Total Productive Maintenance", "Manufacturing & Quality", List.of()),
        new SkillDef("Industrial Safety & OSHA", "Manufacturing & Quality", List.of()),

        // Healthcare & Care (7)
        new SkillDef("Patient Assessment", "Healthcare & Care", List.of()),
        new SkillDef("Basic Life Support", "Healthcare & Care", List.of()),
        new SkillDef("Medical Phlebotomy", "Healthcare & Care", List.of()),
        new SkillDef("Pharmacy Dispensing", "Healthcare & Care", List.of()),
        new SkillDef("Medical Record Documentation", "Healthcare & Care", List.of()),
        new SkillDef("Infection Prevention & Control", "Healthcare & Care", List.of()),
        new SkillDef("Clinical Laboratory Diagnostics", "Healthcare & Care", List.of()),

        // Retail & Sales (6)
        new SkillDef("Customer Relationship Management", "Retail & Sales", List.of()),
        new SkillDef("Point of Sale Systems", "Retail & Sales", List.of()),
        new SkillDef("Visual Merchandising", "Retail & Sales", List.of()),
        new SkillDef("Retail Store Inventory", "Retail & Sales", List.of()),
        new SkillDef("Sales Negotiation", "Retail & Sales", List.of()),
        new SkillDef("Digital Marketing", "Retail & Sales", List.of()),

        // Finance & Accounting (8)
        new SkillDef("Financial Accounting", "Finance & Accounting", List.of()),
        new SkillDef("Cost Accounting", "Finance & Accounting", List.of()),
        new SkillDef("Tally Prime", "Finance & Accounting", List.of()),
        new SkillDef("Goods & Services Tax Filing", "Finance & Accounting", List.of()),
        new SkillDef("Financial Modeling", "Finance & Accounting", List.of()),
        new SkillDef("Risk Assessment", "Finance & Accounting", List.of()),
        new SkillDef("Credit Analysis", "Finance & Accounting", List.of()),
        new SkillDef("Internal Auditing", "Finance & Accounting", List.of()),

        // Logistics & Supply Chain (7)
        new SkillDef("Warehouse Inventory Management", "Logistics & Supply Chain", List.of()),
        new SkillDef("Fleet Routing & Dispatch", "Logistics & Supply Chain", List.of()),
        new SkillDef("Freight Forwarding", "Logistics & Supply Chain", List.of()),
        new SkillDef("Procurement & Sourcing", "Logistics & Supply Chain", List.of()),
        new SkillDef("Cold Chain Logistics", "Logistics & Supply Chain", List.of()),
        new SkillDef("Material Handling Equipment", "Logistics & Supply Chain", List.of()),
        new SkillDef("Supply Chain Analytics", "Logistics & Supply Chain", List.of()),

        // Workplace & Soft Skills (5)
        new SkillDef("Business Communication", "Workplace & Soft Skills", List.of()),
        new SkillDef("Critical Thinking & Problem Solving", "Workplace & Soft Skills", List.of()),
        new SkillDef("Team Leadership", "Workplace & Soft Skills", List.of()),
        new SkillDef("Time Management", "Workplace & Soft Skills", List.of()),
        new SkillDef("Workplace Ethics & Compliance", "Workplace & Soft Skills", List.of())
    );

    private static final Map<String, SkillDef> BY_NAME_MAP;

    static {
        Map<String, SkillDef> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (SkillDef def : ALL_SKILLS) {
            map.put(def.name(), def);
        }
        BY_NAME_MAP = Collections.unmodifiableMap(map);
    }

    private SkillCatalog() {}

    public static List<SkillDef> all() {
        return ALL_SKILLS;
    }

    public static SkillDef byName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("Skill name must not be null");
        }
        SkillDef def = BY_NAME_MAP.get(name);
        if (def == null) {
            throw new IllegalArgumentException("Unknown skill name: '" + name + "'");
        }
        return def;
    }
}