import os
import subprocess
import sys
import pytest


def test_secret_key_missing_fails_when_app_env_unset():
    env = os.environ.copy()
    env.pop("SECRET_KEY", None)
    env.pop("APP_ENV", None)
    env.pop("ENV", None)

    proc = subprocess.run(
        [sys.executable, "-c", "import backend.auth"],
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode != 0
    assert "SECRET_KEY" in proc.stderr


def test_secret_key_missing_fails_in_production_and_staging():
    for app_env in ["production", "staging", "prod"]:
        env = os.environ.copy()
        env.pop("SECRET_KEY", None)
        env["APP_ENV"] = app_env

        proc = subprocess.run(
            [sys.executable, "-c", "import backend.auth"],
            env=env,
            capture_output=True,
            text=True,
        )
        assert proc.returncode != 0
        assert "SECRET_KEY" in proc.stderr


def test_secret_key_missing_succeeds_only_in_explicit_development():
    env = os.environ.copy()
    env.pop("SECRET_KEY", None)
    env["APP_ENV"] = "development"

    proc = subprocess.run(
        [sys.executable, "-c", "import backend.auth; assert backend.auth.SECRET_KEY"],
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0


def test_seed_script_requires_passwords_outside_development():
    env = os.environ.copy()
    env["APP_ENV"] = "production"
    env["SECRET_KEY"] = "test-prod-secret"
    for k in ["SEED_WORKER_PASSWORD", "SEED_DOCTOR_PASSWORD", "SEED_ADMIN_PASSWORD"]:
        env.pop(k, None)

    proc = subprocess.run(
        [sys.executable, "scripts/seed_users.py"],
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode != 0
    assert "SEED_WORKER_PASSWORD" in proc.stderr
