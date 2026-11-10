import traceback
import sys

# Redirect all output to file with UTF-8 encoding
with open("error_log.txt", "w", encoding="utf-8") as f:
    try:
        from backend.models.risk_engine import RiskEngine
        f.write("Importing RiskEngine...\n")
        f.flush()
        engine = RiskEngine()
        f.write("SUCCESS: Risk Engine loaded successfully!\n")
        print("SUCCESS: Risk Engine loaded successfully!")
    except Exception as e:
        f.write("ERROR loading Risk Engine:\n")
        f.write(f"Error type: {type(e).__name__}\n")
        f.write(f"Error message: {str(e)}\n")
        f.write("\nFull traceback:\n")
        traceback.print_exc(file=f)
        f.flush()
        print("ERROR occurred - check error_log.txt")
        sys.exit(1)
