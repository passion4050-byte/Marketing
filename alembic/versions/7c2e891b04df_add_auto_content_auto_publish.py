"""add_auto_content_auto_publish

자동 발행 토글 — auto_content_settings.auto_publish (default false).
의료법 통과 콘텐츠를 draft 단계 건너뛰고 즉시 published 로 저장하는 옵션.

Revision ID: 7c2e891b04df
Revises: 6f1721ad08cd
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7c2e891b04df'
down_revision: Union[str, Sequence[str], None] = '6f1721ad08cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('auto_content_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column(
            'auto_publish',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ))


def downgrade() -> None:
    with op.batch_alter_table('auto_content_settings', schema=None) as batch_op:
        batch_op.drop_column('auto_publish')
