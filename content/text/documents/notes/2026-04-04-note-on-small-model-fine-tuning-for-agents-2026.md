---
title: "Small Model Fine-Tuning for Agentic Tool Use, April 2026"
description: "Survey of fine-tuning small language models (1B-8B) for function calling and tool use in agent systems — models, methods, datasets, benchmarks, costs, and what's realistic for a single VPS."
text-type: survey
date-created: 2026-04-04
domain: computing
see-also:
  - "../../theories/artificial-intelligence/theories/agents/texts/"
  - "./continuous-learning-in-agentic-harnesses.md"
sources:
  - title: "ToolACE: Winning the Points of LLM Function Calling"
    url: "https://arxiv.org/abs/2409.00920"
    type: paper
  - title: "APIGen-MT: Agentic Pipeline for Multi-Turn Data Generation"
    url: "https://arxiv.org/abs/2504.03601"
    type: paper
  - title: "TinyLLM: Evaluation and Optimization of Small Language Models for Agentic Tasks on Edge Devices"
    url: "https://arxiv.org/abs/2511.22138"
    type: paper
  - title: "Berkeley Function Calling Leaderboard (BFCL) V4"
    url: "https://gorilla.cs.berkeley.edu/leaderboard.html"
    type: benchmark
  - title: "xLAM: A Family of Large Action Models"
    url: "https://github.com/SalesforceAIResearch/xLAM"
    type: repository
  - title: "Unsloth"
    url: "https://unsloth.ai/"
    type: tool
  - title: "Fine-Tuning Small Language Models for Function Calling (Microsoft)"
    url: "https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/fine-tuning-small-language-models-for-function-calling-a-comprehensive-guide/4362539"
    type: guide
  - title: "ToolMind Technical Report"
    url: "https://arxiv.org/abs/2511.15718"
    type: paper
  - title: "HuggingFace Smolagents"
    url: "https://github.com/huggingface/smolagents"
    type: repository
  - title: "Fine-Tuning LLMs for Function Calling with xLAM Dataset (HuggingFace Cookbook)"
    url: "https://huggingface.co/learn/cookbook/en/function_calling_fine_tuning_llms_on_xlam"
    type: guide
---

## Claim

As of April 2026, fine-tuning small open-source models (1B-8B parameters) for tool use and function calling is practical, cheap, and produces models that rival frontier systems on structured benchmarks. The gap between a $0.50/hour rented GPU running QLoRA and a GPT-4o API call has narrowed to the point where specialized small models outperform general large models on function-calling tasks.

## The Landscape: What Changed

Two years ago, tool use required frontier models. Today, Salesforce's xLAM-2-3b-fc-r — a 3-billion parameter model — tops the Berkeley Function Calling Leaderboard, outperforming GPT-4o and Claude 3.5 Sonnet on multi-turn function calling. This is not an anomaly. The convergence of three developments made it possible:

1. **Purpose-built training data.** Synthetic data pipelines (ToolACE, APIGen-MT) generate verified multi-turn tool-calling trajectories at scale. These are not chat datasets repurposed for tool use — they are structured interaction traces with ground-truth tool invocations validated by automated checkers and LLM review committees.

2. **Parameter-efficient fine-tuning maturity.** QLoRA with 4-bit NormalFloat quantization reduces a 7B model's training memory footprint from ~14 GB to ~8-10 GB, making a single RTX 3090 or 4090 sufficient. Unsloth's optimized kernels cut training time by 2x on top of that.

3. **Benchmark infrastructure.** BFCL V4 evaluates not just single-turn function calls but multi-turn agentic scenarios including error recovery, memory management, and format sensitivity. This means fine-tuned models are tested on the same agentic patterns they need to handle in production.

## Models: Which Small Models Work for Tool Use

### Tier 1: Purpose-Built for Tool Calling

**xLAM-2 Series (Salesforce)**
The current state of the art for small-model tool use. Built on Qwen2.5 (1B, 3B) and Llama 3.1 (8B) bases, fine-tuned with APIGen-MT synthetic data.

| Model | Parameters | BFCL Overall | BFCL Multi-Turn | Notes |
|-------|-----------|-------------|----------------|-------|
| xLAM-2-1b-fc-r | 1B | 53.97% | — | Viable for simple single-turn calls |
| xLAM-2-3b-fc-r | 3B | 65.74% | 55.62% | Outperforms GPT-4o on BFCL |
| Llama-xLAM-2-8b-fc-r | 8B | Higher | Higher | Best open-source under 10B |

Available as GGUF quantizations for llama.cpp/Ollama deployment.

**ToolACE-8B**
Fine-tuned from Llama-3.1-8B-Instruct using LoRA (rank 16, alpha 32) on the ToolACE dataset (26,507 APIs). Achieved state-of-the-art on BFCL at time of release, comparable to GPT-4 models. The ToolACE dataset and model are both open-source on HuggingFace.

### Tier 2: General Models with Tool-Use Capability

**Qwen2.5 (0.5B, 1.5B, 3B, 7B)**
Pre-trained with function-calling templates. Supports single, nested, and parallel function calling out of the box. The 1.5B variant is competitive with 2023-era 7B models. Strong base for further fine-tuning because the tool-calling format is already in the pre-training distribution.

**Llama 3.2 (1B, 3B)**
Meta's instruction-tuned variants support function calling natively — single, nested, parallel, and multi-turn. 128k context window. The 1B model has community fine-tunes specifically for tool calling (e.g., mav23/Llama_3.2_1B_Instruct_Tool_Calling_V2). Good base but benefits significantly from further fine-tuning on domain-specific tools.

**Phi-4-mini (3.8B)**
Microsoft's small model with function calling support. Reliability is "surprisingly solid" for a model this size, though schema adherence becomes brittle with verbose tool definitions or chained calls. Better at general reasoning than the xLAM models, worse at structured tool invocation.

### Tier 3: Reasoning Models (Tool Use as Afterthought)

**DeepSeek-R1 Distilled (1.5B, 7B)**
Strong reasoning capability via distillation from the full R1 model. Function calling support was added in R1-0528 (May 2025), but the distilled small variants have reported issues with tool-call parsing. Not recommended as a tool-calling base — the reasoning chain overhead is wasted on structured invocations.

### Summary Recommendation

For pure tool calling: **xLAM-2-3b-fc-r** is the best off-the-shelf option. For a custom fine-tune base: **Qwen2.5-1.5B or 3B** offers the best balance of size, pre-existing tool-call capability, and fine-tuning ecosystem support.

## Methods: How to Fine-Tune for Tool Use

### QLoRA (Dominant Method)

QLoRA combines Low-Rank Adaptation with 4-bit NormalFloat quantization. The base model weights are frozen in 4-bit precision; only the low-rank adapter matrices (typically rank 16-64) are trained in 16-bit.

**Practical recipe for a 3B tool-calling model:**
- Base: Qwen2.5-3B-Instruct or xLAM-2-3b-fc-r
- Method: QLoRA, rank 16, alpha 32, all linear modules
- Data: 2,000-5,000 multi-turn tool-calling examples
- Hardware: Single GPU with 8+ GB VRAM (RTX 3060 minimum, 4090 ideal)
- Training time: 2-6 hours on RTX 4090
- Framework: Unsloth (2x faster than stock HuggingFace PEFT) or TRL

**For a 7-8B model:**
- VRAM: 10-16 GB with QLoRA
- Training time: 4-12 hours on RTX 4090
- Cloud cost: $2-10 on Runpod spot pricing

QLoRA achieves 90-95% of full fine-tuning quality. The remaining 5-10% gap is rarely meaningful for structured tool-calling tasks where the output format is constrained.

### Reinforcement Learning (Emerging)

GRPO (Group Relative Policy Optimization) and DPO (Direct Preference Optimization) are being applied to tool-calling models as a post-SFT step. 561-group-finance-operations-services-sectionyLLM paper (Nov 2025) found that hybrid SFT+DPO+RL optimization produces the most stable agentic behavior on edge devices. This is newer territory — SFT alone gets you 80% of the way.

### Distillation from Large Models

The ToolACE and APIGen-MT approaches use large models (GPT-4, Claude) to generate synthetic training data, then fine-tune small models on that data. This is the dominant pattern because:
- Frontier models produce high-quality tool-calling traces
- Automated verification catches errors before they enter training data
- The small model only needs to learn structured invocation, not general reasoning

## Datasets: What to Train On

### Open-Source Datasets

| Dataset | Size | Format | Quality | Best For |
|---------|------|--------|---------|----------|
| **APIGen-MT-5k** (Salesforce) | 5,000 multi-turn trajectories | Verified agent-human interplay | High — committee-verified | Multi-turn tool calling |
| **ToolACE** (Team-ACE) | 26,507 APIs, multi-turn dialogs | Self-evolution synthesis | High — dual-layer verification | Broad API coverage |
| **xLAM-function-calling-60k** (Salesforce) | 60,000 examples | Function calling pairs | Medium-High | Single-turn function calling |
| **glaive-function-calling-v2** (Glaive) | ~113k conversations | Chat + function calls | Medium — some invalid JSON | Basic function calling training |
| **When2Call** (NVIDIA) | Decision-focused | When to call vs. not call | Medium-High | Relevance detection |
| **ToolMind** (2025) | Composite from multiple sources | Reasoning-enhanced | High | Full tool-use pipeline |

### Generating Custom Data

For domain-specific tool use (e.g., our own MCP tools), the established pipeline is:
1. Define tool schemas (JSON Schema format)
2. Use a frontier model to generate synthetic multi-turn conversations invoking those tools
3. Validate outputs programmatically (schema compliance, tool existence, argument types)
4. Use a second LLM as a quality reviewer
5. Filter to high-confidence examples

APIGen-MT is the reference implementation for this pipeline. 500-2,000 verified examples are typically sufficient for a narrow tool set.

## Benchmarks: How to Measure Tool-Use Quality

### Berkeley Function Calling Leaderboard (BFCL) V4

The primary benchmark. Evaluates across five categories:
- **Simple**: Single function, single argument
- **Multiple**: Choose correct function from candidates
- **Parallel**: Call multiple functions simultaneously
- **Parallel-Multiple**: Both parallel and multi-function
- **Relevance Detection**: Correctly refuse when no function matches

BFCL V4 adds agentic evaluation: multi-hop web search with error recovery, agent memory management, and format sensitivity.

**Recent small-model scores (BFCL, as of March 2026):**
- xLAM-2-3b-fc-r: 65.74% overall, 81.03% live execution
- xLAM-2-1b-fc-r: 53.97% overall
- ToolACE-8B: Comparable to GPT-4 on earlier BFCL versions

### Tau-Bench

Tests tool-calling in realistic enterprise scenarios (retail, airline). xLAM-2-70b achieves 56.2% (vs. GPT-4o at 52.9%, Claude 3.5 Sonnet at 60.1%). Small-model results are lower but the benchmark tests a different axis than BFCL — sustained multi-turn coherence.

### ToolBench / API-Bank

Earlier benchmarks, still useful for evaluating API selection from large pools. Less focus on multi-turn interaction.

## Cost Analysis

### Fine-Tuning Costs

| Scenario | Hardware | Time | Cost |
|----------|----------|------|------|
| 1.5B model, 2k examples, QLoRA | RTX 4090 (Runpod spot) | 1-2 hours | $1-3 |
| 3B model, 5k examples, QLoRA | RTX 4090 (Runpod spot) | 2-4 hours | $2-5 |
| 7B model, 5k examples, QLoRA | RTX 4090 (Runpod spot) | 4-8 hours | $3-8 |
| 7B model, 5k examples, QLoRA | H100 80GB (cloud) | 1-3 hours | $5-12 |

Unsloth reduces these times by roughly 2x. A complete fine-tuning run for a 3B tool-calling model costs under $5 in compute.

### Inference Costs (Self-Hosted)

**GPU inference (single RTX 4090):**
- 1-3B models: 50-100+ tokens/sec
- 7-8B models: 30-60 tokens/sec
- Cost: ~$0.40-0.80/hour on cloud, or one-time $1,600 purchase

**CPU inference (VPS, no GPU):**
- 1B model (4-bit GGUF): 5-15 tokens/sec, ~1.5 GB RAM
- 3B model (4-bit GGUF): 3-8 tokens/sec, ~2.5 GB RAM
- 7B model (4-bit GGUF): 1-4 tokens/sec, ~5 GB RAM
- Cost: Included in VPS hosting

**Comparison to API costs:**
- Claude Haiku: ~$0.25/M input tokens, $1.25/M output tokens
- GPT-4o-mini: ~$0.15/M input, $0.60/M output
- Self-hosted 3B model on CPU: Effectively free after hosting costs

Break-even for self-hosting depends on volume. At 1,000+ tool calls per day, self-hosting a small model is dramatically cheaper than API calls — even on CPU.

### Inference Runtimes

| Runtime | Best For | Notes |
|---------|----------|-------|
| **llama.cpp / llamafile** | CPU inference, single user | 3-4x faster than Ollama on CPU; best for our VPS |
| **Ollama** | Easy local deployment | Good developer experience, slower at scale |
| **vLLM** | GPU, high concurrency | 793 TPS peak; overkill for single-user |
| **Smolagents** | Agent orchestration | Not an inference runtime — wraps models |

## What's Realistic for Our VPS

Our setup: Ubuntu 25.10 VPS, no GPU, CPU-only inference.

**Can do now:**
- Deploy xLAM-2-3b-fc-r (GGUF, 4-bit) via llamafile or Ollama
- Get 3-8 tokens/sec on CPU — sufficient for structured tool calls where the response is a JSON function invocation (typically 50-200 tokens)
- Latency per tool call: 5-30 seconds depending on response length
- RAM usage: ~2.5 GB for the model

**Can do with a rented GPU session:**
- Fine-tune Qwen2.5-3B on our MCP tool schemas using QLoRA
- Generate training data from Claude session logs (input/output pairs for tool calls)
- Total cost: $5-10 for a complete fine-tuning run
- Deploy resulting model weights back to VPS for CPU inference

**Cannot do (without GPU):**
- Fine-tune on the VPS itself — QLoRA still requires GPU
- Run 7B+ models at interactive speeds on CPU
- Handle concurrent inference requests efficiently

**Recommended path:**
1. Start by deploying xLAM-2-3b-fc-r as-is for procedural duties (frontmatter validation, event classification, schema compliance)
2. Log all tool-calling interactions from Claude sessions
3. When we have 500+ verified examples, rent an RTX 4090 for 2 hours and fine-tune a Qwen2.5-3B variant on our specific tool schemas
4. Deploy the fine-tuned model alongside the generic xLAM for A/B comparison
5. Iterate: collect failures, add to training set, re-fine-tune monthly

## Key Papers

**ToolACE (ICLR 2025).** Introduced a self-evolution synthesis pipeline that generates diverse tool-calling data from a pool of 26,507 APIs. The key insight: automated data generation with dual-layer verification (rule-based + model-based) produces training data good enough that an 8B model matches GPT-4 on function calling.

**APIGen-MT (Salesforce, April 2025).** A two-phase framework for generating multi-turn tool-calling data through simulated agent-human interplay. Phase 1 creates task blueprints with ground-truth actions; Phase 2 transforms them into full interaction trajectories. The resulting xLAM-2 models are the current BFCL leaders.

**TinyLLM (arXiv 2511.22138, November 2025).** Systematic evaluation of small models for agentic tasks on edge devices. Found that hybrid optimization (SFT + DPO + RL) produces the best results, and that 1-3B models in the "optimal bracket" achieve 5-15 tokens/sec on edge hardware — sufficient for tool-calling agents.

**Meta-Tool (ACL 2025).** Addresses "open-world" function calling — when the tool set is not fixed at training time. Introduces a framework where the model first identifies whether a tool exists, then invokes it. Relevant for systems where the tool inventory changes.

**Multi-Stage LLM Fine-Tuning with Continual Learning (ACL 2025 Findings).** Shows that continual post-training can refresh model behaviors without catastrophic forgetting, using progressive modules. Important for iterative fine-tuning as our tool set evolves.

## Open Questions

1. **How much does domain-specific fine-tuning help over off-the-shelf xLAM?** We won't know until we try. The xLAM models were trained on general API calling; our MCP tools have specific schemas and interaction patterns.

2. **Can we automate the training data pipeline?** The pieces exist (session logging, Claude-generated ground truth, schema validation) but nobody has published a turnkey "observation stream to fine-tuning pipeline" for operational agent harnesses.

3. **What's the failure mode?** A small model that confidently invokes the wrong tool is worse than one that refuses. Relevance detection (knowing when NOT to call a tool) is the hardest category on BFCL for small models.

4. **Does reinforcement learning from tool execution feedback work?** GRPO with verifiable rewards from actual tool execution is theoretically the right approach for iterative improvement, but published results are sparse for sub-10B models.
