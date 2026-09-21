#!/usr/bin/env python3
"""Makster Creative Studio Local Render Agent — localhost only, zero external spend."""
import json, subprocess, threading
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RENDERER=ROOT/"assembly"/"render_p01.py"
MEDIA=ROOT/"local-media"
JOBS=ROOT/"local-render-jobs"
JOBS.mkdir(exist_ok=True); MEDIA.mkdir(exist_ok=True)
jobs={}
def cors(h): h.send_header("Access-Control-Allow-Origin","*");h.send_header("Access-Control-Allow-Headers","Content-Type");h.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
def run_job(jid,handoff):
    jobs[jid]={"status":"RENDERING","progress":15}
    hp=JOBS/f"{jid}.json";hp.write_text(json.dumps(handoff,indent=2),encoding="utf-8")
    out=JOBS/handoff["output"]["file"]
    try:
        p=subprocess.run(["python",str(RENDERER),str(hp),str(MEDIA),str(out)],capture_output=True,text=True)
        if p.returncode: raise RuntimeError((p.stderr or p.stdout).strip())
        qa=json.loads(out.with_suffix(".qa.json").read_text(encoding="utf-8"))
        jobs[jid]={"status":"MASTER_READY" if qa["status"]=="PASS" else "QA_FAILED","progress":100,"qa":qa,"output":str(out)}
    except Exception as e: jobs[jid]={"status":"QA_FAILED","progress":100,"error":str(e)}
class H(BaseHTTPRequestHandler):
    def reply(self,code,obj):
        b=json.dumps(obj).encode();self.send_response(code);cors(self);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(b)));self.end_headers();self.wfile.write(b)
    def do_OPTIONS(self): self.send_response(204);cors(self);self.end_headers()
    def do_GET(self):
        if self.path=="/health": return self.reply(200,{"ok":True,"service":"Makster Local Render Agent","spend":0})
        if self.path.startswith("/jobs/"): return self.reply(200,jobs.get(self.path.split("/")[-1],{"status":"UNKNOWN"}))
        self.reply(404,{"error":"not found"})
    def do_POST(self):
        parsed=urlparse(self.path)
        if parsed.path=="/media":
            name=Path(parse_qs(parsed.query).get("name",[""])[0]).name
            if not name:return self.reply(400,{"error":"media name required"})
            n=int(self.headers.get("Content-Length","0"))
            if n<=0:return self.reply(400,{"error":"empty media"})
            target=MEDIA/name;target.write_bytes(self.rfile.read(n))
            return self.reply(201,{"ok":True,"name":name,"bytes":n})
        if parsed.path!="/render": return self.reply(404,{"error":"not found"})
        n=int(self.headers.get("Content-Length","0"));spec=json.loads(self.rfile.read(n) or b"{}")
        if spec.get("rules",{}).get("externalProviders") is not False:return self.reply(400,{"error":"externalProviders must be false"})
        jid="P01-"+str(len(jobs)+1);jobs[jid]={"status":"QUEUED","progress":0};threading.Thread(target=run_job,args=(jid,spec),daemon=True).start();self.reply(202,{"jobId":jid,"status":"QUEUED"})
if __name__=="__main__":
    print("Makster Local Render Agent: http://127.0.0.1:8765")
    ThreadingHTTPServer(("127.0.0.1",8765),H).serve_forever()
