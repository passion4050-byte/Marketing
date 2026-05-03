"""GitHub Device Flow OAuth → private 리포 생성 → 첫 푸시까지 자동화.

사용:
    python tools/deploy_github.py

흐름:
1. GitHub Device Flow 시작 (gh CLI 의 공식 client_id 사용)
2. USER_CODE 와 URL 출력 — 사용자가 브라우저에 입력
3. 폴링 — 인증 완료까지 대기 (최대 15분)
4. private 리포 'Marketing' 생성 (이미 있으면 재사용)
5. master → main 리브랜드 후 첫 푸시
6. 보안: 푸시 직후 remote URL 에서 토큰 제거 (https://github.com/... 만 남김)
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

import httpx

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent

# gh CLI 의 공개 OAuth client_id — 어느 머신에서나 device flow 사용 가능 (시크릿 아님)
CLIENT_ID = "178c6fc778ccc68e1d6a"
REPO_NAME = "Marketing"


def init_device_flow() -> dict:
    r = httpx.post(
        "https://github.com/login/device/code",
        headers={"Accept": "application/json"},
        data={"client_id": CLIENT_ID, "scope": "repo read:org"},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def poll_for_token(device_code: str, interval: int = 5) -> str:
    deadline = time.time() + 900  # 15분
    while time.time() < deadline:
        r = httpx.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": CLIENT_ID,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
            timeout=15,
        )
        d = r.json()
        if "access_token" in d:
            return d["access_token"]
        err = d.get("error")
        if err == "authorization_pending":
            time.sleep(interval)
            continue
        if err == "slow_down":
            interval += 5
            time.sleep(interval)
            continue
        raise RuntimeError(f"Auth failed: {d}")
    raise TimeoutError("사용자가 15분 내에 인증을 완료하지 않음")


def get_username(token: str) -> str:
    r = httpx.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["login"]


def create_or_get_repo(token: str, username: str) -> str:
    # 이미 있으면 GET, 없으면 POST
    check = httpx.get(
        f"https://api.github.com/repos/{username}/{REPO_NAME}",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"},
        timeout=10,
    )
    if check.status_code == 200:
        return check.json()["html_url"]

    r = httpx.post(
        "https://api.github.com/user/repos",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"},
        json={
            "name": REPO_NAME,
            "private": True,
            "description": "GEO/AEO SaaS for medical marketing — 메디맵",
            "auto_init": False,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["html_url"]


def git(cmd: list[str], check: bool = True) -> tuple[int, str, str]:
    p = subprocess.run(
        ["git", *cmd],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if check and p.returncode != 0:
        raise RuntimeError(f"git {' '.join(cmd)} failed:\n{p.stdout}\n{p.stderr}")
    return p.returncode, p.stdout, p.stderr


def push_with_token(token: str, username: str) -> None:
    push_url = f"https://x-access-token:{token}@github.com/{username}/{REPO_NAME}.git"
    git(["remote", "remove", "origin"], check=False)
    git(["remote", "add", "origin", push_url])
    git(["branch", "-M", "main"])
    git(["push", "-u", "origin", "main"])
    # 토큰을 .git/config 에 남기지 않기
    safe_url = f"https://github.com/{username}/{REPO_NAME}.git"
    git(["remote", "set-url", "origin", safe_url])


def main() -> None:
    print("[1/4] GitHub Device Flow 시작...", flush=True)
    flow = init_device_flow()
    (ROOT / ".gh_device.json").write_text(json.dumps(flow, indent=2), encoding="utf-8")

    print("", flush=True)
    print("=" * 64, flush=True)
    print(f"  USER_CODE: {flow['user_code']}", flush=True)
    print(f"  URL:       {flow['verification_uri']}", flush=True)
    print("=" * 64, flush=True)
    print("", flush=True)
    print("[2/4] 인증 폴링 중 (최대 15분)... 브라우저에서 코드 입력 + Authorize.", flush=True)

    token = poll_for_token(flow["device_code"], flow.get("interval", 5))
    (ROOT / ".gh_token").write_text(token, encoding="utf-8")

    username = get_username(token)
    print(f"[3/4] 인증 완료. 사용자: {username}", flush=True)

    repo_url = create_or_get_repo(token, username)
    print(f"      리포: {repo_url}", flush=True)

    print("[4/4] master → main 리브랜드 + 푸시 중...", flush=True)
    push_with_token(token, username)

    print("", flush=True)
    print("=" * 64, flush=True)
    print(f"  ✅ 완료. {repo_url}", flush=True)
    print("=" * 64, flush=True)


if __name__ == "__main__":
    main()
