import os
import sys
import subprocess
from pathlib import Path

def main():
    base_dir = Path(__file__).resolve().parent
    frontend_dist = base_dir / "frontend" / "dist"
    
    print("=" * 65)
    print("             DataPilot AI - Autonomous AI Data Analyst")
    print("=" * 65)
    
    # Check if frontend is built
    if not frontend_dist.exists() or not (frontend_dist / "index.html").exists():
        print("[*] Building frontend assets (first-time build)...")
        try:
            subprocess.run(["npm", "run", "build"], cwd=base_dir / "frontend", check=True, shell=True)
            print("[+] Frontend build successful!")
        except Exception as e:
            print(f"[!] Warning: Frontend build failed ({e}). Proceeding to launch API backend.")

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    print(f"\n[+] DataPilot AI server launching on:")
    print(f"    --> Local Web App:   http://localhost:{port}")
    print(f"    --> API Docs (Docs): http://localhost:{port}/docs")
    print(f"    --> Health Status:   http://localhost:{port}/api/health")
    print("=" * 65)
    print("Press Ctrl+C to shut down.\n")

    import uvicorn
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
