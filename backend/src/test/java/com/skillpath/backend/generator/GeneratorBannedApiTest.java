package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class GeneratorBannedApiTest {

    private record BannedRule(String name, Pattern pattern) {}

    private static final List<BannedRule> BANNED_RULES = List.of(
        new BannedRule("Math.random()", Pattern.compile("\\bMath\\.random\\s*\\(")),
        new BannedRule("no-arg new Random()", Pattern.compile("\\bnew\\s+Random\\s*\\(\\s*\\)")),
        new BannedRule("UUID.randomUUID()", Pattern.compile("\\bUUID\\.randomUUID\\s*\\(")),
        new BannedRule("any now() call", Pattern.compile("\\.now\\s*\\(")),
        new BannedRule("System.currentTimeMillis()", Pattern.compile("\\bSystem\\.currentTimeMillis\\s*\\(")),
        new BannedRule("System.nanoTime()", Pattern.compile("\\bSystem\\.nanoTime\\s*\\(")),
        new BannedRule("new HashMap", Pattern.compile("\\bnew\\s+HashMap\\b")),
        new BannedRule("new HashSet", Pattern.compile("\\bnew\\s+HashSet\\b"))
    );

    @Test
    void generatorPackageDoesNotUseBannedNondeterministicOrUnorderedApis() throws IOException {
        Path generatorDir = Path.of("src/main/java/com/skillpath/backend/generator");
        if (!Files.exists(generatorDir)) {
            generatorDir = Path.of("backend/src/main/java/com/skillpath/backend/generator");
        }

        assertThat(Files.exists(generatorDir))
            .as("Generator directory must exist: %s", generatorDir.toAbsolutePath())
            .isTrue();

        List<Path> javaFiles;
        try (Stream<Path> stream = Files.walk(generatorDir)) {
            javaFiles = stream.filter(p -> p.toString().endsWith(".java")).toList();
        }

        assertThat(javaFiles).isNotEmpty();

        List<String> violations = new ArrayList<>();

        for (Path javaFile : javaFiles) {
            List<String> lines = Files.readAllLines(javaFile);
            for (int lineNum = 1; lineNum <= lines.size(); lineNum++) {
                String line = lines.get(lineNum - 1);
                String trimmed = line.trim();
                // Skip comment-only lines
                if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
                    continue;
                }

                for (BannedRule rule : BANNED_RULES) {
                    Matcher matcher = rule.pattern().matcher(line);
                    if (matcher.find()) {
                        violations.add(String.format(
                            "%s:%d matched banned API [%s]: '%s'",
                            javaFile.getFileName(),
                            lineNum,
                            rule.name(),
                            line.trim()
                        ));
                    }
                }
            }
        }

        assertThat(violations)
            .as("Found banned APIs in generator package:\n" + String.join("\n", violations))
            .isEmpty();
    }
}
