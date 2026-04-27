"""Sync cliente.usuario_id relation

Revision ID: 20260424_02
Revises: 20260424_01
Create Date: 2026-04-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260424_02"
down_revision: Union[str, None] = "20260424_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cliente_columns = {column["name"] for column in inspector.get_columns("cliente")}

    if "usuario_id" not in cliente_columns:
        op.add_column("cliente", sa.Column("usuario_id", sa.Integer(), nullable=True))

    foreign_keys = {fk["name"] for fk in inspector.get_foreign_keys("cliente")}
    if "fk_cliente_usuario_id_auth_user" not in foreign_keys:
        op.create_foreign_key(
            "fk_cliente_usuario_id_auth_user",
            "cliente",
            "auth_user",
            ["usuario_id"],
            ["id"],
            ondelete="SET NULL",
        )

    unique_constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("cliente")}
    if "uq_cliente_usuario_id" not in unique_constraints:
        op.create_unique_constraint("uq_cliente_usuario_id", "cliente", ["usuario_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    foreign_keys = {fk["name"] for fk in inspector.get_foreign_keys("cliente")}
    if "fk_cliente_usuario_id_auth_user" in foreign_keys:
        op.drop_constraint("fk_cliente_usuario_id_auth_user", "cliente", type_="foreignkey")

    unique_constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("cliente")}
    if "uq_cliente_usuario_id" in unique_constraints:
        op.drop_constraint("uq_cliente_usuario_id", "cliente", type_="unique")

    cliente_columns = {column["name"] for column in inspector.get_columns("cliente")}
    if "usuario_id" in cliente_columns:
        op.drop_column("cliente", "usuario_id")