import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import ConfigDict, EmailStr
from sqlalchemy import DateTime, String
from sqlmodel import Field, Relationship, SQLModel


class _EnumAsStr(SQLModel):
    """Base that tells Pydantic to serialize enum fields as plain values."""
    model_config = ConfigDict(use_enum_values=True)


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
    role: UserRole = Field(default=UserRole.BD_MANAGER, sa_type=String(50))


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


class DealType(str, Enum):
    HMA = "HMA"
    TSA = "TSA"
    FRANCHISE = "Franchise"
    CONSULTING = "Consulting"
    PRE_OPENING = "Pre-opening"
    OTHER = "Other"


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

class DealBase(_EnumAsStr):
    name: str = Field(min_length=1, max_length=255)
    project_id: uuid.UUID | None = Field(default=None)  # Link to Project (nullable for backward compat)
    deal_type: DealType = Field(default=DealType.HMA, sa_type=String(20))
    country: str = Field(max_length=100)
    region: APACRegion | None = Field(default=None, sa_type=String(50))
    city: str | None = Field(default=None, max_length=100)
    owner_name: str | None = Field(default=None, max_length=255)
    brand: str | None = Field(default=None, max_length=100)
    project_type: ProjectType | None = Field(default=None, sa_type=String(80))
    stage: DealStage = Field(default=DealStage.LEAD, sa_type=String(30))
    opening_target: str | None = Field(default=None, max_length=20)
    keys: int | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    pipeline_value: int | None = Field(default=None, ge=0)
    fee_forecast: int | None = Field(default=None, ge=0)
    risk: DealRisk = Field(default=DealRisk.GREEN, sa_type=String(20))
    feasibility: DealFeasibility = Field(default=DealFeasibility.TBD, sa_type=String(20))
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
    bd_owner: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Deal.bd_owner_id]", "lazy": "select"}
    )
    created_by: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Deal.created_by_id]", "lazy": "select"}
    )
    audit_logs: list["DealAuditLog"] = Relationship(
        back_populates="deal", cascade_delete=True
    )


class DealPublic(DealBase):
    id: uuid.UUID
    deal_number: int | None = None
    bd_owner_id: uuid.UUID | None = None
    bd_owner_name: str | None = None
    created_by_id: uuid.UUID
    days_in_stage: int = 0
    stage_changed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    # Enriched from Project relationship
    project_name: str | None = None
    project_number: int | None = None
    owner_id: uuid.UUID | None = None   # from project.owner_id for navigation


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


# ─────────────────────────────────────────────────────────────────────────────
# OWNER CRM — Enums
# ─────────────────────────────────────────────────────────────────────────────

class OwnerType(str, Enum):
    DEVELOPER = "Developer"
    FAMILY_OFFICE = "Family Office"
    REIT = "REIT"
    ASSET_OWNER = "Asset Owner"
    INSTITUTIONAL = "Institutional Investor"

class OwnerRelationship(str, Enum):
    NEW = "New"
    WARM = "Warm"
    STRONG = "Strong"
    STRATEGIC = "Strategic Partner"
    AT_RISK = "Risk / Unstable"

class CatchupStatus(str, Enum):
    ON_TRACK = "On track"
    DUE_THIS_WEEK = "Due this week"
    OVERDUE = "Overdue"
    NO_CADENCE = "No cadence"

class ContactStrength(str, Enum):
    NEW = "New"
    WARM = "Warm"
    STRONG = "Strong"

class OwnerPriority(str, Enum):
    STRATEGIC = "Strategic"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


# ─────────────────────────────────────────────────────────────────────────────
# OWNER — Models
# ─────────────────────────────────────────────────────────────────────────────

class OwnerBase(_EnumAsStr):
    company: str = Field(min_length=1, max_length=255)
    owner_type: OwnerType = Field(default=OwnerType.DEVELOPER, sa_type=String(50))
    country: str = Field(max_length=100)
    priority: OwnerPriority = Field(default=OwnerPriority.MEDIUM, sa_type=String(20))
    relationship: OwnerRelationship = Field(default=OwnerRelationship.NEW, sa_type=String(30))
    catchup_status: CatchupStatus = Field(default=CatchupStatus.NO_CADENCE, sa_type=String(30))
    next_catchup: str | None = Field(default=None, max_length=20)   # "2026-06-15"
    assets: str | None = Field(default=None, max_length=500)
    financial_health: str | None = Field(default=None, max_length=20)  # Strong/Moderate/Unknown
    strategic_value: str | None = Field(default=None, max_length=1000)


class OwnerCreate(OwnerBase):
    pass


class OwnerUpdate(SQLModel):
    company: str | None = Field(default=None, min_length=1, max_length=255)
    owner_type: OwnerType | None = None
    country: str | None = Field(default=None, max_length=100)
    priority: OwnerPriority | None = None
    relationship: OwnerRelationship | None = None
    catchup_status: CatchupStatus | None = None
    next_catchup: str | None = Field(default=None, max_length=20)
    assets: str | None = Field(default=None, max_length=500)
    financial_health: str | None = Field(default=None, max_length=20)
    strategic_value: str | None = Field(default=None, max_length=1000)


class Owner(OwnerBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    contacts: list["OwnerContact"] = Relationship(
        back_populates="owner", cascade_delete=True
    )
    interactions: list["OwnerInteraction"] = Relationship(
        back_populates="owner", cascade_delete=True
    )


class OwnerPublic(OwnerBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    deal_count: int = 0
    project_count: int = 0
    last_interaction: str | None = None


class OwnersPublic(SQLModel):
    data: list[OwnerPublic]
    count: int


# ─────────────────────────────────────────────────────────────────────────────
# OWNER CONTACT — who from Fusion connects with whom on owner side
# ─────────────────────────────────────────────────────────────────────────────

class OwnerContactBase(_EnumAsStr):
    fusion_role: str = Field(max_length=100)   # "CEO", "BD Director VN"
    owner_contact: str = Field(max_length=100)  # "Owner Chairman"
    contact_title: str | None = Field(default=None, max_length=100)  # "Chairman", "CFO"
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    seniority: str | None = Field(default=None, max_length=20)  # "C-Suite", "Senior", "Mid"
    strength: ContactStrength = Field(default=ContactStrength.NEW, sa_type=String(20))
    last_met: str | None = Field(default=None, max_length=20)
    senior_flag: bool = Field(default=False)
    note: str | None = Field(default=None, max_length=500)


class OwnerContactCreate(OwnerContactBase):
    owner_id: uuid.UUID


class OwnerContact(OwnerContactBase, table=True):
    __tablename__ = "owner_contact"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="owner.id", ondelete="CASCADE")
    owner: Optional["Owner"] = Relationship(back_populates="contacts")


class OwnerContactPublic(OwnerContactBase):
    id: uuid.UUID
    owner_id: uuid.UUID


# ─────────────────────────────────────────────────────────────────────────────
# OWNER INTERACTION — meeting, dinner, site visit, etc.
# ─────────────────────────────────────────────────────────────────────────────

class InteractionType(str, Enum):
    MEETING = "Meeting"
    DINNER = "Dinner"
    SITE_VISIT = "Site visit"
    PHONE_CALL = "Phone call"
    WHATSAPP = "WhatsApp summary"
    PROPOSAL_SENT = "Proposal sent"
    NDA_SIGNED = "NDA signed"
    OTHER = "Other"


class OwnerInteractionBase(_EnumAsStr):
    interaction_type: InteractionType = Field(
        default=InteractionType.MEETING, sa_type=String(30)
    )
    date: str = Field(max_length=20)    # "2026-05-10"
    note: str | None = Field(default=None, max_length=1000)


class OwnerInteractionCreate(OwnerInteractionBase):
    owner_id: uuid.UUID


class OwnerInteraction(OwnerInteractionBase, table=True):
    __tablename__ = "owner_interaction"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="owner.id", ondelete="CASCADE")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    owner: Optional["Owner"] = Relationship(back_populates="interactions")


class OwnerInteractionPublic(OwnerInteractionBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


# ─────────────────────────────────────────────────────────────────────────────
# TASKS & ACTIVITIES
# ─────────────────────────────────────────────────────────────────────────────

class TaskStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    BLOCKED = "Blocked"
    DONE = "Done"


class TaskPriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class ActivityType(str, Enum):
    MEETING = "Meeting"
    DINNER = "Dinner"
    SITE_VISIT = "Site visit"
    PHONE_CALL = "Phone call"
    WHATSAPP = "WhatsApp summary"
    PROPOSAL_SENT = "Proposal sent"
    NDA_SIGNED = "NDA signed"
    LOI_SIGNED = "LOI signed"
    HMA_SIGNED = "HMA signed"
    PRE_OPENING_REVIEW = "Pre-opening review"
    OTHER = "Other"


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskBase(_EnumAsStr):
    title: str = Field(min_length=1, max_length=500)
    deal_id: uuid.UUID | None = Field(default=None)
    deal_name: str | None = Field(default=None, max_length=255)   # denormalized for display
    task_owner_id: uuid.UUID | None = Field(default=None)         # PRIMARY: link to User
    task_owner: str | None = Field(default=None, max_length=100)  # fallback/legacy free text
    due_date: str | None = Field(default=None, max_length=20)     # "2026-06-15"
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, sa_type=String(20))
    status: TaskStatus = Field(default=TaskStatus.OPEN, sa_type=String(20))
    note: str | None = Field(default=None, max_length=1000)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    deal_id: uuid.UUID | None = None
    deal_name: str | None = Field(default=None, max_length=255)
    task_owner_id: uuid.UUID | None = None
    task_owner: str | None = Field(default=None, max_length=100)
    due_date: str | None = Field(default=None, max_length=20)
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    note: str | None = Field(default=None, max_length=1000)


class Task(TaskBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )


class TaskPublic(TaskBase):
    id: uuid.UUID
    created_by_id: uuid.UUID
    is_overdue: bool = False
    # Enriched from User relationship
    task_owner_name: str | None = None
    task_owner_role: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TasksPublic(SQLModel):
    data: list[TaskPublic]
    count: int


# ── Activity ──────────────────────────────────────────────────────────────────

class ActivityBase(_EnumAsStr):
    activity_type: ActivityType = Field(
        default=ActivityType.MEETING, sa_type=String(30)
    )
    date: str = Field(max_length=20)          # "2026-06-03"
    deal_id: uuid.UUID | None = Field(default=None)
    deal_name: str | None = Field(default=None, max_length=255)
    note: str | None = Field(default=None, max_length=1000)


class ActivityCreate(ActivityBase):
    pass


class Activity(ActivityBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )


class ActivityPublic(ActivityBase):
    id: uuid.UUID
    created_by_id: uuid.UUID
    created_at: datetime | None = None


class ActivitiesPublic(SQLModel):
    data: list[ActivityPublic]
    count: int


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS
# ─────────────────────────────────────────────────────────────────────────────

class DocPermission(str, Enum):
    INTERNAL = "Internal Only"
    SHARED = "Shared with Owner"
    RESTRICTED = "Restricted"


class DocType(str, Enum):
    NDA = "NDA"
    PROPOSAL = "Proposal"
    FEASIBILITY = "Feasibility"
    HMA = "HMA Draft"
    CONTRACT = "Contract"
    TECHNICAL = "Technical Drawings"
    LEGAL = "Legal Document"
    PRESENTATION = "Presentation"
    OTHER = "Other"


class DocumentBase(_EnumAsStr):
    name: str = Field(min_length=1, max_length=255)
    doc_type: DocType = Field(default=DocType.OTHER, sa_type=String(30))
    permission: DocPermission = Field(default=DocPermission.INTERNAL, sa_type=String(30))
    # Polymorphic context — link to Deal OR Project (not both required)
    deal_id: uuid.UUID | None = Field(default=None)
    deal_name: str | None = Field(default=None, max_length=255)
    project_id: uuid.UUID | None = Field(default=None)
    project_name: str | None = Field(default=None, max_length=255)
    version: str | None = Field(default="v1.0", max_length=20)
    note: str | None = Field(default=None, max_length=500)
    is_confidential: bool = Field(default=False)


class Document(DocumentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    original_filename: str = Field(max_length=255)
    file_size: int = Field(default=0)          # bytes
    content_type: str = Field(default="application/octet-stream", max_length=100)
    storage_path: str = Field(max_length=500)  # MinIO key or local path
    uploaded_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    uploaded_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )


class DocumentPublic(DocumentBase):
    id: uuid.UUID
    original_filename: str
    file_size: int
    content_type: str
    uploaded_by_id: uuid.UUID
    uploaded_at: datetime | None = None
    download_url: str | None = None
    can_view: bool = True   # computed based on role + confidential flag


class DocumentsPublic(SQLModel):
    data: list[DocumentPublic]
    count: int


# ─────────────────────────────────────────────────────────────────────────────
# FEASIBILITY SNAPSHOTS
# ─────────────────────────────────────────────────────────────────────────────

class FeasibilitySnapshot(SQLModel, table=True):
    __tablename__ = "feasibility_snapshot"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    deal_id: uuid.UUID | None = Field(default=None)
    deal_name: str | None = Field(default=None, max_length=255)
    label: str | None = Field(default=None, max_length=100)  # e.g. "Base case", "Optimistic"
    # Store assumptions + outputs as JSON strings
    assumptions: str = Field(max_length=2000)   # JSON
    outputs: str = Field(max_length=2000)        # JSON
    created_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )


class FeasibilitySnapshotCreate(SQLModel):
    deal_id: uuid.UUID | None = None
    deal_name: str | None = None
    label: str | None = None
    assumptions: str
    outputs: str


class FeasibilitySnapshotPublic(SQLModel):
    id: uuid.UUID
    deal_id: uuid.UUID | None
    deal_name: str | None
    label: str | None
    assumptions: str
    outputs: str
    created_by_id: uuid.UUID
    created_at: datetime | None


# ─────────────────────────────────────────────────────────────────────────────
# PRE-OPENING TRACKER
# ─────────────────────────────────────────────────────────────────────────────

class MilestoneGate(str, Enum):
    GREEN = "Green"
    AMBER = "Amber"
    RED = "Red"


class MilestoneDept(str, Enum):
    OPS = "Ops"
    IT = "IT"
    FINANCE = "Finance"
    DESIGN = "Design"
    LEGAL = "Legal"
    PROCUREMENT = "Procurement"
    HR = "HR"
    MARKETING = "Marketing"


class MilestoneBase(_EnumAsStr):
    name: str = Field(min_length=1, max_length=255)
    project_id: uuid.UUID | None = Field(default=None)        # PRIMARY link
    project_name: str | None = Field(default=None, max_length=255)
    deal_id: uuid.UUID | None = Field(default=None)            # legacy/optional
    deal_name: str | None = Field(default=None, max_length=255)
    department: MilestoneDept = Field(default=MilestoneDept.OPS, sa_type=String(30))
    milestone_owner: str | None = Field(default=None, max_length=100)
    due_date: str | None = Field(default=None, max_length=20)
    status: MilestoneGate = Field(default=MilestoneGate.GREEN, sa_type=String(10))
    blocker: str | None = Field(default=None, max_length=500)


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    project_id: uuid.UUID | None = None
    project_name: str | None = Field(default=None, max_length=255)
    deal_id: uuid.UUID | None = None
    deal_name: str | None = Field(default=None, max_length=255)
    department: MilestoneDept | None = None
    milestone_owner: str | None = Field(default=None, max_length=100)
    due_date: str | None = Field(default=None, max_length=20)
    status: MilestoneGate | None = None
    blocker: str | None = Field(default=None, max_length=500)


class Milestone(MilestoneBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )


class MilestonePublic(MilestoneBase):
    id: uuid.UUID
    created_by_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MilestonesPublic(SQLModel):
    data: list[MilestonePublic]
    count: int


# ─────────────────────────────────────────────────────────────────────────────
# MASTER DATA / SETTINGS — configurable lookup values
# ─────────────────────────────────────────────────────────────────────────────

class MasterDataCategory(str, Enum):
    DEAL_STAGE = "deal_stage"
    DEAL_RISK = "deal_risk"
    FEASIBILITY_STATUS = "feasibility_status"
    PROJECT_TYPE = "project_type"
    REGION = "region"
    BRAND = "brand"
    OWNER_TYPE = "owner_type"
    OWNER_RELATIONSHIP = "owner_relationship"
    CATCHUP_STATUS = "catchup_status"
    CONTACT_STRENGTH = "contact_strength"
    INTERACTION_TYPE = "interaction_type"
    TASK_STATUS = "task_status"
    TASK_PRIORITY = "task_priority"
    ACTIVITY_TYPE = "activity_type"
    DOC_TYPE = "doc_type"
    DOC_PERMISSION = "doc_permission"
    MILESTONE_DEPT = "milestone_dept"
    MILESTONE_GATE = "milestone_gate"
    OPENING_TARGET = "opening_target"


class MasterData(SQLModel, table=True):
    __tablename__ = "master_data"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category: str = Field(max_length=50, index=True)  # e.g. "brand", "deal_stage"
    value: str = Field(max_length=255)                 # e.g. "Fusion Resort"
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class MasterDataCreate(SQLModel):
    category: str
    value: str
    sort_order: int = 0


class MasterDataPublic(SQLModel):
    id: uuid.UUID
    category: str
    value: str
    sort_order: int
    is_active: bool


# ─────────────────────────────────────────────────────────────────────────────
# PROJECT — Hotel asset / development opportunity
# (Sits between Owner and Deals: 1 Owner → N Projects → N Deals)
# ─────────────────────────────────────────────────────────────────────────────

class ProjectStatus(str, Enum):
    PROSPECT = "Prospect"
    ACTIVE = "Active"
    ON_HOLD = "On Hold"
    OPERATING = "Operating"
    LOST = "Lost"
    CLOSED = "Closed"


class ProjectBase(_EnumAsStr):
    name: str = Field(min_length=1, max_length=255)
    owner_id: uuid.UUID | None = Field(default=None, foreign_key="owner.id", ondelete="SET NULL")
    # Location
    country: str = Field(max_length=100)
    region: APACRegion | None = Field(default=None, sa_type=String(50))
    city: str | None = Field(default=None, max_length=100)
    location_detail: str | None = Field(default=None, max_length=500)  # Free text address
    google_maps_url: str | None = Field(default=None, max_length=500)
    # Physical
    project_type: ProjectType | None = Field(default=None, sa_type=String(80))
    segment: str | None = Field(default=None, max_length=50)            # Luxury, Upscale, Midscale...
    keys: int | None = Field(default=None, ge=0)
    room_mix: str | None = Field(default=None, max_length=500)          # e.g. "180 rooms + 40 suites"
    facilities: str | None = Field(default=None, max_length=1000)       # F&B, spa, ballroom...
    # Status pillars
    status: ProjectStatus = Field(default=ProjectStatus.PROSPECT, sa_type=String(20))
    construction_status: str | None = Field(default=None, max_length=50)
    design_status: str | None = Field(default=None, max_length=50)
    legal_status: str | None = Field(default=None, max_length=50)
    funding_status: str | None = Field(default=None, max_length=50)
    # Timing
    opening_target: str | None = Field(default=None, max_length=20)
    # Notes
    description: str | None = Field(default=None, max_length=2000)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    owner_id: uuid.UUID | None = None
    country: str | None = Field(default=None, max_length=100)
    region: APACRegion | None = None
    city: str | None = Field(default=None, max_length=100)
    location_detail: str | None = Field(default=None, max_length=500)
    google_maps_url: str | None = Field(default=None, max_length=500)
    project_type: ProjectType | None = None
    segment: str | None = Field(default=None, max_length=50)
    keys: int | None = Field(default=None, ge=0)
    room_mix: str | None = Field(default=None, max_length=500)
    facilities: str | None = Field(default=None, max_length=1000)
    status: ProjectStatus | None = None
    construction_status: str | None = Field(default=None, max_length=50)
    design_status: str | None = Field(default=None, max_length=50)
    legal_status: str | None = Field(default=None, max_length=50)
    funding_status: str | None = Field(default=None, max_length=50)
    opening_target: str | None = Field(default=None, max_length=20)
    description: str | None = Field(default=None, max_length=2000)


class Project(ProjectBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_number: int | None = Field(default=None, index=True)  # FUS-P-00001
    created_by_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc, sa_type=DateTime(timezone=True)
    )

    owner: Optional["Owner"] = Relationship(
        sa_relationship_kwargs={"lazy": "select"}
    )


class ProjectPublic(ProjectBase):
    id: uuid.UUID
    project_number: int | None
    owner_name: str | None = None
    deal_count: int = 0
    active_pipeline_value: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectsPublic(SQLModel):
    data: list[ProjectPublic]
    count: int
