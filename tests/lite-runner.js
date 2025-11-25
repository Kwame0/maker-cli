#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { getConsensusResult } from '../src/consensus.js';
import { liteTests } from './lite-suite.js';
import { canonicalStringify } from '../src/utils.js';
import { CONFIG } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure results directory exists
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

/**
 * Run a single lite test
 * @param {string} testName - The test name (e.g., "drunkWalker")
 * @param {number} stepCount - Number of steps to execute
 */
async function runLiteTest(testName, stepCount) {
    const test = liteTests[testName];
    if (!test) {
        throw new Error(`Unknown test: ${testName}. Available: ${Object.keys(liteTests).join(', ')}`);
    }

    console.log(chalk.bold.blue('🧪 MAKER Lite Test Runner'));
    console.log(chalk.dim('='.repeat(60)));
    console.log(`Test:         ${test.name}`);
    console.log(`Description:  ${test.description}`);
    console.log(`Steps:        ${stepCount}`);
    console.log(chalk.dim('='.repeat(60)));
    console.log();

    // Setup logging
    const logFile = path.join(resultsDir, `${testName}_${stepCount}_${Date.now()}.log`);
    const logStream = fs.createWriteStream(logFile);

    function log(message) {
        logStream.write(message + '\n');
    }

    log(`LITE TEST: ${test.name}`);
    log(`Steps: ${stepCount}`);
    log(`Started: ${new Date().toISOString()}`);
    log('='.repeat(60));

    const startTime = Date.now();

    try {
        // 1. Generate steps programmatically
        const steps = test.generateSteps(stepCount);
        log(`Generated ${steps.length} steps`);

        // 2. Initialize state
        let state = test.initialState;
        log(`Initial State: ${JSON.stringify(state)}`);
        log('');

        // 3. Execute each step with consensus voting
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepSpinner = ora(`Step ${i + 1}/${steps.length}: ${step}`).start();

            log(`Step ${i + 1}: ${step}`);
            log(`  Input: ${JSON.stringify(state)}`);

            try {
                // Call consensus with custom worker prompt
                const { value, metadata } = await getConsensusResult(
                    state,
                    step,
                    (voteType) => {
                        if (voteType === 'valid') {
                            stepSpinner.text = `Step ${i + 1}/${steps.length}: ${step} ${chalk.dim('(Voting...)')}`;
                        } else {
                            stepSpinner.text = `Step ${i + 1}/${steps.length}: ${step} ${chalk.red('(Flagged)')}`;
                        }
                    },
                    test.workerPrompt // CUSTOM PROMPT HERE
                );

                state = value;
                log(`  Output: ${JSON.stringify(value)}`);

                const valStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value;
                const kInfo = CONFIG.DEV_MODE ? ` (K=${metadata?.voteMargin ?? '?'})` : "";
                stepSpinner.succeed(chalk.green(`Step ${i + 1} Complete: ${chalk.bold(valStr)}${kInfo}`));

            } catch (error) {
                log(`  ERROR: ${error.message}`);
                stepSpinner.fail(chalk.red(`Step ${i + 1} Failed: ${error.message}`));
                throw error;
            }
        }

        // 4. Validate result
        const expected = test.expectedResult(stepCount);
        const success = compareResults(state, expected);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // 5. Display summary
        console.log();
        console.log(chalk.dim('='.repeat(60)));
        console.log(chalk.bold('TEST SUMMARY'));
        console.log(chalk.dim('='.repeat(60)));
        console.log(`Test:         ${test.name}`);
        console.log(`Steps:        ${stepCount}`);
        console.log(`Expected:     ${JSON.stringify(expected)}`);
        console.log(`Actual:       ${JSON.stringify(state)}`);
        console.log(`Status:       ${success ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED')}`);
        console.log(`Duration:     ${duration}s`);
        console.log(`Log File:     ${logFile}`);
        console.log(chalk.dim('='.repeat(60)));

        log('');
        log('='.repeat(60));
        log('FINAL RESULT');
        log('='.repeat(60));
        log(`Expected: ${JSON.stringify(expected)}`);
        log(`Actual:   ${JSON.stringify(state)}`);
        log(`Status:   ${success ? 'PASSED' : 'FAILED'}`);
        log(`Duration: ${duration}s`);
        log(`Completed: ${new Date().toISOString()}`);

        logStream.end();

        return { success, duration, expected, actual: state };

    } catch (error) {
        log(`FATAL ERROR: ${error.message}`);
        logStream.end();
        throw error;
    }
}

/**
 * Compare results with type-aware equality
 * Handles objects like {x: 0, y: 0} and primitives like numbers
 */
function compareResults(actual, expected) {
    // Use canonical stringify for deep comparison
    // This handles object key ordering: {x:0, y:0} === {y:0, x:0}
    return canonicalStringify(actual) === canonicalStringify(expected);
}

// CLI Execution
const args = process.argv.slice(2);
let testName = null;
let stepCountStr = null;
let useHighQuality = false;

// Parse arguments (supports "node lite-runner.js drunkWalker 100 --high")
for (const arg of args) {
    if (arg === '--high') {
        useHighQuality = true;
    } else if (!testName) {
        testName = arg;
    } else if (!stepCountStr) {
        stepCountStr = arg;
    }
}

if (!testName || !stepCountStr) {
    console.error(chalk.red('Usage: node lite-runner.js <testName> <stepCount> [--high]'));
    console.log('\nAvailable tests:');
    Object.entries(liteTests).forEach(([key, test]) => {
        console.log(`  ${chalk.cyan(key)}: ${test.description}`);
    });
    console.log('\nExample:');
    console.log('  node tests/lite-runner.js drunkWalker 100');
    console.log('  node tests/lite-runner.js drunkWalker 100 --high  # Use higher quality model');
    process.exit(1);
}

if (useHighQuality) {
    CONFIG.MODEL_NAME = 'gemini-flash-latest';
    CONFIG.MAX_RPM = 500; // Adjust for flash-latest's 1K RPM limit (50% buffer for safety)
    console.log(chalk.dim('🔥 Using --high flag (gemini-flash-latest, 500 RPM)\n'));
}

const stepCount = parseInt(stepCountStr, 10);
if (isNaN(stepCount) || stepCount < 1) {
    console.error(chalk.red('Error: stepCount must be a positive integer'));
    process.exit(1);
}

(async () => {
    try {
        const result = await runLiteTest(testName, stepCount);
        process.exit(result.success ? 0 : 1);
    } catch (error) {
        console.error(chalk.red('Fatal Error:'), error.message);
        process.exit(1);
    }
})();
