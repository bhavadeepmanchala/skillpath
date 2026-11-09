package com.skillpath.backend.generator;

import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.Random;

/**
 * Seeded deterministic random number generator provider.
 * <p>
 * Given a master seed and a stream name, {@link #forStream(String)} returns a new
 * {@link Random} instance initialized with a 64-bit seed derived deterministically
 * by computing FNV-1a-64 over the UTF-8 bytes of the stream name, XORing the master seed,
 * and passing the result through the SplitMix64 finalizer.
 * <p>
 * Calling {@link #forStream(String)} with the same master seed and stream name always
 * produces a new {@link Random} positioned at the start of an identical pseudo-random sequence.
 */
public class SeededRandoms {

    private static final long FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325L;
    private static final long FNV_PRIME_64 = 0x100000001b3L;

    private final long masterSeed;

    public SeededRandoms(long masterSeed) {
        this.masterSeed = masterSeed;
    }

    /**
     * Returns a new {@link Random} instance initialized at the start of the stream.
     *
     * @param streamName logical name of the random stream
     * @return a new deterministic {@link Random} instance
     */
    public Random forStream(String streamName) {
        Objects.requireNonNull(streamName, "streamName must not be null");
        long streamSeed = deriveStreamSeed(streamName, masterSeed);
        return new Random(streamSeed);
    }

    private static long deriveStreamSeed(String streamName, long masterSeed) {
        byte[] bytes = streamName.getBytes(StandardCharsets.UTF_8);
        long hash = FNV_OFFSET_BASIS_64;
        for (byte b : bytes) {
            hash ^= (b & 0xff);
            hash *= FNV_PRIME_64;
        }
        hash ^= masterSeed;
        return splitMix64(hash);
    }

    private static long splitMix64(long z) {
        z = (z ^ (z >>> 30)) * 0xbf58476d1ce4e5b9L;
        z = (z ^ (z >>> 27)) * 0x94d049bb133111ebL;
        return z ^ (z >>> 31);
    }
}
