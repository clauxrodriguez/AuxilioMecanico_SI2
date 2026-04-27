"""Add cliente credentials and vehiculo principal flag

Revision ID: 20260424_01
Revises: 20260423_01
Create Date: 2026-04-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260424_01"
down_revision: Union[str, None] = "20260423_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cliente", sa.Column("usuario_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_cliente_usuario_id", "cliente", ["usuario_id"])
    op.create_foreign_key(
        "fk_cliente_usuario_id_auth_user",
        "cliente",
        "auth_user",
        ["usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "vehiculo",
        sa.Column("principal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("vehiculo", "principal")
    op.drop_constraint("fk_cliente_usuario_id_auth_user", "cliente", type_="foreignkey")
    op.drop_constraint("uq_cliente_usuario_id", "cliente", type_="unique")
    op.drop_column("cliente", "usuario_id")
