"""Add Cliente and Vehiculo tables

Revision ID: 20260423_01
Revises: 20260422_01
Create Date: 2026-04-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260423_01"
down_revision: Union[str, None] = "20260422_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cliente",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.Column("telefono", sa.String(length=20), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "vehiculo",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("cliente_id", sa.String(length=36), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=True),
        sa.Column("placa", sa.String(length=20), nullable=True),
        sa.Column("marca", sa.String(length=50), nullable=True),
        sa.Column("modelo", sa.String(length=50), nullable=True),
    
        sa.ForeignKeyConstraint(["cliente_id"], ["cliente.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("vehiculo")
    op.drop_table("cliente")
