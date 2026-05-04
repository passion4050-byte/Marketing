"""Streamlit Cloud 엔트리 — `blogkey-admin.streamlit.app`.

Streamlit Cloud 새 앱 설정에서 main file path 를 이 파일(`admin_app.py`)로 지정.
"""

from src.admin.app import main


if __name__ == "__main__":
    main()
