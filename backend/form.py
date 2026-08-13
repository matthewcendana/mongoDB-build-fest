"""Medicare Annual Wellness Visit — one form, five clauses."""

from typing import TypedDict


class Clause(TypedDict):
    id: int
    title: str
    script: str


FORM_NAME = "Medicare Annual Wellness Visit"
FORM_ID = "medicare_awv"

FORM_CLAUSES: list[Clause] = [
    {
        "id": 0,
        "title": "Purpose of the Annual Wellness Visit",
        "script": (
            "This visit is a yearly wellness check covered by Medicare. "
            "It is used to build or update your personalized prevention plan, "
            "not to treat a new illness today."
        ),
    },
    {
        "id": 1,
        "title": "What information will be collected",
        "script": (
            "We will collect your health history, current medications, "
            "and answers to a few questions about daily activities and mood "
            "so your care team can recommend screenings and follow-up."
        ),
    },
    {
        "id": 2,
        "title": "How information may be shared with the care team",
        "script": (
            "Your answers may be shared with your primary care clinician and "
            "members of your care team who help with this wellness visit. "
            "We do not sell this information."
        ),
    },
    {
        "id": 3,
        "title": "Confirm identity fields",
        "script": (
            "Please confirm the name, date of birth, and email we will use "
            "on this enrollment. If we already have them on file, I will "
            "read them back instead of asking you to repeat them."
        ),
    },
    {
        "id": 4,
        "title": "Consent to enroll",
        "script": (
            "If you understand this visit and agree to enroll, please say OK. "
            "That single word records your consent and I will hand you back "
            "to a person for wrap-up."
        ),
    },
]

CONSENT_CLAUSE_ID = 4
LAST_COMPREHENSION_CLAUSE_ID = 3


def clause_by_id(clause_id: int) -> Clause:
    if clause_id < 0 or clause_id >= len(FORM_CLAUSES):
        return FORM_CLAUSES[-1]
    return FORM_CLAUSES[clause_id]


def clause_title(clause_id: int) -> str:
    return clause_by_id(clause_id)["title"]
