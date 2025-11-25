import { runMicroAgent } from "./agent.js";
import { CONFIG } from "./config.js";
import { canonicalStringify } from "./utils.js";

/**
 * Orchestrates multiple micro-agents to reach a consensus on a step.
 * @param {any} context - The current state.
 * @param {string} instruction - The instruction for this step.
 * @param {function} onVote - Callback for UI updates (optional).
 * @param {string} [customPrompt] - Optional custom system prompt for agents.
 * @returns {Promise<any>} - The consensus result.
 */
export async function getConsensusResult(context, instruction, onVote = () => { }, customPrompt = null) {
    // Use parallel batching if enabled, otherwise fall back to sequential
    if (CONFIG.ENABLE_PARALLEL) {
        return await getConsensusResultParallel(context, instruction, onVote, customPrompt);
    } else {
        return await getConsensusResultSequential(context, instruction, onVote, customPrompt);
    }
}

/**
 * Sequential consensus (original implementation)
 */
async function getConsensusResultSequential(context, instruction, onVote, customPrompt) {
    let votes = {};
    let attempts = 0;

    while (attempts < CONFIG.MAX_ATTEMPTS_PER_STEP) {
        const result = await runMicroAgent(context, instruction, customPrompt);
        attempts++;

        if (result === null) {
            onVote("flagged");
            continue;
        }

        const resultKey = canonicalStringify(result);
        votes[resultKey] = (votes[resultKey] || 0) + 1;
        onVote("valid");

        const sortedResults = Object.entries(votes).sort((a, b) => b[1] - a[1]);
        const leader = sortedResults[0];
        const runnerUp = sortedResults[1];

        if (leader) {
            const leaderVotes = leader[1];
            const runnerUpVotes = runnerUp ? runnerUp[1] : 0;
            const margin = leaderVotes - runnerUpVotes;

            if (margin >= CONFIG.VOTE_MARGIN_K) {
                return {
                    value: JSON.parse(leader[0]),
                    metadata: {
                        voteMargin: margin,
                        totalVotes: attempts,
                        attempts: attempts
                    }
                };
            }
        }
    }

    throw new Error(`Failed to reach consensus after ${CONFIG.MAX_ATTEMPTS_PER_STEP} attempts.`);
}

/**
 * Parallel consensus with batch voting (optimized)
 */
async function getConsensusResultParallel(context, instruction, onVote, customPrompt) {
    let votes = {};
    let totalAttempts = 0;

    while (totalAttempts < CONFIG.MAX_ATTEMPTS_PER_STEP) {
        // Determine batch size (don't exceed MAX_ATTEMPTS_PER_STEP)
        const remainingAttempts = CONFIG.MAX_ATTEMPTS_PER_STEP - totalAttempts;
        const batchSize = Math.min(CONFIG.BATCH_SIZE, remainingAttempts);

        // Launch batch of agents in parallel
        const promises = Array(batchSize).fill(null).map(() =>
            runMicroAgent(context, instruction, customPrompt)
        );

        // Early termination: Check votes as each agent completes
        if (CONFIG.EARLY_TERMINATION) {
            for (const promise of promises) {
                totalAttempts++;
                const result = await promise;

                if (result === null) {
                    onVote("flagged");
                    continue;
                }

                const resultKey = canonicalStringify(result);
                votes[resultKey] = (votes[resultKey] || 0) + 1;
                onVote("valid");

                // Check for consensus immediately after each vote
                const sortedResults = Object.entries(votes).sort((a, b) => b[1] - a[1]);
                const leader = sortedResults[0];
                const runnerUp = sortedResults[1];

                if (leader) {
                    const leaderVotes = leader[1];
                    const runnerUpVotes = runnerUp ? runnerUp[1] : 0;
                    const margin = leaderVotes - runnerUpVotes;

                    // Winning Condition: Leader is ahead by K
                    if (margin >= CONFIG.VOTE_MARGIN_K) {
                        return {
                            value: JSON.parse(leader[0]),
                            metadata: {
                                voteMargin: margin,
                                totalVotes: totalAttempts,
                                attempts: totalAttempts
                            }
                        };
                    }
                }
            }
        } else {
            // Standard batch mode: wait for all promises
            const results = await Promise.all(promises);
            totalAttempts += batchSize;

            // Tally votes from this batch
            for (const result of results) {
                if (result === null) {
                    onVote("flagged");
                    continue;
                }

                const resultKey = canonicalStringify(result);
                votes[resultKey] = (votes[resultKey] || 0) + 1;
                onVote("valid");
            }

            // Check for consensus after each batch
            const sortedResults = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            const leader = sortedResults[0];
            const runnerUp = sortedResults[1];

            if (leader) {
                const leaderVotes = leader[1];
                const runnerUpVotes = runnerUp ? runnerUp[1] : 0;
                const margin = leaderVotes - runnerUpVotes;

                // Winning Condition: Leader is ahead by K
                if (margin >= CONFIG.VOTE_MARGIN_K) {
                    return {
                        value: JSON.parse(leader[0]),
                        metadata: {
                            voteMargin: margin,
                            totalVotes: totalAttempts,
                            attempts: totalAttempts
                        }
                    };
                }
            }
        }
    }

    throw new Error(`Failed to reach consensus after ${CONFIG.MAX_ATTEMPTS_PER_STEP} attempts.`);
}
