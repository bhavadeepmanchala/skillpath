package com.skillpath.backend.generator;

import java.util.List;

/**
 * Standard levels vocabulary for job postings and skill requirements.
 * Reused across synthetic generation and downstream alignment tasks.
 */
public final class Levels {

    private Levels() {}

    // Job posting experience levels
    public static final String ENTRY = "Entry";
    public static final String MID = "Mid";
    public static final String SENIOR = "Senior";

    public static final List<String> POSTING_LEVELS = List.of(ENTRY, MID, SENIOR);

    // Skill requirement levels
    public static final String BASIC = "Basic";
    public static final String INTERMEDIATE = "Intermediate";
    public static final String ADVANCED = "Advanced";

    public static final List<String> REQUIRED_LEVELS = List.of(BASIC, INTERMEDIATE, ADVANCED);
}
