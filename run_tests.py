"""テスト実行スクリプト"""
import subprocess
import sys
import os

test_dir = os.path.join(os.path.dirname(__file__), "src", "common")

result = subprocess.run(
    [sys.executable, "-m", "pytest", "geo_utils.test.py", "-v", "--tb=short"],
    cwd=test_dir,
    capture_output=False,
)
sys.exit(result.returncode)
