#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tests } from './suite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure results directory exists
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

/**
 * Run a single test
 */
async function runTest(testKey, testConfig) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running: ${testConfig.name}`);
    console.log(`   Steps: ${testConfig.steps}`);
    console.log(`   Expected: ${testConfig.expected}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    const logFile = path.join(resultsDir, `${testKey}_${Date.now()}.log`);
    const logStream = fs.createWriteStream(logFile);

    return new Promise((resolve) => {
        const makerPath = path.join(__dirname, '..', 'bin', 'maker.js');
        const args = [makerPath, testConfig.prompt];
        if (useHighQuality) {
            args.push('--high');
        }
        const child = spawn('node', args, {
            cwd: path.join(__dirname, '..'),
        });

        let output = '';
        let finalResult = null;

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            logStream.write(text);
            process.stdout.write(text);
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            output += text;
            logStream.write(text);
            process.stderr.write(text);
        });

        child.on('close', (code) => {
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            // Try to extract final result
            const match = output.match(/Final Result:\s*\n([\s\S]*?)$/);
            if (match) {
                try {
                    finalResult = JSON.parse(match[1].trim());
                } catch (e) {
                    finalResult = match[1].trim();
                }
            }

            const success = finalResult == testConfig.expected; // Loose equality for numbers
            const summary = `
${'='.repeat(60)}
TEST SUMMARY
${'='.repeat(60)}
Test:         ${testConfig.name}
Steps:        ${testConfig.steps}
Expected:     ${testConfig.expected}
Actual:       ${finalResult}
Status:       ${success ? '✅ PASSED' : '❌ FAILED'}
Duration:     ${duration}s
Exit Code:    ${code}
Log File:     ${logFile}
${'='.repeat(60)}
`;

            console.log(summary);
            logStream.write(summary);
            logStream.end();

            resolve({ success, duration, finalResult, testConfig });
        });
    });
}

// Main execution
const args = process.argv.slice(2);
let testArg = null;
let useHighQuality = false;

// Parse arguments (supports both "node runner.js 10 --high" and "node runner.js --high 10")
for (const arg of args) {
    if (arg === '--high') {
        useHighQuality = true;
    } else if (!testArg) {
        testArg = arg;
    }
}

(async () => {
    let testsToRun = [];

    if (testArg) {
        const testKey = `test${testArg}`;
        if (tests[testKey]) {
            testsToRun = [[testKey, tests[testKey]]];
        } else {
            console.error(`❌ Unknown test: ${testArg}`);
            console.log('Available tests: 10, 50, 100, 1000');
            console.log('Usage: node runner.js [testNumber] [--high]');
            process.exit(1);
        }
    } else {
        // Run all tests
        testsToRun = Object.entries(tests);
    }

    if (useHighQuality) {
        console.log('🔥 Using --high flag (gemini-flash-latest)\n');
    }

    const results = [];
    for (const [testKey, testConfig] of testsToRun) {
        const result = await runTest(testKey, testConfig);
        results.push(result);
    }

    // Final summary
    console.log('\n\n');
    console.log('='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));
    results.forEach((r) => {
        const icon = r.success ? '✅' : '❌';
        console.log(`${icon} ${r.testConfig.name}: ${r.duration}s`);
    });
    console.log('='.repeat(60));

    const allPassed = results.every((r) => r.success);
    process.exit(allPassed ? 0 : 1);
})();
