from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "never_cold"
    memory_index_name: str = "memory_index"
    autoembed_model: str = "voyage-4-lite"


settings = Settings()
