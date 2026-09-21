#!/usr/bin/env python3
"""Makster Creative Studio local renderer. Zero external-provider spend."""
import json, subprocess, sys, tempfile, shutil
from pathlib import Path

def run(cmd):
    subprocess.run(cmd, check=True)

def probe(path):
    p=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration:stream=codec_type,width,height,r_frame_rate","-of","json",str(path)],capture_output=True,text=True,check=True)
    return json.loads(p.stdout)

def post_render_qa(out, spec):
    q=probe(out); dur=float(q.get("format",{}).get("duration",0)); streams=q.get("streams",[])
    v=next((s for s in streams if s.get("codec_type")=="video"),{}); a=next((s for s in streams if s.get("codec_type")=="audio"),None)
    issues=[]
    if abs(dur-float(spec["output"]["durationSeconds"]))>0.5: issues.append("duration mismatch")
    if v.get("width")!=1920 or v.get("height")!=1080: issues.append("resolution mismatch")
    if not a: issues.append("audio stream missing")
    report={"status":"PASS" if not issues else "FAIL","file":out.name,"duration":dur,"width":v.get("width"),"height":v.get("height"),"fps":v.get("r_frame_rate"),"audio":bool(a),"issues":issues}
    out.with_suffix(".qa.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    return report

def main():
    if len(sys.argv)<3:
        raise SystemExit("usage: render_p01.py HANDOFF.json MEDIA_DIR [OUTPUT.mp4]")
    handoff=Path(sys.argv[1]); media=Path(sys.argv[2])
    spec=json.loads(handoff.read_text(encoding="utf-8"))
    if spec.get("rules",{}).get("externalProviders") is not False:
        raise SystemExit("refusing handoff without externalProviders=false")
    timeline=spec["timeline"]; out=Path(sys.argv[3]) if len(sys.argv)>3 else handoff.with_name(spec["output"]["file"])
    missing=[x["source"] for x in timeline if not (media/x["source"]).exists()]
    voices={x["voice"]["source"] for x in timeline if x.get("voice") and x["voice"].get("source")}
    missing += [v for v in voices if not (media/v).exists()]
    music=spec.get("audio",{}).get("music")
    if music and not (media/music).exists(): missing.append(music)
    if missing: raise SystemExit("missing media: "+", ".join(sorted(set(missing))))
    with tempfile.TemporaryDirectory(prefix="makster-p01-") as td:
        td=Path(td); clips=[]
        for i,x in enumerate(timeline):
            dst=td/f"{i:02d}.mp4"; src=media/x["source"]
            run(["ffmpeg","-y","-i",str(src),"-t",str(x["duration"]),"-vf","scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30","-an","-c:v","libx264","-pix_fmt","yuv420p",str(dst)])
            clips.append(dst)
        concat=td/"concat.txt"; concat.write_text("".join(f"file '{p.as_posix()}'\n" for p in clips))
        visual=td/"visual.mp4"; run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(concat),"-c","copy",str(visual)])
        # Build narration at the first occurrence of each continuous VO block.
        inputs=["-i",str(visual)]; filters=[]; mixlabels=[]; idx=1; cursor=0.0; seen=set()
        for x in timeline:
            v=x.get("voice")
            if v and v.get("source") and v["source"] not in seen:
                seen.add(v["source"]); inputs += ["-i",str(media/v["source"])]
                delay=int(cursor*1000); filters.append(f"[{idx}:a]adelay={delay}|{delay},volume={spec['audio']['levels']['voice']}[a{idx}]"); mixlabels.append(f"[a{idx}]"); idx+=1
            cursor += float(x["duration"])
        if music:
            inputs += ["-stream_loop","-1","-i",str(media/music)]
            filters.append(f"[{idx}:a]atrim=0:{spec['output']['durationSeconds']},volume={spec['audio']['levels']['music']}[music]"); mixlabels.append("[music]")
        if mixlabels:
            filters.append("".join(mixlabels)+f"amix=inputs={len(mixlabels)}:duration=longest:normalize=0[aout]")
            run(["ffmpeg","-y",*inputs,"-filter_complex",";".join(filters),"-map","0:v:0","-map","[aout]","-c:v","copy","-c:a","aac","-t",str(spec["output"]["durationSeconds"]),str(out)])
        else:
            run(["ffmpeg","-y","-i",str(visual),"-c","copy",str(out)])
    report=post_render_qa(out,spec)
    if report["status"]!="PASS": raise SystemExit("post-render QA failed: "+", ".join(report["issues"]))
    print(json.dumps({"output":str(out),"qa":report},ensure_ascii=False))

if __name__=="__main__": main()
