import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


class UserRole(str, Enum):
    CEO = "CEO"
    COO = "COO"
    BD_DIRECTOR = "BD Director"
    BD_MANAGER = "BD Manager"
    LEGAL = "Legal"
    FINANCE = "Finance"
    IT_ADMIN = "IT Admin"


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.BD_MANAGER)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    bd_deals: list["Deal"] = Relationship(
        back_populates="bd_owner",
        sa_relationship_kwargs={"foreign_keys": "[Deal.bd_owner_id]"},
    )
    created_deals: list["Deal"] = Relationship(
        back_populates="created_by",
        sa_relationship_kwargs={"foreign_keys": "[Deal.created_by_id]"},
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ─────────────────────────────────────────────────────────────────────────────
# DEAL PIPELINE — Enums
# ─────────────────────────────────────────────────────────────────────────────

class DealStage(str, Enum):
    LEAD = "Lead"
    NDA_QUALIFIED = "NDA / Qualified"
    FEASIBILITY = "Feasibility"
    PROPOSAL = "Proposal"
    NEGOTIATION = "Negotiation"
    LOI_SIGNED = "LOI Signed"
    HMA_SIGNED = "HMA Signed"
    PRE_OPENING = "Pre-opening"
    OPENED = "Opened"
    LOST = "Lost"


class DealRisk(str, Enum):
    GREEN = "Green"
    AMBER = "Amber"
    RED = "Red"


class DealFeasibility(str, Enum):
    TBD = "TBD"
    WEAK = "Weak"
    MEDIUM = "Medium"
    STRONG = "Strong"
    UPDATED = "Updated"


class ProjectType(str, Enum):
    NEW_BUILD = "Hotel New Build (Greenfield)"
    RE_BRAND = "Hotel Re-Brand"
    CONVERSION = "Hotel Conversion (Takeover)"
    ADAPTIVE_REUSE = "Hotel Adaptive Re-Use"
    SERVICED_APT = "Serviced Apartment New Build"
    WELLNESS = "Wellness / Spa Resort"
    RESIDENCES = "Branded Residences"


class APACRegion(str, Enum):
    VIETNAM = "Vietnam"
    THAILAND = "Thailand"
    SEA = "Southeast Asia"
    GREATER_CHINA = "Greater China"
    NORTH_ASIA = "North Asia"
    SOUTH_ASIA = "South Asia"
    AUSTRALIA = "Australia / Pacific"
    EUROPE = "Europe"
    AMERICAS = "Americas"
    MIDDLE_EAST = "Middle East & Africa"


# ─────────────────────────────────────────────────────────────────────────────
# DEAL — Models
# ─────────────────────────────────────────────────────────────────────────────

class DealBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    country: str = Field(max_length=100)
    region: APACRegion | None = Field(default=None)
    city: str | None = Field(default=None, max_length=100)
    owner_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=100)
    project_type: ProjectType | None = Field(default=None)
    stage: DealStage = Field(default=DealStage.LEAD)
    opening_target: str | None = Field(default=None, max_length=20)  # "Q3 2026"
    keys: int | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    pipeline_value: int | None = Field(default=None, ge=0)   # USD
    fee_forecast: int | None = Field(default=None, ge=0)     # USD/year
    risk: DealRisk = Field(default=DealRisk.GREEN)
    feasibility: DealFeasibility = Field(default=DealFeasibility.TBD)
    next_action: str | None = Field(default=None, max_length=500)


class DealCreate(DealBase):
    bd_owner_id: uuid.UUID | None = None


class DealUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    region: APACRegion | None = None
    city: str | None = Field(default=None, max_length=100)
    owner_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=100)
    project_type: ProjectType | None = None
    opening_target: str | None = Field(default=None, max_length=20)
    keys: int | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    pipeline_value: int | None = Field(default=None, ge=0)
    fee_forecast: int | None = Field(default=None, ge=0)
    risk: DealRisk | None = None
    feasibility: DealFeasibility | None = None
    next_action: str | None = Field(default=None, max_length=500)
    bd_owner_id: uuid.UUID | None = None


class Deal(DealBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    deal_number: int | None = Field(default=None, index=True)  # FUS-00001

    bd_owner_id: uuid.UUID | None = Field(
        default=None, foreign_key="user.id", nullable=True, ondelete="SET NULL"
    )
    created_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")

    stage_changed_at: datetime | None = Field(
        default=None, sa_type=DateTime(timezone=True)
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )

    # Relationships
    bd_owner: "User | None" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Deal.bd_owner_id]"},
        back_populates="bd_deals",
    )
    created_by: "User | None" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Deal.created_by_id]"},
        back_populates="created_deals",
    )
    audit_logs: list["DealAuditLog"] = Relationship(
        back_populates="deal", cascade_delete=True
    )


class DealPublic(DealBase):
    id: uuid.UUID
    deal_number: int | None = None
    bd_owner_id: uuid.UUID | None = None
    bd_owner_name: str | None = None   # flattened for frontend
    created_by_id: uuid.UUID
    days_in_stage: int = 0             # computed from stage_changed_at
    stage_changed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DealsPublic(SQLModel):
    data: list[DealPublic]
    count: int


# ─────────────────────────────────────────────────────────────────────────────
# DEAL STAGE CHANGE — with mandatory audit note
# ─────────────────────────────────────────────────────────────────────────────

class StageChangeRequest(SQLModel):
    new_stage: DealStage
    note: str = Field(min_length=1, max_length=1000)
    next_action: str | None = Field(default=None, max_length=500)


# ─────────────────────────────────────────────────────────────────────────────
# DEAL AUDIT LOG
# ─────────────────────────────────────────────────────────────────────────────

class DealAuditLog(SQLModel, table=True):
    __tablename__ = "deal_audit_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    deal_id: uuid.UUID = Field(foreign_key="deal.id", ondelete="CASCADE")
    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    field: str = Field(max_length=100)
    old_value: str | None = Field(default=None, max_length=500)
    new_value: str = Field(max_length=500)
    note: str | None = Field(default=None, max_length=1000)
    created_at: datetime = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )

    deal: Deal | None = Relationship(back_populates="audit_logs")


class DealAuditLogPublic(SQLModel):
    id: uuid.UUID
    field: str
    old_value: str | None
    new_value: str
    note: str | None
    user_id: uuid.UUID
    created_at: datetime
