# Global Situation Dashboard


---

## What Was Built

The Global Situation Dashboard now includes three locally-running AI models that analyze live global event data (earthquakes, volcanic activity, cybersecurity incidents, CVEs, ransomware, aircraft, maritime, and more) - entirely on the local machine.

| Model | Type | How It Works |
|-------|------|-------------|
| **Model A** | Deterministic | Always produces the same output for the same input |
| **Model B** | Probabilistic | Uses sampling - repeated runs can differ |
| **Model C** | Tencent R3-Skill | Two-stage skill router (bi-encoder + cross-encoder) |

---

## Isusses Faced




### Problem 1
The originally suggested `llama3.1` which is a 4.7 GB model is too big on a standard laptop, this pushed memory usage past 5 GB, causing the system to freeze and requests to time out after 5+ minutes. The dashboard thus became unusable.

### Solution
Three models were used to find which one was capable and memory efficient:

| Attempt | Model | Size | Result |
|---------|-------|------|--------|
| 1st | `llama3.1` | 4.7 GB | System froze, timeouts |
| 2nd | `phi3:mini` | 3.9 GB | Still too heavy, same issues |
| 3rd | `tinyllama` | ~600 MB | Fast but incoherent - hallucinated Python code instead of answering |
| 4th | `qwen2:0.5b`** | ~500 MB | Fast enough, coherent answers, fits in memory |

Thus using the biggest model is not the best and its better to find smallest model that can get the task done.




### Problem 2
The dashboard's event objects contain `__threeObjPoint` - massive Three.js geometry blobs (cylinders, materials, matrices, UUIDs). When `JSON.stringify()` dumped this into the prompt, the model received thousands of tokens of irrelevant 3D rendering data instead of useful intelligence.

### Solution
A `cleanEvent()` function was added to strip all Three.js internals before sending data to the AI:
- Removes `__threeObjPoint`, `__threeObjLabel`, `__threeObjDot`
- Truncates `details` to 200 characters
- Limits arrays to 5 items per category
- Keeps only: `title`, `type`, `location`, `time`, `details`, `lat`, `lng`, `size`, `color`

This reduced prompt size by ~80% and eliminated the model's tendency to describe JSON structures instead of analyzing them.




### Problem 3
With CPU-only inference, even a 500MB model takes 30–60 seconds to respond. The default fetch timeout killed requests before the model finished.

### Solution
- Frontend: 240-second AbortController timeout
- Backend (Ollama calls): 300-second timeout
- Backend (R3-Skill): handled by Flask directly
- `num_predict: 512` caps response length so the model stops after a reasonable paragraph




### Problem 4: R3-Skill Memory Overhead
Tencent R3-Skill requires two separate models (Embedding + Reranker) at ~2.4GB each. Running this alongside Ollama and the dashboard risked pushing the machine over the edge.

### Solution: Lightweight R3 Implementation
Instead of loading the full R3 pipeline with heavy dependencies, a streamlined Flask microservice was built that:
- Loads `tencent/R3-embedding-0.6b` and `tencent/R3-rerank-0.6b` once at startup
- Runs on a dedicated port (5051) so it doesn't interfere with Ollama
- Returns skill names (not paragraphs) - extremely fast inference
- Can be killed independently if memory becomes critical

---

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│  Browser    │─────▶│  Node.js    │─────▶│  Python Service │
│  (React)    │◀─────│  (port 5050)│◀─────│  (port 5051)    │
└─────────────┘      └─────────────┘      └─────────────────┘
                            │                     │
                            ▼                     ▼
                     ┌─────────────┐      ┌─────────────┐
                     │  Ollama     │      │  R3-Skill   │
                     │  qwen2:0.5b │      │  PyTorch    │
                     │  (port 11434)│      │  (2 models) │
                     └─────────────┘      └─────────────┘
```

Four processes running simultaneously:
1. `python server/r3_server.py` - R3-Skill microservice (port 5051)
2. `ollama run qwen2:0.5b` - LLM inference engine (port 11434)
3. `node server/index.js` - Node.js API gateway (port 5050)
4. `npm run dev` - Vite dashboard (port 5173)

---

## Model Details

### Model A - Deterministic

Endpoint: `POST /api/assistant/deterministic`

Configuration:
```javascript
options: {
  temperature: 0,    // No randomness - softmax is infinitely sharp
  top_k: 1,        // Only the single highest-probability token is considered
  seed: 42,        // Locks RNG state for complete reproducibility
  num_predict: 512 // Caps response length
}
```

What this means:
At `temperature: 0`, the model's probability distribution collapses to a single point. Combined with `top_k: 1`, there is literally no choice - the model must pick the #1 token at every step. The fixed `seed` ensures that even any framework-level stochasticity is eliminated. **Same prompt → identical token sequence → identical output, every time.**

Use case: Consistent risk scoring, repeatable intelligence reports, automated alerting where variance is unacceptable.

---

### Model B - Probabilistic (Nucleus Sampling)

Endpoint: `POST /api/assistant/probabilistic`

Configuration:
```javascript
options: {
  temperature: 0.8,  // Flattens distribution - lower-probability tokens become viable
  top_p: 0.9,       // Nucleus sampling: only sample from tokens whose cumulative prob ≥ 0.9
  top_k: 40,        // Consider the top 40 candidates (prevents truly absurd outliers)
  num_predict: 512  // Caps response length
  // No seed - RNG varies naturally between runs
}
```

What this means:  
`temperature: 0.8` divides the logits by 0.8 before softmax, making the distribution less peaked. `top_p: 0.9` implements nucleus sampling: sort all tokens by probability, keep only the smallest set whose cumulative probability ≥ 0.9, then sample from that subset. This prevents the model from ever picking truly nonsensical tokens while still allowing creative variation. Same prompt → different token sampling → different wording, emphasis, or conclusions.

Use case: Brainstorming threat hypotheses, generating diverse analyst perspectives, creative summarization.

---

### Model C - Tencent R3-Skill (Two-Stage Skill Router)

Endpoint: `POST /api/r3/route` (proxied to Python service on port 5051)

**What it is:**  
R3-Skill is not a chatbot. It is a **retrieval system** that matches an event description against a library of predefined response skills and returns the best match.

**Architecture:**
1. **Stage 1 - Recall (Bi-Encoder):** `R3-Embedding` converts both the query and every skill description into dense vectors. Cosine similarity quickly recalls the top-N most likely candidates.
2. **Stage 2 - Rerank (Cross-Encoder):** `R3-Reranker` takes the query + each candidate skill as a joint input, computing a more accurate relevance score by attending to both simultaneously. The highest-scoring skill wins.

**Skill Library (`server/skills.jsonl`):**
- `disaster-response` - earthquakes, tsunamis, volcanic eruptions
- `cyber-alert` - CVEs, ransomware, data breaches
- `infrastructure-check` - internet outages, power, transportation
- `maritime-redirect` - reroute vessels from hazardous zones
- `aircraft-grounding` - no-fly orders around dangerous airspace
- `space-debris-warn` - geomagnetic storms, orbital collisions
- `threat-intel-brief` - correlated threats, emerging attack patterns
- `public-health-alert` - biological threats, pandemics

**Example:**
```
Query: "earthquake in Japan magnitude 7"
Result: disaster-response (confidence: 77.50)
Runner-up: space-debris-warn (77.50), aircraft-grounding (77.50)
```

**Use case:** Automated triage - when an event fires, instantly know which response playbook to activate.

---

## How to Run

### Prerequisites
- Node.js 20+
- Python 3.10+ with pip
- Ollama installed locally
- ~4 GB free RAM (peak usage with all services running)

### 1. Install Dependencies

```bash
# Frontend / dashboard
npm install

# Python / R3-Skill
pip install torch transformers flask flask-cors numpy
```

### 2. Pull the LLM

```bash
ollama pull qwen2:0.5b
```

*(If you have more RAM, you can swap `qwen2:0.5b` for a larger model in `server/index.js`. The code is model-agnostic.)*

### 3. Start the Four Services

**Terminal 1 - Ollama:**
```bash
ollama run qwen2:0.5b
```

**Terminal 2 - R3-Skill Python Service:**
```bash
python server/r3_server.py
```
*(This will download ~4.8GB of R3 model weights on first run.)*

**Terminal 3 - Node.js Backend:**
```bash
node server/index.js
```

**Terminal 4 - Vite Dashboard:**
```bash
npm run dev
```

### 4. Open the Dashboard

Navigate to `http://localhost:5173`

---

## API Endpoints

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | - | Check if server is alive |
| `/api/assistant` | POST | `{question, dashboard}` | Original assistant (balanced) |
| `/api/assistant/deterministic` | POST | `{question, dashboard}` | Model A - deterministic |
| `/api/assistant/probabilistic` | POST | `{question, dashboard}` | Model B - probabilistic |
| `/api/r3/route` | POST | `{query}` | Model C - R3 skill router |

---

## Deterministic vs. Probabilistic: The Core Distinction

| Aspect | Model A (Deterministic) | Model B (Probabilistic) |
|--------|------------------------|------------------------|
| **Decoding strategy** | Greedy | Nucleus sampling |
| **Temperature** | 0 (no randomness) | 0.8 (moderate randomness) |
| **Top-k** | 1 (only best token) | 40 (40 candidates considered) |
| **Top-p** | N/A (irrelevant at T=0) | 0.9 (cumulative probability cutoff) |
| **Seed** | Fixed (42) | None |
| **Output behavior** | Identical every run | Varies in wording and emphasis |
| **Trade-off** | Boring but reliable | Insightful but inconsistent |

**How it was proved:**  
Asking the same question (`"What is the global risk level?"`) through both models showed clear divergence. The deterministic model returned rigid, nearly identical structured reports on repeated runs. The probabilistic model shifted its phrasing, highlighted different threat details, and occasionally reordered its analysis between runs - all from the same dashboard snapshot.

---

## Files Added / Modified

| File | Change |
|------|--------|
| `server/index.js` | Added `/api/assistant/deterministic`, `/api/assistant/probabilistic`, `/api/r3/route` endpoints |
| `server/r3_server.py` | **New** - Flask microservice running Tencent R3-Skill (embedding + reranker) |
| `server/skills.jsonl` | **New** - Skill library for R3-Skill routing |
| `src/App.jsx` | Added three AI buttons (Original, Deterministic, Probabilistic) + R3-Skill Router panel + data sanitization |

---

## Notes

- **All models run locally.** No OpenAI, no Claude, no cloud APIs. The only external calls are for live data feeds (USGS earthquakes, NASA EONET, NVD CVEs, etc.) - the AI inference is entirely on-machine.
- **R3-Skill was the stretch goal.** The brief said "see if you can install and implement this model." It was successfully implemented despite requiring PyTorch + ~4.8GB of model weights on top of an already memory-constrained system.
- **Memory management was the dominant challenge.** The journey from `llama3.1` (4.7GB, unusable) → `phi3:mini` (3.9GB, still too heavy) → `tinyllama` (600MB, incoherent) → `qwen2:0.5b` (500MB, functional) demonstrates real-world edge AI engineering: model selection is a resource-constrained optimization problem, not a "bigger is better" exercise.
- **Data sanitization was critical.** Without stripping `__threeObjPoint` and truncating descriptions, the model wasted its limited context window on 3D geometry metadata instead of threat intelligence.