"""Drop titulo from incidente

Revision ID: 20260425_03
Revises: 20260425_02
Create Date: 2026-04-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260425_03"
down_revision: Union[str, None] = "20260425_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "incidente" not in set(inspector.get_table_names()):
        return

    cols = {c["name"] for c in inspector.get_columns("incidente")}
    if "titulo" in cols:
        op.drop_column("incidente", "titulo")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "incidente" not in set(inspector.get_table_names()):
        return

    cols = {c["name"] for c in inspector.get_columns("incidente")}
    if "titulo" not in cols:
        op.add_column("incidente", sa.Column("titulo", sa.String(length=150), nullable=True))
