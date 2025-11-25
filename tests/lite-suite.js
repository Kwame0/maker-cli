/**
 * Lite Reasoning Test Suite for MAKER CLI
 * 
 * These tests use PROGRAMMATIC step generation (not natural language prompts)
 * to verify MAKER's reliability at scale (100-1,000 steps).
 * 
 * Unlike the basic tests, these:
 * - Generate steps algorithmically
 * - Use custom worker prompts
 * - Have mathematically predictable answers
 */

/**
 * Test 1: The "Drunk Walker" (Spatial Reasoning)
 * 
 * The agent starts at (0,0) and walks in a square pattern (North, East, South, West).
 * After any multiple of 4 steps, it must return to (0,0).
 * 
 * This tests whether the agent can maintain spatial awareness across many steps.
 */
export const drunkWalker = {
    name: "Drunk Walker - Spatial Reasoning",
    description: "Navigate in a square pattern (N→E→S→W). Must return to origin after 4n steps.",

    generateSteps: (stepCount) => {
        const pattern = ["North", "East", "South", "West"];
        const steps = [];
        for (let i = 0; i < stepCount; i++) {
            steps.push(`Move ${pattern[i % 4]}`);
        }
        return steps;
    },

    initialState: { x: 0, y: 0 },

    expectedResult: (stepCount) => {
        // After any multiple of 4 steps, we should be back at (0,0)
        // For non-multiples, calculate position based on remainder
        const remainder = stepCount % 4;
        if (remainder === 0) return { x: 0, y: 0 };
        if (remainder === 1) return { x: 0, y: 1 }; // North
        if (remainder === 2) return { x: 1, y: 1 }; // North + East
        if (remainder === 3) return { x: 1, y: 0 }; // North + East + South
    },

    workerPrompt: `You are a navigation computer.

CONTEXT: You will receive current coordinates as {x: number, y: number}.
TASK: You will receive a movement instruction (e.g., "Move North").

MOVEMENT RULES:
- North: y + 1
- East: x + 1
- South: y - 1
- West: x - 1

OUTPUT FORMAT:
Return ONLY a valid JSON object: {"result": {"x": <new_x>, "y": <new_y>}, "reasoning": "<brief explanation>"}

CRITICAL: Do not add markdown code blocks. Just raw JSON.`,
};

/**
 * Test 2: The "Parity Switch" (Conditional Logic)
 * 
 * A logic gate: If the number is Even, Add 3. If Odd, Subtract 1.
 * Tests whether the agent can analyze number properties before acting.
 * 
 * Expected pattern:
 * - Start: 0 (Even) → +3 → 3
 * - Step 2: 3 (Odd) → -1 → 2
 * - Step 3: 2 (Even) → +3 → 5
 * - Step 4: 5 (Odd) → -1 → 4
 * - Pattern: For even step counts, result equals step count
 */
export const paritySwitch = {
    name: "Parity Switch - Conditional Logic",
    description: "Apply conditional rule: Even → +3, Odd → -1. Tests logical reasoning.",

    generateSteps: (stepCount) => {
        const steps = [];
        for (let i = 0; i < stepCount; i++) {
            steps.push("Apply the parity rule");
        }
        return steps;
    },

    initialState: 0,

    expectedResult: (stepCount) => {
        // Simulate the expected result
        let value = 0;
        for (let i = 0; i < stepCount; i++) {
            if (value % 2 === 0) {
                value += 3; // Even
            } else {
                value -= 1; // Odd
            }
        }
        return value;
    },

    workerPrompt: `You are a logic engine.

CONTEXT: You will receive a number.
TASK: Apply the parity rule.

RULE:
- If the number is EVEN: Add 3
- If the number is ODD: Subtract 1

OUTPUT FORMAT:
Return ONLY a valid JSON object: {"result": <new_number>, "reasoning": "<brief explanation>"}

Example:
Input: 4 (even) → Output: {"result": 7, "reasoning": "4 is even, so 4 + 3 = 7"}
Input: 7 (odd) → Output: {"result": 6, "reasoning": "7 is odd, so 7 - 1 = 6"}

CRITICAL: Do not add markdown code blocks. Just raw JSON.`,
};

/**
 * Test 3: The "Broken Calculator" (Arithmetic & Formatting)
 * 
 * We give the model a sequence that sums to a large number, but define operations
 * in varied formats to test instruction parsing.
 * 
 * Expected: Start + (StepCount * 5) = 5000 for 1000 steps
 */
export const brokenCalculator = {
    name: "Broken Calculator - Instruction Parsing",
    description: "Parse varied instruction formats ('Add 5', 'Plus five', etc.). Tests robustness.",

    generateSteps: (stepCount) => {
        const variations = [
            "Add 5",
            "Plus five",
            "Increase by 5",
            "Sum 5"
        ];
        const steps = [];
        for (let i = 0; i < stepCount; i++) {
            steps.push(variations[i % 4]);
        }
        return steps;
    },

    initialState: 0,

    expectedResult: (stepCount) => {
        return stepCount * 5; // Each step adds 5
    },

    workerPrompt: `You are a calculator.

CONTEXT: You will receive a number.
TASK: You will receive an arithmetic instruction in various formats.

SUPPORTED FORMATS:
- "Add 5", "Add five", "Add 5.0" → Add 5
- "Plus 5", "Plus five" → Add 5
- "Increase by 5", "Increase by five" → Add 5
- "Sum 5", "Sum five" → Add 5

OUTPUT FORMAT:
Return ONLY a valid JSON object: {"result": <new_number>, "reasoning": "<brief explanation>"}

Example:
Input: 10, Instruction: "Plus five" → Output: {"result": 15, "reasoning": "10 + 5 = 15"}

CRITICAL: All variations mean "add 5". Do not add markdown code blocks. Just raw JSON.`,
};

// Export all tests
export const liteTests = {
    drunkWalker,
    paritySwitch,
    brokenCalculator,
};
