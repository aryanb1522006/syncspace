# SyncSpace ML Features — Deep Technical Dive
### Internals of every algorithm/model: workflow, mechanics, rationale, and alternatives

This document goes one level deeper than a feature summary — for each algorithm/model added, it covers **exactly how it works internally, step by step**, **why it was chosen**, and **what else was considered and why it wasn't used instead.**

---

## PART A — TEXT EMBEDDINGS (turning text into numbers)

Every feature in this project depends on embeddings, so this is the foundational piece. Two interchangeable implementations exist behind one shared interface: `generateEmbedding(text) → number[]`.

### A.1 — The Hashing Embedding (default provider)

#### What problem it solves internally
We need a way to turn arbitrary text into a **fixed-length vector** (always the same size, e.g. 256 numbers, regardless of input text length) so that two vectors can always be compared, no matter how long or short the original text was.

#### Step-by-step internal mechanics
1. **Normalization** — lowercase everything, strip punctuation/symbols, collapse repeated whitespace. ("Machine-Learning!!" → "machine learning")
2. **Tokenization** — split into individual words.
3. **N-gram extraction** — generate both **unigrams** (single words: "machine", "learning") and **bigrams** (adjacent word pairs: "machine_learning"). Bigrams matter because they capture short phrases that mean something different from their individual words (e.g. "machine learning" vs. "machine" + "learning" separately).
4. **Stopword removal** — common filler words (the, a, is, and, ...) are dropped, since they add noise without adding meaning.
5. **Hashing each token into a bucket:**
   - Each remaining token (word or bigram) is passed through the **FNV-1a hash function** — a fast, well-known non-cryptographic hash algorithm (Fowler–Noll–Vo, variant 1a). It works by starting with a fixed "offset basis" number, then for each character: XOR the running hash with the character's byte value, then multiply by a fixed "FNV prime" number, keeping everything within a fixed bit-width (using modular/overflow arithmetic).
   - The resulting hash number is reduced (`hash % EMBEDDING_DIMENSIONS`, default 256) to pick **which slot/bucket** in the output vector this token contributes to. This is called the **"hashing trick"** — a well-known technique (used originally in tools like Vowpal Wabbit) for representing an unbounded vocabulary in a fixed-size vector without needing to maintain an explicit word-to-index dictionary.
6. **Sign assignment** — a **second, independent FNV-1a-based hash** of the same token decides whether that token's contribution to its bucket is **added or subtracted** (+1 or -1). This is a standard trick to reduce "hash collision bias" — without it, buckets would only ever accumulate positive values, which would systematically make all vectors correlate with each other just from bucket-count effects rather than genuine content overlap.
7. **Weighting by frequency** — a token that appears 3 times in the text contributes `sqrt(3)` instead of `3` to its bucket (square-root dampening) — this prevents a single very repetitive word from dominating the vector disproportionately (a common trick borrowed from TF-IDF-style weighting, without needing a full IDF corpus).
8. **L2 normalization** — once all tokens have been hashed into their buckets and summed, the entire 256-number vector is divided by its own "length" (square root of the sum of its squared values), so the final vector always has a length of exactly 1. This matters because cosine similarity divides by vector lengths anyway, but pre-normalizing keeps every embedding numerically consistent and easier to reason about/debug/cache.

#### Why this approach
- **Zero external dependencies** — pure JavaScript, no model to download, no native binary compatibility issues (unlike ONNX).
- **Deterministic and instant** — the same input always produces the same output immediately, with no cold-start/model-loading delay.
- **Works in any deployment environment**, including constrained ones (e.g. Alpine Linux containers) where a native ML runtime can't run.

#### What it fundamentally *cannot* do
It has no concept of meaning — only of shared vocabulary. "Car" and "automobile" will not be recognized as related, because they share no words or bigrams. It can only catch relationships that are visible at the surface/word level.

#### Alternatives considered (and why not used as the default)
| Alternative | Why not chosen as default |
|---|---|
| **One-hot encoding** (one dimension per unique word ever seen) | Vector size grows unboundedly with vocabulary; doesn't generalize to new/unseen words at all. |
| **TF-IDF vectors** | Requires maintaining a corpus-wide document-frequency table that updates as new projects are added — more moving state to keep consistent than a stateless hash function. |
| **Word2Vec / GloVe (pretrained static word vectors)** | Better than hashing at capturing some semantic relationships, but still needs a multi-hundred-MB pretrained file bundled or downloaded — similar deployment complexity to the transformer option, without the modern architecture's stronger performance. Not worth the complexity over hashing if you're going to accept a dependency anyway — might as well go straight to a transformer. |
| **Simple average of one-hot vectors** | Loses word order and phrase-level meaning entirely; bigrams already give the hashing approach an edge here at similar cost. |

---

### A.2 — The Transformer Embedding (optional, higher-quality provider)

#### What problem it solves internally
Real semantic understanding — recognizing that two differently-worded sentences describe the same idea, based on patterns learned from large-scale training on real text, not just shared vocabulary.

#### Step-by-step internal mechanics (what happens inside `Xenova/all-MiniLM-L6-v2`)
1. **Tokenization** — text is split into subword tokens (not necessarily whole words — e.g. "embedding" might become "em" + "##bed" + "##ding") using a WordPiece-style tokenizer, matching how the model was originally trained. Subword tokenization lets the model handle rare/unseen words gracefully by breaking them into familiar pieces.
2. **Token embedding lookup** — each subword token is converted into an initial vector using the model's learned embedding table (a lookup table built during training).
3. **Transformer encoder layers (self-attention)** — MiniLM (a distilled/compressed version of BERT-style architecture, 6 layers) passes the token vectors through several layers of **self-attention**: each token's representation gets updated by "attending to" every other token in the sentence, weighted by learned relevance. This is what lets the model understand context — e.g., the word "bank" gets a different final representation in "river bank" vs. "bank account," because attention lets nearby words influence each token's meaning.
4. **Mean pooling** — after the final layer, every token now has a context-aware vector. These are **averaged together** (mean pooling) into one single fixed-length vector representing the whole sentence (384 numbers, for this model).
5. **L2 normalization** — same final step as the hashing provider, so all vectors are comparable via cosine similarity on equal footing.

#### Why MiniLM specifically
- **Small enough to run locally in Node** via ONNX Runtime (no GPU, no external API call, no per-request cost or latency to a hosted API) — roughly 90MB, versus multi-GB for larger transformer models.
- **Purpose-built for sentence-level semantic similarity** — it was specifically fine-tuned (by its original authors) for tasks like this, unlike a raw general-purpose language model.
- **Runs via `@xenova/transformers`**, which packages ONNX-converted versions of popular Hugging Face models for JavaScript — meaning no Python runtime dependency, keeping the whole stack in Node.

#### Why it needs glibc (the Alpine issue, explained internally)
ONNX Runtime's Node bindings (`onnxruntime-node`) ship as **prebuilt native binaries** (compiled C++ code) linked against `glibc` system libraries (`libc.so.6`, `libstdc++.so.6`). Alpine Linux uses `musl libc` instead of `glibc` — a different, incompatible implementation of the same standard interfaces — so the binary's dynamic linker can't find the functions it needs, and it fails to load at the OS level, before any JavaScript even runs.

#### Alternatives considered (and why not used)
| Alternative | Why not chosen |
|---|---|
| **OpenAI / Anthropic / Cohere hosted embedding APIs** | Requires network calls per embedding request (latency + cost per call + external dependency on a third-party API being up), plus sending potentially sensitive student/project data to an external company. Running locally avoids all of this. |
| **A larger transformer (e.g. full BERT-base, or a bigger sentence-transformer)** | Better accuracy, but much larger download size, higher memory/CPU cost per embedding, slower cold starts — MiniLM already gives strong sentence-similarity performance at a fraction of the resource cost, which matters for an app running on a modest server. |
| **Fine-tuning a custom model on SyncSpace's own project/skill data** | Would need a large labeled dataset of "these two projects/skills are related" pairs, which doesn't exist yet. A pretrained general-purpose model is the pragmatic choice until enough usage data exists to justify fine-tuning. |
| **TF-IDF + cosine (no neural network at all)** | Effectively the same ceiling as the hashing provider — this was the "middle ground" not chosen, in favor of jumping straight to a true semantic model when going beyond hashing at all. |

---

## PART B — COSINE SIMILARITY (comparing any two embeddings)

### What problem it solves internally
Once text is turned into vectors, we need a single number representing "how alike are these two vectors" that's fair regardless of vector magnitude, works in high-dimensional space (256 or 384 dimensions — impossible to visualize directly), and is cheap to compute.

### Step-by-step internal mechanics
```
1. Dot product:      dot = Σ (a[i] × b[i])   for every dimension i
2. Magnitude of A:    |A| = √(Σ a[i]²)
3. Magnitude of B:    |B| = √(Σ b[i]²)
4. Cosine similarity: dot / (|A| × |B|)
```
Geometrically, this is the cosine of the angle between the two vectors (hence the name) — derived directly from the standard dot-product formula `A·B = |A||B|cos(θ)`, solved for `cos(θ)`.

**Defensive handling in the actual implementation:** if either vector is empty or has zero magnitude (all-zero vector — which can happen for very short or entirely-stopword text under the hashing provider), the function returns `0` instead of dividing by zero (which would produce `NaN` and silently corrupt every downstream calculation).

### Why cosine similarity specifically
- **Magnitude-independent** — a short phrase and a long paragraph about the same topic can still score close to 1, since only direction matters, not vector "size." This is important because our text inputs vary wildly in length (a 2-word skill name vs. a 200-word project description).
- **Standard, well-understood choice for text embeddings** — this is the default similarity metric essentially universally used in NLP/embedding contexts, making the codebase easy for any future engineer to reason about.
- **Cheap to compute** — just a dot product and two square roots, no complex math library needed.

### Alternatives considered (and why not used)
| Alternative | Why not chosen |
|---|---|
| **Euclidean distance** (straight-line distance between two points) | Sensitive to vector magnitude — a longer, more verbose piece of text would appear "farther away" even if it's about the exact same topic as a shorter one, since more words tend to produce numerically larger raw vectors before normalization. Cosine similarity sidesteps this entirely by design. |
| **Manhattan distance** (sum of absolute differences) | Same magnitude-sensitivity problem as Euclidean; also less standard for embedding comparison in NLP contexts. |
| **Dot product alone (no normalization)** | Would conflate "similar direction" with "similar magnitude" — two vectors pointing the same way but very different lengths would score differently than a true angle-based measure. Since embeddings are pre-normalized in this system anyway, dot product and cosine similarity would actually produce near-identical results here — but computing cosine explicitly documents intent clearly and stays correct even if normalization is ever skipped somewhere. |
| **Jaccard similarity** (set overlap: shared elements / total unique elements) | Works on sets, not continuous vectors — would require re-architecting text into token sets instead of dense embeddings, losing the ability to use a real semantic model like MiniLM at all. |

---

## PART C — TEXTRANK / PAGERANK (automatic summarization)

### What problem it solves internally
Given a long project description, automatically pick the small subset of sentences that best represent the *whole* description's core meaning — without any human-labeled "here's a good summary" training data.

### Step-by-step internal mechanics
1. **Sentence splitting** — the description is split into individual sentences using punctuation-based rules.
2. **Sentence embedding** — every single sentence is run through `generateEmbedding()` independently (so a 6-sentence description triggers 6 separate embedding calls).
3. **Building the similarity graph** — think of every sentence as a "node" in a graph. For every pair of sentences `(i, j)`, compute `cosineSimilarity(embedding_i, embedding_j)`, clamped to a minimum of 0 (negative similarity doesn't make sense as a graph "edge weight," so it's floored at zero). This produces an `N × N` matrix of edge weights, where `N` is the number of sentences.
4. **Row-normalization** — each row of the similarity matrix is divided by its own sum, turning raw similarity scores into a proper **transition probability matrix** — i.e., "if you're currently 'at' sentence i, what's the probability of 'moving to' sentence j," proportional to how similar j is to i relative to all other sentences.
5. **Power-iteration PageRank** — this is the exact same core idea Google originally used to rank web pages, just applied to sentences instead of pages, and to "how similar are these two sentences" instead of "does page A link to page B":
   - Start every sentence with an equal initial score (`1/N`).
   - Repeatedly update each sentence's score based on the weighted scores of all sentences pointing to it (via the transition matrix), combined with a **damping factor** (0.85) — a small probability (0.15) of "jumping to a random sentence" rather than always following the similarity graph, which prevents the algorithm from getting stuck or converging unfairly toward a small tightly-connected cluster.
   - Repeat this update up to 40 times, or stop early once scores stabilize (change between iterations drops below `1e-4`).
   - The final scores represent each sentence's **centrality** — how much it's "echoed" or reinforced by the meaning of the rest of the description.
6. **Sentence selection** — sort sentences by centrality score, greedily take the highest-scoring ones (skipping ones that would blow the word budget), then **restore them to their original order** (so the summary reads naturally, not as a jumbled "most important first" list), until the ~50-word limit is hit.
7. **Edge case handling** — if even the single top sentence exceeds the word budget on its own, it's hard-truncated at a word boundary with an ellipsis, so the summary generation never crashes or infinitely loops.
8. **Fallback path** — if embedding generation throws an exception anywhere in this process (e.g., a `transformers` failure), the whole TextRank approach is abandoned for that request, and a much simpler **word-frequency-based sentence scorer** is used instead (count word frequencies across the description, score each sentence by the sum of its words' frequencies, pick top sentences) — ensuring project creation is never blocked by an ML failure.

### Why TextRank specifically
- **Fully unsupervised** — needs zero labeled "here's a correct summary" training examples, which don't exist for this dataset.
- **Reuses existing infrastructure** — it needs nothing but the same `generateEmbedding()` and `cosineSimilarity()` functions already built for the matching feature; no new dependency introduced.
- **Well-suited to short, single-topic documents** — project descriptions are exactly this kind of text (one team, one idea, a handful of sentences), which is where TextRank performs well; it can struggle more on very long, multi-topic documents (like a full research paper) where centrality becomes less meaningful.
- **Deterministic and fast** — no external API call, completes in milliseconds for typical description lengths.

### Alternatives considered (and why not used)
| Alternative | Why not chosen |
|---|---|
| **LLM-based summarization** (calling an external model like GPT/Claude to summarize) | Adds an external API dependency, per-call latency and cost, and an extra point of failure for something as routine as project creation. Also less deterministic/reproducible than a local algorithm. |
| **Luhn's algorithm** (an older, simpler extractive summarization method based on word-frequency clustering within a sentence window) | Doesn't use embeddings at all — purely frequency-based, similar in spirit to the fallback path already built in for emergencies. TextRank's use of real semantic similarity between sentences gives noticeably better results when sentences repeat the same idea in different words (the exact scenario the "campus navigation" test case was built to demonstrate). |
| **LSA (Latent Semantic Analysis) / SVD-based summarization** | Works by finding hidden "topics" via matrix decomposition (SVD) across many sentences — genuinely useful for longer, multi-topic documents, but tends to be overkill (and less reliable) on short, single-topic text like a project description, where there usually isn't more than one real "topic" for SVD to meaningfully separate. |
| **Supervised extractive summarization (e.g. an SVM classifier trained to label sentences as "keep" or "cut")** | Requires a labeled training dataset of good/bad summary sentences — doesn't exist here, and building one would be a significant additional project on its own. |
| **Simple "first N sentences" heuristic** | Common naive baseline, but ignores which sentences actually carry the most meaning — the very problem TextRank exists to solve; would frequently keep introductory filler and cut a mid-paragraph sentence that best captures the project's core value. |

---

## PART D — SEMANTIC SKILL MATCHING (per-skill related-skill detection)

### What problem it solves internally
Catch cases where a student's skill and a project's required skill are conceptually related but not identical database entries (e.g., "Machine Learning" vs. "Deep Learning"), without having to manually maintain a lookup table of which skill IDs are "related" to which others.

### Step-by-step internal mechanics
1. **Exact-match pass first** (cheap, no embeddings): using a `Set` of the student's skill IDs, every project skill is checked for an exact ID match. Only the **leftover, unmatched** project skills proceed to the next step — this avoids wasting embedding calls on skills that already resolved exactly.
2. **Embed all student skill names** — for every skill the student has, get `generateEmbedding(skillName)`. This is cached in a **process-wide in-memory `Map`**, keyed by the lowercased skill name — since the platform's skill vocabulary is a small, largely fixed set (a few hundred entries at most), this cache means any given skill name only ever gets embedded once across the entire server's runtime, not once per request.
3. **For each leftover project skill:** embed its name too (same cache), then compute `cosineSimilarity()` against **every** student skill embedding, one at a time, keeping track of only the single **best** (highest-scoring) match.
4. **Threshold check:** if that best match's similarity clears `SEMANTIC_SKILL_THRESHOLD`, record it as a "related skill" (including *which* student skill it matched to, and the similarity score, for transparency in the UI); otherwise it's recorded as a genuine skill gap.

### Why this specific design (embed only skill names, not full descriptions)
Skill names are short (1-3 words) — embedding them individually, rather than as part of a larger blended text, keeps the comparison focused purely on the skill concept itself, uncontaminated by surrounding context that a longer bio/description would introduce.

### Why cache at the skill-name level specifically
Unlike project descriptions (which are unique per project) or student bios (unique per student), skill names repeat constantly across the whole platform ("Python," "React," "SQL" show up on many students and many projects). Caching at this granular level captures by far the most redundant, reusable computation in the whole system.

### Alternatives considered (and why not used)
| Alternative | Why not chosen |
|---|---|
| **A manually curated skill-relationship table** (e.g., an admin manually links "Machine Learning" ↔ "Deep Learning") | Doesn't scale — every new skill added to the platform would require manual relationship curation; embeddings generalize automatically to skills nobody explicitly linked. |
| **A skill taxonomy/ontology (e.g., a tree of skill categories)** | More structured and interpretable, but requires significant upfront design/maintenance effort and doesn't flexibly capture cross-branch relationships (e.g., "Public Speaking" relating to "Client Communication" in a way a rigid tree might not anticipate). |
| **Comparing every student skill against every project skill using their FULL embeddings from context** (i.e., reusing the whole-profile embedding instead of embedding skill names individually) | Would blur the specific skill-level signal into a broader, noisier profile-level signal — the whole point of this feature is a precise, skill-to-skill comparison, separate from the coarser profile-to-project comparison used for the main ranking score. |

---

## PART E — HYBRID SCORING (combining skill overlap + cosine similarity)

### What problem it solves internally
Turn two separate 0–1 signals (exact-skill-overlap-based `skillScore`, and semantic `cosineScore`) into one final ranking number, in a way that's transparent and doesn't silently let one signal dominate unexpectedly.

### Step-by-step internal mechanics
```
finalScore = (SKILL_SCORE_WEIGHT × skillScore + COSINE_SCORE_WEIGHT × cosineScore)
             ─────────────────────────────────────────────────────────────────────
                        (SKILL_SCORE_WEIGHT + COSINE_SCORE_WEIGHT)
```
Dividing by the sum of the weights (rather than assuming they already sum to exactly 1) means the formula stays mathematically correct even if someone configures, say, `0.7` and `0.5` by mistake — the result is still guaranteed to land within the valid 0–1 range.

### Why a simple weighted average, not something more sophisticated
- **Fully transparent and explainable** — a student or reviewer can look at `skillScore` and `cosineScore` directly (both are shown in the UI breakdown) and understand exactly how `finalScore` was derived, with no hidden model logic.
- **No training data required** — a learned combination (e.g., logistic regression, or a small neural network taking both scores as input) would need labeled examples of "this match was actually good/bad," which doesn't exist yet.
- **Instantly tunable** — the weights are environment variables, so the balance between "trust exact skills more" vs. "trust semantic similarity more" can be adjusted without any code change or redeployment of new model weights.

### Alternatives considered (and why not used)
| Alternative | Why not chosen |
|---|---|
| **Harmonic mean** (like an F1-score combination) | Would heavily penalize the final score whenever *either* signal is low, even if the other is very high — arguably too punishing for a recommendation-ranking context, where a strong signal in just one dimension (e.g. very high semantic similarity despite few exact skill matches) can still be a genuinely useful match worth surfacing. |
| **Max of the two scores** (whichever signal is higher wins) | Would let one weak, possibly noisy signal completely override useful information from the other — e.g., a coincidentally high cosine score from generic wording could dominate over a genuinely low skill overlap. |
| **A trained ranking model (learning-to-rank)** | The "correct" approach at scale with enough historical application/acceptance data to learn from — but no such labeled dataset exists yet for this platform. A transparent weighted average is the right interim approach until real usage data justifies a learned model. |
| **Multiplying the two scores together** | Would drive the final score toward zero whenever either input is small, similar to the harmonic-mean concern above, and produces less intuitively interpretable numbers than a weighted average of two already-0–1 scores. |

---

## PART F — DUPLICATE / SIMILAR PROJECT DETECTION

### What problem it solves internally
Identify project listings that are near-identical in substance (commonly caused by copy-pasted or AI-generated submissions) even when the wording differs, so students aren't shown redundant options without realizing it, and so the platform can surface distinguishing details to help tell them apart.

### Step-by-step internal mechanics
1. For a given batch of eligible projects, only ones with an already-computed `descriptionEmbedding` are considered (projects with no embedding yet are skipped, never triggering a fresh embedding call mid-request).
2. **Every unique pair** of projects (i, j) has its stored embeddings compared via `cosineSimilarity()` — this is an `O(n²)` pairwise comparison across all eligible projects in the current batch.
3. Any pair scoring at or above `DUPLICATE_SIMILARITY_THRESHOLD` is flagged as a likely duplicate/near-identical pair.
4. For each flagged pair, `differentiateProjects()` computes concrete, factual differences pulled straight from existing database fields (not invented or inferred): shared vs. unique required skill names, whether the two projects' domains match, the project **lead**'s name (`ownerName`), **team composition** (`teamSize` vs. current `memberCount`), and **timeline** (deadline dates, and how many days apart they are).
5. `groupSimilarProjectsByProjectId()` reorganizes the flat list of pairs into a per-project lookup table, and — since a "difference" description is naturally asymmetric (e.g., "this one has an earlier deadline" vs. "that one has an earlier deadline") — it correctly **swaps the perspective** of each difference depending on which project of the pair is currently being displayed.

### Why cosine similarity on full-description embeddings, rather than comparing raw text
Comparing embeddings (rather than, say, raw string edit-distance or word-overlap counting) means two descriptions that say the *same thing in different words* — the realistic case for AI-generated or lightly-reworded duplicate submissions — are still correctly caught, which a literal text-similarity check would miss entirely.

### Alternatives considered (and why not used)
| Alternative | Why not chosen |
|---|---|
| **Exact string/hash comparison** (e.g., MD5 of the description) | Only catches byte-for-byte identical text; trivially defeated by even a single reworded sentence, which is exactly the realistic "AI-generated duplicate" scenario this feature targets. |
| **Levenshtein/edit-distance comparison** | Measures character-level similarity, not meaning — two descriptions describing the same idea in substantially different wording would score as very different, even though they're conceptually duplicates. Also computationally expensive to run pairwise at scale compared to comparing precomputed vectors. |
| **Jaccard similarity on word shingles** (n-gram set overlap, similar in spirit to the hashing embedding's own approach) | A reasonable middle ground, but still fundamentally vocabulary-based rather than meaning-based — would miss true paraphrases the way the hashing embedding provider itself would, unless transformers are active. Since the same embedding infrastructure already exists for matching, reusing it here (rather than building a separate shingling/Jaccard pipeline) avoids duplicated logic. |
| **MinHash + Locality-Sensitive Hashing (LSH)** — a technique for efficiently finding near-duplicate documents at very large scale without full O(n²) comparison | A legitimate, more scalable approach for very large document collections, but adds real implementation complexity (hash families, banding, tuning false-positive/negative rates) that isn't justified at the platform's current project-count scale, where straightforward O(n²) pairwise comparison over precomputed vectors is already fast. Documented here as the natural next step if project volume grows substantially. |
| **Clustering algorithms (e.g., k-means or DBSCAN) on all project embeddings** | Useful for discovering *groups* of similar projects at once, rather than pairwise flags — a reasonable alternative framing, but pairwise comparison was simpler to reason about, easier to explain in the UI ("these two projects are similar," rather than "these five projects form a cluster"), and sufficient at current scale. |

---

## Summary table — one line per algorithm, "why this, not that"

| Algorithm | Chosen because | Main alternative rejected because |
|---|---|---|
| FNV-1a hashing embedding | Zero dependencies, deterministic, always available | Word2Vec/GloVe/TF-IDF need external data/files without meaningfully outperforming a stateless hash at this scale |
| MiniLM transformer embedding | Small enough to run locally, purpose-built for sentence similarity | Hosted APIs add latency/cost/external dependency; larger models cost more compute than the accuracy gain justifies here |
| Cosine similarity | Magnitude-independent, standard for text embeddings | Euclidean/Manhattan distance are magnitude-sensitive, penalizing length differences unfairly |
| TextRank (PageRank on sentences) | Unsupervised, reuses existing embedding infra, suited to short single-topic text | LLM summarization adds external dependency/cost; SVM needs labeled data; LSA suited to longer multi-topic text |
| Skill-name-level semantic matching with caching | Precise, scales automatically to new skills, caches the platform's small repeated vocabulary | Manual relationship tables don't scale; full-profile embeddings would blur the skill-specific signal |
| Weighted average hybrid scoring | Transparent, explainable, tunable without retraining | Learned ranking models need labeled data that doesn't exist yet; harmonic mean/multiplication over-punish single-signal matches |
| Pairwise cosine similarity for duplicate detection | Catches paraphrased/AI-generated duplicates, reuses existing vectors | Exact-hash/edit-distance miss paraphrases; MinHash/LSH adds complexity not justified at current scale |