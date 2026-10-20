from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings, read from environment variables (see .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://element:element@db:5432/element_quest"
    secret_key: str = Field(min_length=32)
    admin_password: str = Field(min_length=8)
    student_default_password: str = Field(default="elements", min_length=4)
    # Seeded accounts: "username:Display Name" pairs, comma-separated.
    seed_students: str = "soysauce:Soy Sauce,ketchupking:Ketchup King"
    # Days, streaks and "today" are counted in this time zone.
    app_timezone: str = "America/Denver"
    # Learning: at most this many brand-new cards per student per day, so the queue stays small.
    new_cards_per_day: int = 20
    # An element is mastered when every one of its cards has a review gap of at least this many days.
    mastery_days: int = 21
    # A right answer faster than this counts as "Easy" (longer gap before it comes back).
    easy_answer_ms: int = 4000
    session_days: int = 30
    login_max_failures: int = 5
    login_lockout_seconds: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
