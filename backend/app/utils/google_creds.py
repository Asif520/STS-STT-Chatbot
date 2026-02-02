import os
import base64

def load_google_credentials():
    b64 = os.getenv("GOOGLE_SERVICE_ACCOUNT")
    if not b64:
        raise RuntimeError("Missing GOOGLE_SERVICE_ACCOUNT")

    path = "/tmp/service_account.json"
    with open(path, "wb") as f:
        f.write(base64.b64decode(b64))

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = path
