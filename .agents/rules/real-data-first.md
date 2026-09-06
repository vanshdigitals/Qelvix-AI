# Qelvix Product Invariant: REAL DATA ONLY

## Core Mandate
Qelvix must **NEVER** present fake, fabricated, placeholder, simulated, or hardcoded data as if it were real production data.

**REAL DATA > COMPLETE-LOOKING UI**
A partially empty but truthful product is infinitely better than a visually complete product containing fabricated data.

---

## 1. Real-Data-First Policy
The live Qelvix product must strictly use:
- **Real user / account data**
- **Real organization data**
- **Real authenticated sessions**
- **Real domains & assets** entered by the user
- **Real DNS, SSL, and security checks**
- **Real scan results and reports**
- **Real findings and vulnerability records**
- **Real risk calculations** (derived deterministically from real findings)
- **Real database records** (PostgreSQL / Supabase)
- **Real API responses**
- **Real-time / current data** wherever a feature requires it
- **Real notification / delivery status**
- **Real system & provider status**

### Prohibitions
- **DO NOT** create fake data just to make a screen or chart look populated.
- **DO NOT** hardcode example users, organizations, findings, scores, scan results, notifications, reports, metrics, or activity into production UI.
- **DO NOT** use fake loading-success flows or synthetic delays that imply an operation happened when it did not.
- **DO NOT** render static/arbitrary distribution bars or percentages (e.g. arbitrary severity breakdown bars). If counts are 0, show an honest empty track.

---

## 2. When a Feature Is Not Ready
If a feature cannot currently work with real data or a real backend integration:
- **DO NOT simulate it.**
- Clearly mark that functionality as:
  - `"Under Development"`
  - `"Coming Soon"`
  - `"Not yet available"`
- Prefer honest, truthful empty states:
  - `"No scan data yet"`
  - `"No findings available"`
  - `"This feature is under development"`
  - `"Connect an asset to begin"`

---

## 3. Isolated Demo / Sample Data
If sample or demo data is required for local development, tests, or documentation screenshots:
- Keep it clearly isolated from production pathways.
- Label it explicitly as `"Sample"`, `"Demo"`, or `"Example"`.
- Never mix it with real user data.
- Never make it appear as live production activity.
- Never use it to claim actual product traction.

---

## 4. Truthful Integrations & Provider States
If an external service or provider is not connected, configured, or verified:
- Do not pretend it is active or working.
- Show its actual state:
  - `Connected`
  - `Disconnected`
  - `Unavailable`
  - `Under Development`
  - `Not Configured`
  - `Rate Limited`
  - `Failed`

---

## 5. Truthful Error Handling
If an API, database query, or integration fails:
- Show a truthful error or degraded state (e.g., `"Unable to load findings — Retry"`).
- **DO NOT** silently catch errors and fall back to dummy/placeholder data.

---

## 6. Security & Compliance Integrity
Never fabricate:
- Security certifications or accreditations
- Compliance certifications
- DPDP certification (describe as a *technical / readiness indicator* based on observable signals, never as a legal certification)
- Audit results or security guarantees
- Vulnerability counts, uptime, or enterprise readiness

---

## 7. Development Standard for All Engineers & Agents
Before implementing any new UI, endpoint, or feature, ask:
> **"Where does this data come from in the real system?"**

If there is no real source yet:
1. Do not fabricate or hardcode the data.
2. Implement the proper empty or under-development state.
3. Document what backend endpoint or integration is required.
