"""Streamlit Cloud 엔트리 — `blogkey-adm.streamlit.app` (★ Streamlit 이 "admin" 단어를 reserved 처리해서 -adm 으로 truncate).

Streamlit Cloud 새 앱 설정에서 main file path 를 이 파일(`admin_app.py`)로 지정.
"""

from src.admin.app import main


if __name__ == "__main__":
    main()
