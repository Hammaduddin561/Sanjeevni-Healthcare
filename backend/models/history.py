from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Store patient input data as JSON
    patient_data = Column(JSON)
    
    risk_score = Column(Float)
    risk_level = Column(String)

    # Relationship to User
    user = relationship("backend.models.user.User", backref="assessments")
