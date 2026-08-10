"""onboarding state columns + nullable primary_domain

Revision ID: b7c1a9d2e4f8
Revises: f52ef683fdf4
Create Date: 2026-08-01

Adds server-owned onboarding state so the wizard can resume and the dashboard
can be gated, and relaxes primary_domain to nullable (it is now set during
onboarding, not invented at provisioning time).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b7c1a9d2e4f8"
down_revision: Union[str, None] = "f52ef683fdf4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "onboarding_step",
            sa.String(),
            nullable=False,
            server_default="business",
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "onboarding_data",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "domain_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("onboarding_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Backward-compat: every org that already exists (all had a non-null
    # primary_domain under the old NOT NULL constraint) predates this feature —
    # grandfather it as completed so existing users are NOT forced through
    # onboarding. New orgs are provisioned with primary_domain NULL and start
    # onboarding normally.
    op.execute(
        "UPDATE organizations SET onboarding_completed = true, "
        "onboarding_step = 'done', domain_verified = true "
        "WHERE primary_domain IS NOT NULL"
    )
    op.alter_column(
        "organizations",
        "primary_domain",
        existing_type=sa.String(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "organizations",
        "primary_domain",
        existing_type=sa.String(),
        nullable=False,
    )
    op.drop_column("organizations", "onboarding_updated_at")
    op.drop_column("organizations", "domain_verified")
    op.drop_column("organizations", "onboarding_data")
    op.drop_column("organizations", "onboarding_step")
    op.drop_column("organizations", "onboarding_completed")
