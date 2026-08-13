from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "never_cold"
    embedding_api_key: str = ""
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    memory_index_name: str = "memory_index"
    embedding_dimensions: int = 1536

    @property
    def resolved_embedding_key(self) -> str:
        return self.embedding_api_key or self.openai_api_key


settings = Settings()
