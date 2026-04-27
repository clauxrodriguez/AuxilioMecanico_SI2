"""Remove legacy assignment columns from incidente

Revision ID: 20260425_01
Revises: 20260424_04
Create Date: 2026-04-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260425_01"
down_revision: Union[str, None] = "20260424_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "incidente" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("incidente")}

    # Drop foreign key to empleado for empleado_asignado_id if exists
    if "empleado_asignado_id" in cols:
        # find fk name
        for fk in inspector.get_foreign_keys("incidente"):
            if fk.get("referred_table") == "empleado" and fk.get("constrained_columns") == ["empleado_asignado_id"]:
                try:
                    op.drop_constraint(fk.get("name"), "incidente", type_="foreignkey")
                except Exception:
                    pass
                break

    # Drop foreign key to empresa for taller_id if exists
    if "taller_id" in cols:
        for fk in inspector.get_foreign_keys("incidente"):
            if fk.get("referred_table") == "empresa" and fk.get("constrained_columns") == ["taller_id"]:
                try:
                    op.drop_constraint(fk.get("name"), "incidente", type_="foreignkey")
                except Exception:
                    pass
                break

    # Now drop the columns if present
    if "empleado_asignado_id" in cols:
        op.drop_column("incidente", "empleado_asignado_id")
    if "taller_id" in cols:
        op.drop_column("incidente", "taller_id")
    if "tiempo_estimado_minutos" in cols:
        op.drop_column("incidente", "tiempo_estimado_minutos")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "incidente" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("incidente")}
    if "empleado_asignado_id" not in cols:
        op.add_column("incidente", sa.Column("empleado_asignado_id", sa.String(length=36), nullable=True))
        op.create_foreign_key("fk_incidente_empleado", "incidente", "empleado", ["empleado_asignado_id"], ["id"], ondelete="SET NULL")
    if "taller_id" not in cols:
        op.add_column("incidente", sa.Column("taller_id", sa.String(length=36), nullable=True))
        # recreate fk to empresa
        op.create_foreign_key("fk_incidente_taller_empresa", "incidente", "empresa", ["taller_id"], ["id"], ondelete="SET NULL")
    if "tiempo_estimado_minutos" not in cols:
        op.add_column("incidente", sa.Column("tiempo_estimado_minutos", sa.Integer(), nullable=True))
