package com.skillpath.backend.generator;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Random;
import org.junit.jupiter.api.Test;

class SeededRandomsTest {

    @Test
    void sameSeedAndNameGiveIdenticalFirst1000NextLongValues() {
        SeededRandoms sr1 = new SeededRandoms(42L);
        SeededRandoms sr2 = new SeededRandoms(42L);

        Random r1 = sr1.forStream("postings");
        Random r2 = sr2.forStream("postings");

        for (int i = 0; i < 1000; i++) {
            assertThat(r1.nextLong()).isEqualTo(r2.nextLong());
        }
    }

    @Test
    void differentNameGivesDifferentSequence() {
        SeededRandoms sr = new SeededRandoms(42L);

        Random r1 = sr.forStream("postings");
        Random r2 = sr.forStream("courses");

        boolean differenceFound = false;
        for (int i = 0; i < 100; i++) {
            if (r1.nextLong() != r2.nextLong()) {
                differenceFound = true;
                break;
            }
        }
        assertThat(differenceFound).isTrue();
    }

    @Test
    void differentMasterSeedGivesDifferentSequence() {
        SeededRandoms sr1 = new SeededRandoms(42L);
        SeededRandoms sr2 = new SeededRandoms(999L);

        Random r1 = sr1.forStream("postings");
        Random r2 = sr2.forStream("postings");

        boolean differenceFound = false;
        for (int i = 0; i < 100; i++) {
            if (r1.nextLong() != r2.nextLong()) {
                differenceFound = true;
                break;
            }
        }
        assertThat(differenceFound).isTrue();
    }

    @Test
    void twoForStreamCallsWithSameNameReturnDistinctInstancesWithEqualSequences() {
        SeededRandoms sr = new SeededRandoms(42L);

        Random r1 = sr.forStream("test-stream");
        Random r2 = sr.forStream("test-stream");

        assertThat(r1).isNotSameAs(r2);

        for (int i = 0; i < 1000; i++) {
            assertThat(r1.nextLong()).isEqualTo(r2.nextLong());
        }
    }
}
