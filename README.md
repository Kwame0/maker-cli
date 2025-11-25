# MAKER CLI

> **M**assively Decomposed **A**gentic Processes - A CLI tool implementing the MAKER pattern for ultra-reliable AI task execution

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🧠 What is MAKER?

MAKER is a novel approach to LLM reliability that challenges the obsession with "bigger models" and "larger context windows." Instead of relying on a single model to complete complex tasks, MAKER:

1. **Decomposes** tasks into atomic steps
2. **Executes** each step with fresh, stateless agents
3. **Votes** on each step's output using consensus (First-to-Ahead-by-K)

### The Core Problem

If a model is 99% accurate per step, a 100-step task has a **36% success rate** (`0.99^100`).  
At 1,000 steps, you drop to **0.004%** success.

### The MAKER Solution

By running multiple cheap models in parallel and voting, MAKER achieves higher reliability than using a single expensive model. Each step has a fresh context, preventing error propagation.

**Read the paper**: [MAKER: Massively Decomposed Agentic Processes](https://arxiv.org/pdf/2511.09030)

---

## 💭 Author's Note

I created this as a proof of concept for the [MAKER paper](https://arxiv.org/pdf/2511.09030). Think of this as **"gemini-flash-lite-infinity"**—a way to scale lightweight models to solve tasks far beyond their normal context limits. I hope this inspires others to improve current models and advance the state of AI. Bring your own Gemini key.

**Verified at Scale:**
- **drunkWalker**: Successfully completed **1,000 steps** (navigating in a square pattern 250 times), maintaining perfect spatial accuracy and returning to the origin `{x: 0, y: 0}`.
- **brokenCalculator**: Successfully completed **1,000 steps** of continuous calculation without error.

Test results can be found in `tests/results/` to verify these claims.

### Developer Thoughts

My next goal is to push this approach to more complex tasks—coding challenges, game playing, multi-step puzzles, and real-world problem-solving. I want to see how far the current engineering can take us before hitting fundamental limitations. If the architecture proves insufficient, I'll iterate on the methods (smarter decomposition, dynamic voting thresholds, error recovery mechanisms). I encourage others to experiment with MAKER on their own challenging tasks and share what works—and what doesn't.

---

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
DEV_MODE=false
```

### Usage

```bash
node bin/maker.js "Your task here"

# High quality mode (uses gemini-flash-latest instead of lite)
node bin/maker.js "Your task here" --high
```

⚠️ **Warning**: `--high` mode uses `gemini-flash-latest` which has a **10,000 RPM** rate limit and can get expensive quickly. Only use for tasks requiring higher quality reasoning.

**Example**:

```bash
node bin/maker.js "Start with 0, add 10, multiply by 2, then subtract 5"
```

**Output**:

```
🤖 MAKER CLI - Initializing...
✔ Plan created with 4 steps.
✔ Step 1 Complete
✔ Step 2 Complete
✔ Step 3 Complete
✔ Step 4 Complete

🎉 Final Result:
15
```

---

## 🏗️ Architecture

```
┌─────────────┐
│   Planner   │  Decomposes task into steps
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 1    │
├─────────────┤
│ Agent A ... │  Multiple stateless agents vote
│ Agent B ... │
│ Agent C ✓✓✓ │  First-to-Ahead-by-K wins
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Step 2    │  Fresh agents, no memory
└─────────────┘
```

### The 3 Pillars

1. **Maximal Agentic Decomposition (MAD)**  
   Tasks are broken into atomic steps. Each step is executed by a fresh agent with no memory of previous steps.

2. **Red-Flagging**  
   Malformed outputs (bad JSON, syntax errors) are immediately discarded. No retry logic—treat it like a "failed neuron."

3. **First-to-Ahead-by-K Voting**  
   Multiple agents vote on each step. The first answer to lead by `K` votes (default: 2) wins.

---

## 📂 Project Structure

```
d:/Dev/MAKER/
├── .env                    # API key (not committed)
├── package.json
├── bin/
│   └── maker.js           # CLI entry point
├── src/
│   ├── config.js          # Configuration
│   ├── agent.js           # Worker agent (stateless)
│   ├── consensus.js       # Voting mechanism
│   ├── planner.js         # Task decomposition
│   └── utils.js           # Canonical JSON stringify
└── tests/
    ├── suite.js           # Test definitions
    └── runner.js          # Test executor
```

---

## ⚙️ Configuration

Edit `src/config.js`:

```javascript
export const CONFIG = {
    MODEL_NAME: "gemini-flash-lite-latest",
    VOTE_MARGIN_K: 10,         // Votes ahead to win
    MAX_ATTEMPTS_PER_STEP: 15, // Max voting rounds

    // Speed Optimization Settings
    MAX_RPM: 3500,             // Rate limit (flash-lite: 4000 RPM)
    BATCH_SIZE: 50,            // Parallel agents per batch
    ENABLE_PARALLEL: true,     // Parallel consensus voting
    EARLY_TERMINATION: true,   // Stop when K margin reached
};
```

**Performance Optimizations Implemented:**
- **Parallel Batch Voting**: Launch 10 agents simultaneously instead of sequentially
- **Early Termination**: Stop voting as soon as K=2 margin is reached (saves ~40% on average)
- **Rate Limiting**: Smart throttling to maximize throughput within API limits

**Benchmark Results** (brokenCalculator 10 steps):
- Sequential baseline: ~60s
- With optimizations: **~6.0s** (10x faster with 50 parallel agents)

---

## 🧪 Running Tests

We've included reliability tests with known answers:

### Basic Arithmetic Tests

```bash
# 10-step math chain
node tests/runner.js 10

# 50-step chain
node tests/runner.js 50

# 100-step chain
node tests/runner.js 100
```

### Lite Reasoning Tests (100-1000 steps)

These tests verify MAKER's ability to maintain accuracy over very long step sequences:

```bash
node tests/lite-runner.js drunkWalker 100      # Spatial reasoning - navigation
node tests/lite-runner.js paritySwitch 100     # Conditional logic - even/odd rules
node tests/lite-runner.js brokenCalculator 1000 --high # Instruction parsing - varied formats
```

> **Note**: The `brokenCalculator 1000` test has been verified to run successfully, maintaining accuracy over 1,000 steps of continuous calculation. This demonstrates the power of stateless decomposition—errors do not accumulate because each step is verified by consensus.

Results are logged to `tests/results/`.

**Note:** Natural language task handling (e.g., "Convert 100 USD to EUR") is also supported via the CLI. See [tests/results/usd-to-eur-natural-language.txt](tests/results/usd-to-eur-natural-language.txt) for an example of consensus-based multi-step reasoning on ambiguous real-world tasks.

---

## 💡 Ideas for Devs & Self-Learning

MAKER isn't just a task runner—it's a tool for understanding and improving LLMs. Here is how you can use it for **Self-Learning** and research:

### 1. Dataset Generation
Use MAKER with a high `VOTE_MARGIN_K` (e.g., K=10 or K=20) to generate "Gold Standard" reasoning traces.
- Run complex tasks.
- Save the successful step-by-step execution logs.
- **Use these logs to fine-tune smaller models** (like Gemma 2B or Llama 3 8B) to perform better at reasoning without needing consensus.

### 2. Finding "Hallucination Attractors"
If you see a step where consensus is split (e.g., 50 votes for Answer A, 45 votes for Answer B), you have found a **model blind spot**.
- These are valuable data points!
- Collect these ambiguous cases to create "Adversarial Evaluation Datasets."
- Example: If `3055 + 5` results in `310` (a hallucination) even with K=5, increasing to K=10 helps filter it out, but the existence of the error reveals a weakness in the base model's tokenization or arithmetic handling.

### 3. Reward Modeling
Use the consensus vote count as a **Reward Signal** for Reinforcement Learning (RLHF).
- If an answer gets 100/100 votes, it has high reward.
- If it gets 51/100 votes, it has low reward.
- Train a Reward Model to predict the "Consensus Score" of an answer without actually running 100 agents.

### 4. Recursive Self-Improvement
1. Ask MAKER to write a prompt for a task.
2. Run the task using that prompt with MAKER (K=10).
3. Measure the success rate.
4. Ask MAKER to "Analyze the failure cases and improve the prompt."
5. Repeat.

---

## 🚀 Future Improvements & Research Directions

MAKER is a research prototype demonstrating the power of decomposition + consensus. Here are potential improvements for the community to explore:

### Performance Optimizations
- **Dynamic K Adjustment**: Use K=1 for simple early steps, K=3 for critical final steps
- **Adaptive Batch Sizing**: Automatically scale batch size based on rate limit headroom
- **Prompt Caching**: Cache the enriched system prompt to reduce token costs
- **Smarter Decomposition**: Train a specialized planner model to create better step sequences

### Reliability Enhancements
- **Self-Healing**: Detect when consensus fails and automatically simplify the step
- **Verification Layers**: Add final validation agents that check results for sanity
- **Confidence Scoring**: Track which steps required many retries vs. quick consensus
- **Checkpointing**: Save intermediate state to resume long tasks after failures

### Practical Applications

**What MAKER is Good At:**
- **Long-Horizon Reasoning**: 100-1000+ step tasks that require perfect accuracy at each step
- **Structured Problem Solving**: Math chains, code generation with verification, multi-step analysis
- **Reliability-Critical Tasks**: Where a single error cascades into total failure
- **Cost-Sensitive Scaling**: Using cheap models (flash-lite) to achieve flagship-level reliability

**Real-World Use Cases:**
- **Code Migration Tools**: Decompose large refactoring tasks into atomic, verifiable steps
- **Data Processing Pipelines**: Multi-stage transformations where each step must be correct
- **Educational Tutoring**: Step-by-step problem solving with verification at each stage
- **Planning Assistants**: Break complex goals into actionable, validated subtasks

### The Big Question: Can We Scale Frontier Models?

This implementation uses `gemini-flash-lite-latest` as a proof of concept. But what if we applied MAKER to **frontier models** like GPT-4o, Claude Sonnet, or Gemini Pro?

**Key Insight**: If decomposition + consensus can make a lightweight model reliable at 100-step tasks, could it push frontier models to 10,000-step tasks? Or enable them to solve problems currently considered impossible?

**Open Research Questions**:
1. Does consensus voting still help when the base model is already very capable?
2. Can smarter decomposition strategies unlock exponential scaling in reasoning depth?
3. What's the theoretical limit of task complexity we can achieve with this approach?
4. Could MAKER-style techniques be integrated into model training itself?

**We encourage researchers to experiment with:**
- Applying MAKER to frontier models and measuring the reliability gains
- Testing on domains like mathematics, formal verification, or multi-agent simulations
- Comparing different voting strategies (K-margin, confidence weighting, tiered consensus)
- Exploring hybrid approaches (MAKER for decomposition, frontier model for synthesis)

---

## 🔮 Next Steps for MAKER

We are actively working on pushing the boundaries of what's possible with decomposed agentic processes. Here is our roadmap for the immediate future:

### 1. Enhanced Red-Flag Detection
- **Current State**: Basic syntax and JSON validation.
- **Goal**: Implement semantic red-flagging where agents can vote to "veto" a step if it seems logically unsound, even if syntactically correct.
- **Implementation**: Add a pre-voting "sanity check" layer that runs cheaply before the main consensus round.

### 2. Improved Data Structures
- **Current State**: Linear history of step results.
- **Goal**: Move to a **Tree-of-Thoughts** data structure where branches can be explored and pruned.
- **Benefit**: Allows for backtracking and exploring alternative solutions when a path hits a dead end, rather than just failing the task.

### 3. Complex Task Support
- **Current State**: Excellent at linear reasoning and math chains.
- **Goal**: Tackle tasks requiring **multi-file coding**, **creative writing**, and **strategic planning**.
- **Testing**: We are building a suite of "Hard" tests including:
    - Writing a complete mini-game in Python
    - Solving cryptic crosswords
    - Debugging complex race conditions

### 4. Accuracy Improvements
- **Goal**: Reduce the "K" margin needed for consensus by improving the quality of individual agents.
- **Method**: Fine-tuning a small model (Gemma 2B/7B) specifically on successful MAKER traces to create a "Specialized Worker" model that is cheaper and more accurate than generic flash-lite.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

Ideas for contributions:
- Implement Phase 3 optimizations (dynamic K, adaptive batching)
- Add support for other model providers (OpenAI, Anthropic, OpenRouter)
- Create new test suites for different problem domains
- Build visualization tools for consensus voting patterns
- Improve the planner with few-shot examples or fine-tuning

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

This project is open source and free to use, modify, and distribute. We encourage experimentation and welcome improvements from the community.

---

## 🙏 Acknowledgments

Inspired by the MAKER research paper on Massively Decomposed Agentic Processes.

---

## 📊 Why Use MAKER?

| Approach | Model | Cost | Reliability |
|----------|-------|------|-------------|
| Single Call | GPT-4 | $$$$ | ~36% (100 steps) |
| MAKER | Gemini Flash Lite | $ | **>95%** (100 steps) |

**Economics**: Running 10 cheap models per step is cheaper and more reliable than one expensive model.
