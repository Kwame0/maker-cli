#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { decomposeTask } from "../src/planner.js";
import { getConsensusResult } from "../src/consensus.js";
import { CONFIG } from "../src/config.js";

const program = new Command();

program
  .name("maker")
  .description("Massively Decomposed Agentic Processes - Ultra-reliable AI task execution via consensus voting")
  .version("1.0.0")
  .argument("<prompt>", 'Natural language task to execute (e.g., "Start with 0, add 10, multiply by 2")')
  .option("--high", "Use gemini-flash-latest instead of gemini-flash-lite-latest (higher quality, slower)")
  .addHelpText(
    "after",
    `
Examples:
  $ maker "Start with 0, add 10, multiply by 2, then subtract 5"
  $ maker "Calculate the sum of numbers from 1 to 10"
  $ maker "Convert 100 USD to EUR using approximate rates"
  $ maker --high "Complex reasoning task"  # Use higher quality model

How it works:
  1. Decomposes your task into atomic steps
  2. Runs multiple AI agents per step with voting
  3. Uses consensus (First-to-Ahead-by-K) for reliability
  4. Each step has fresh context (no error propagation)

Configuration:
  Set GEMINI_API_KEY in .env file
  Adjust VOTE_MARGIN_K and MAX_ATTEMPTS_PER_STEP in src/config.js
`
  )
  .action(async (prompt, options) => {
    // Override model if --high flag is used
    if (options.high) {
      CONFIG.MODEL_NAME = "gemini-flash-latest";
      CONFIG.MAX_RPM = 500;
      console.log(chalk.dim("Using gemini-flash-latest (high quality mode)"));
    }

    console.log(chalk.bold.blue("🤖 MAKER CLI - Initializing..."));

    const spinner = ora("Decomposing task...").start();

    try {
      // 1. Decompose
      const steps = await decomposeTask(prompt);
      spinner.succeed(chalk.green(`Plan created with ${steps.length} steps.`));

      // Initial state with history buffer and original task for grounding
      let state = {
        original_task: prompt,  // The "God View"
        history: []
      };

      // 2. Execute Steps
      for (let i = 0; i < steps.length; i++) {

        // --- RATE LIMIT SAFETY PIT STOP ---
        // Every 60 steps, force a cooldown to let the 1-minute RPM window reset
        if (i > 0 && i % 60 === 0 && options.high) {
          const pauseSpinner = ora(chalk.yellow("Rate Limit Safety: Cooling down for 60s...")).start();
          await new Promise(resolve => setTimeout(resolve, 75000));
          pauseSpinner.succeed("Cooled down. Resuming.");
        }

        const step = steps[i];
        const stepSpinner = ora(`Step ${i + 1}/${steps.length}: ${step}`).start();

        try {
          const { value, metadata } = await getConsensusResult(state, step, (voteType) => {
            if (voteType === "valid") {
              stepSpinner.text = `Step ${i + 1}/${steps.length}: ${step} ${chalk.dim("(Voting...)")}`;
            } else {
              stepSpinner.text = `Step ${i + 1}/${steps.length}: ${step} ${chalk.red("(Flagged)")}`;
            }
          });

          // --- SMART STATE MANAGEMENT ---

          // 1. Update History (Keep last 5 items)
          const previousHistory = state.history || [];
          const updatedHistory = [...previousHistory, value].slice(-5);

          // 2. Merge Value
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // If result is an object, MERGE it 
            state = { ...state, ...value, history: updatedHistory };
          } else {
            // If result is primitive, store as 'current_value' 
            state = { ...state, current_value: value, history: updatedHistory };
          }

          const valStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value;
          const kInfo = CONFIG.DEV_MODE ? ` (K=${metadata.voteMargin})` : "";
          stepSpinner.succeed(chalk.green(`Step ${i + 1} Complete: ${chalk.bold(valStr)}${kInfo}`));

          if (CONFIG.DEV_MODE) {
            console.log(chalk.dim(`  Full Result: ${JSON.stringify(value)}`));
          }
        } catch (error) {
          stepSpinner.fail(chalk.red(`Step ${i + 1} Failed: ${error.message}`));
          if (CONFIG.DEV_MODE) {
            console.error(chalk.red("\n[DEV MODE] Step Failure Details:"));
            console.error("Step:", step);
            console.error("State:", JSON.stringify(state, null, 2));
            console.error("Error:", error);
            if (error.stack) console.error("Stack:", error.stack);
          }
          process.exit(1);
        }
      }

      // 3. Final Output
      console.log("\n" + chalk.bold.magenta("🎉 Final Result:"));
      console.log(JSON.stringify(state, null, 2));
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();