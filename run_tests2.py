"""テスト実行スクリプト v2"""
import sys
import os

# Add the common directory to path
test_dir = os.path.join(os.path.dirname(__file__), "src", "common")
sys.path.insert(0, test_dir)

# Check python version and available packages
print(f"Python: {sys.version}", flush=True)
print(f"Working dir: {os.getcwd()}", flush=True)
print(f"Test dir: {test_dir}", flush=True)

try:
    import pytest
    print(f"pytest version: {pytest.__version__}", flush=True)
except ImportError as e:
    print(f"pytest not found: {e}", flush=True)
    sys.exit(1)

# Run tests
ret = pytest.main([
    os.path.join(test_dir, "geo_utils.test.py"),
    "-v",
    "--tb=short",
    "--no-header",
])
sys.exit(ret)
