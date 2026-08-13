# Care Loop

With a growing aging population, a huge amount of healthcare access depends on something that sounds basic: whether elderly patients can successfully navigate, understand, and complete forms.

Care Loop is an AI completion agent: a screen-aware, comprehension-aware layer between patients and the healthcare system.

Most AI assistants optimize for answering questions. We optimize for successful completion. Care Loop does not stop after giving the right answer. It stays with the patient until they understand what they are reading, complete the required information, and confidently sign.

The bigger vision goes beyond accessibility. Care Loop creates a verifiable record of what was shown, explained, understood, and approved. We see this as the first step toward a liability layer for high-stakes AI, moving beyond simply observing AI behavior to creating evidence that can stand up to compliance review or legal scrutiny.

## What this demo does

The MVP walks a caller through one form, a Medicare Annual Wellness Visit, using a voice guide. Identity is the caller phone number, not an ElevenLabs conversation id, so a dropped call can resume and a second call can adapt.

Two beats the demo is built to show:

1. Kill the session mid-form. Call back. The agent picks up at the last confirmed clause instead of starting over.
2. Call again as the same person. Known fields and prior comprehension come back, so the second pass is shorter.

What gets written down:

- Short-term enrollment state in LangGraph checkpoints (MongoDB), keyed by phone
- Long-term caller memory in `caller_profiles.memory_text`, retrieved with Atlas Vector Search (`autoEmbed` / Voyage)
- An audit trail of sessions, clauses confirmed, fields collected, and consent

The patient UI is a voice-guided enrollment flow. The staff UI is a live dashboard of that same enrollment: status, fields, and the event log of what was explained and approved.

## Layout

- `web/` — Next.js frontend (home, staff dashboard, patient enrollment, ElevenLabs session proxy)
- `backend/` — FastAPI + LangGraph persistence API for the voice agent
- `scripts/demo_beats.sh` — curl script that proves resume and second-call adapt without the UI

The frontend lives under `web/` so the Next.js `app/` router does not collide with a Python `app/` package.

## Run it

Copy `.env.example` to `.env` at the repo root (persistence) and to `web/.env.local` (Next.js). You need `MONGODB_URI`. ElevenLabs keys are required for the live mic.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

```bash
npm --prefix web install
npm --prefix web run dev
```

Then:

- Patient: [http://localhost:3000/patient/demo-001](http://localhost:3000/patient/demo-001)
- Staff: [http://localhost:3000/staff](http://localhost:3000/staff)
- Persistence health: [http://localhost:8000/health](http://localhost:8000/health)

To prove the two memory beats against the API only:

```bash
./scripts/demo_beats.sh
```

## Voice agent tools

Point the ElevenLabs agent at these client tools so the form updates while the patient talks:

- `get_caller_context`
- `upsert_field(field, value)`
- `record_comprehension(clause_id, summary)`
- `record_consent`
- `advance_step(step)`

Server tools can stay pointed at the FastAPI app (`/tools/*` and `/webhooks/elevenlabs/*`).
