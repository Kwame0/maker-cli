/**
 * Test Suite for MAKER CLI
 * These tests have known answers to verify reliability across step counts
 */

export const tests = {
    /**
     * 10-step test: Simple arithmetic chain
     * Expected: ((((((((((0 + 1) + 2) + 3) + 4) + 5) + 6) + 7) + 8) + 9) + 10) = 55
     */
    test10: {
        name: "10-Step Arithmetic Chain",
        steps: 10,
        prompt: "Start with 0. Add 1. Add 2. Add 3. Add 4. Add 5. Add 6. Add 7. Add 8. Add 9. Add 10.",
        expected: 55,
    },

    /**
     * 50-step test: Alternating add/subtract
     * Pattern: 0 + 10 - 5 + 10 - 5 ... (25 times) = 125
     */
    test50: {
        name: "50-Step Alternating Operations",
        steps: 50,
        prompt: buildAlternatingPrompt(50),
        expected: 125, // (10 - 5) * 25 = 125
    },

    /**
     * 100-step test: Increment by 1, 100 times
     * Expected: 0 + 1 + 1 + 1 ... (100 times) = 100
     */
    test100: {
        name: "100-Step Increment Chain",
        steps: 100,
        prompt: buildIncrementPrompt(100),
        expected: 100,
    },

    /**
     * 1000-step test: Add 0.1, 1000 times
     * Expected: 0 + 0.1 * 1000 = 100
     * WARNING: This will consume significant API calls
     */
    test1000: {
        name: "1000-Step Decimal Addition",
        steps: 1000,
        prompt: buildDecimalPrompt(1000),
        expected: 100,
    },
};

/**
 * Helper: Build alternating add/subtract prompt
 */
function buildAlternatingPrompt(steps) {
    let prompt = "Start with 0.";
    for (let i = 0; i < steps / 2; i++) {
        prompt += " Add 10. Subtract 5.";
    }
    return prompt;
}

/**
 * Helper: Build increment prompt
 */
function buildIncrementPrompt(steps) {
    let prompt = "Start with 0.";
    for (let i = 0; i < steps; i++) {
        prompt += " Add 1.";
    }
    return prompt;
}

/**
 * Helper: Build decimal addition prompt
 */
function buildDecimalPrompt(steps) {
    let prompt = "Start with 0.";
    for (let i = 0; i < steps; i++) {
        prompt += " Add 0.1.";
    }
    return prompt;
}
