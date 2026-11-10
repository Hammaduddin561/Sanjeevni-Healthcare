import sys
import os

# Add root to path
sys.path.append(os.getcwd())

try:
    from backend.models.risk_engine import RiskEngine
    print("Import successful")
    engine = RiskEngine()
    print("Initialization successful")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
