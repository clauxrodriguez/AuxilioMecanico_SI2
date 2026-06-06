"""Add incidente estado enum and accepted_empresa_id

Revision ID: 20260606_04_add_incidente_estado
Revises: 20260606_01_add_empresa_ratings
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa

revision = "20260606_04_add_incidente_estado"
down_revision = "20260606_01_add_empresa_ratings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # create enum type
    op.execute("CREATE TYPE incidente_estado AS ENUM ('pendiente','aceptada','asignada','en_proceso','completada')")
    # alter column tipo for incidente.estado
    op.add_column('incidente', sa.Column('estado', sa.Enum('pendiente','aceptada','asignada','en_proceso','completada', name='incidente_estado'), nullable=False, server_default='pendiente'))
    # migrate existing string column if present
    try:
        op.execute("ALTER TABLE incidente ALTER COLUMN estado TYPE incidente_estado USING estado::incidente_estado")
    except Exception:
        # if column already created above, pass
        pass

    # add accepted_empresa_id column
    op.add_column('incidente', sa.Column('accepted_empresa_id', sa.String(length=36), nullable=True))
    op.create_foreign_key('fk_incidente_accepted_empresa', 'incidente', 'empresa', ['accepted_empresa_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_incidente_accepted_empresa', 'incidente', type_='foreignkey')
    op.drop_column('incidente', 'accepted_empresa_id')
    # revert estado column to text then drop enum type
    op.execute("ALTER TABLE incidente ALTER COLUMN estado TYPE VARCHAR")
    op.drop_column('incidente', 'estado')
    op.execute('DROP TYPE IF EXISTS incidente_estado')
