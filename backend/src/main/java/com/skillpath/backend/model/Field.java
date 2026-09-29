package com.skillpath.backend.model;
import lombok.Data;
import java.util.List;

@Data
public class Field {
    private String id;
    private String name;
    private String demandLevel;
    private String trend;
    private int avgOpenings;
    private String avgSalaryLPA;
    private String demandReason;
    private List<String> coreSkills;
    private List<String> topRoles;
    private List<String> recommendedCourses;
    private List<String> relatedFields;
}
