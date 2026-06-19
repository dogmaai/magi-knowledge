# PLM unit registry

The MAGI PLM units (the LLM roster). Each unit is a provider/model with a
persona, a budget weight, and a lifecycle status. The authoritative runtime
mapping is `getUnitName()` / `getLLMModel()` / `BUDGET_WEIGHTS` in
`magi-core/lib/config.js`; this registry mirrors it for cross-agent reference.

This whole tree is **cross-unit by definition** and therefore
`lilith_safe: false`. The LILITH training pipeline must never read it.

# Active units

| Unit | Provider | Model | Budget (NORMAL) | Persona |
|---|---|---|---|---|
| [SOPHIA-5](sophia-5.md) | mistral | mistral-small-latest | 0.774 | Strategist / golden reasoning (default) |
| [MELCHIOR-1](melchior-1.md) | google | gemini-2.5-flash | 0.954 | Systematic multi-factor analyst |
| [CASPER](casper.md) | deepseek | deepseek-v4-flash | 0.999 | Aggressive momentum hunter |
| [ZEROEL](zeroel.md) | xai | grok-4.3 | 0.5 | Realtime news / X social algo trader |
| [TIARA](tiara.md) | ollama | qwen2.5:14b | 1.0 | Self-hosted local reasoner |
| [LILITH](lilith.md) | qwen / lilith | qwen-plus / lilith-v1.0-b2-prod | 0.5 | Independent reasoner (fine-tuned) |
| [TYPHON](typhon.md) | kimi | kimi-k2.6 | 0.5 | Contrarian deep-value analyst |
| [PROMETHEUS](prometheus.md) | openai | gpt-4o-mini | — (auxiliary) | GPT auxiliary / backup |

# Deprecated units

| Unit | Provider | Status | Replaced by |
|---|---|---|---|
| [ANIMA](anima.md) | groq | DEPRECATED (#157) | [TYPHON](typhon.md) |
| [ORACLE](oracle.md) | together | DEPRECATED (#139) | — |

Deprecated providers (`DEPRECATED_PROVIDERS = {together, groq}`) are excluded
from budget-weight loading so they don't dilute active units' allocation.

# Relationship to LILITH

LILITH shares a unit slot across two providers (`qwen` DashScope path and
`lilith` fine-tuned inference service) so consensus and reporting keep working
when `LLM_PROVIDER` swaps. Per the
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md), LILITH
ignores every other unit in this registry.
