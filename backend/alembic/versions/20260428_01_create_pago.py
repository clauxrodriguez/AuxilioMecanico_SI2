"""Create pago table

Revision ID: 20260428_01_create_pago
Revises: 20260425_04
Create Date: 2026-04-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260428_01_create_pago"
down_revision: Union[str, None] = "20260425_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pago",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("asignacion_id", sa.String(length=36), nullable=False),
        sa.Column("incidente_id", sa.String(length=36), nullable=True),
        sa.Column("cliente_id", sa.String(length=36), nullable=True),
        sa.Column("empresa_id", sa.String(length=36), nullable=True),
        sa.Column("monto_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("metodo_pago", sa.String(length=30), nullable=False),
        sa.Column("estado", sa.String(length=30), nullable=False, server_default="pendiente"),
        sa.Column("comision_plataforma", sa.Numeric(12, 2), nullable=True),
        sa.Column("monto_taller", sa.Numeric(12, 2), nullable=True),
        sa.Column("fecha_creacion", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("fecha_confirmacion", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["asignacion_id"], ["asignacion_servicio.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["incidente_id"], ["incidente.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["cliente_id"], ["cliente.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresa.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("pago")
