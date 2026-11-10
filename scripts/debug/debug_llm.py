
import sys
import os

print(f"Python: {sys.version}")

try:
    import pydantic
    print(f"Pydantic version: {pydantic.VERSION}")
except ImportError:
    print("Pydantic not installed")

try:
    from pydantic import BaseModel
    class Test(BaseModel):
        foo: str
    t = Test(foo="bar")
    try:
        print(f"Test dict(): {t.dict()}")
    except Exception as e:
        print(f"t.dict() failed: {e}")
    
    try:
        print(f"Test model_dump(): {t.model_dump()}")
    except Exception as e:
        print(f"t.model_dump() failed: {e}")

except Exception as e:
    print(f"Pydantic test failed: {e}")


try:
    import gpt4all
    print(f"GPT4All version: {gpt4all.__version__ if hasattr(gpt4all, '__version__') else 'unknown'}")
    from gpt4all import GPT4All
    print("GPT4All class imported successfully")
except ImportError as e:
    print(f"GPT4All import failed: {e}")
except Exception as e:
    print(f"GPT4All other error: {e}")

