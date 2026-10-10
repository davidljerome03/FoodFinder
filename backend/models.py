import uuid
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    preferences = Column(JSONB)
