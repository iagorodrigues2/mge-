"""Montagem final do reel: legenda palavra a palavra + gancho + 1080x1920.

Compartilhado entre o Mac (reel.py) e o notebook da nuvem. Só depende de
ffmpeg e de um Whisper com timestamp de palavra (mlx-whisper no Mac,
faster-whisper em GPU NVIDIA).
"""
import json, shutil, subprocess, textwrap
from pathlib import Path


def _ffprobe(v: Path, campos: str) -> str:
    return subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", campos, "-of", "csv=p=0", str(v)],
                          capture_output=True, text=True).stdout.strip()


def palavras(wav: Path) -> list:
    """[{word,start,end}] — tenta mlx-whisper (Mac) e cai pra faster-whisper (CUDA/CPU)."""
    try:
        import mlx_whisper
        r = mlx_whisper.transcribe(str(wav), path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
                                   language="pt", word_timestamps=True)
        return [w for s in r["segments"] for w in s.get("words", [])]
    except ImportError:
        pass
    from faster_whisper import WhisperModel
    import torch
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    m = WhisperModel("large-v3-turbo", device=dev, compute_type="float16" if dev == "cuda" else "int8")
    segs, _ = m.transcribe(str(wav), language="pt", word_timestamps=True)
    return [{"word": w.word, "start": w.start, "end": w.end} for s in segs for w in (s.words or [])]


def _esc(t: str) -> str:
    return t.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def legendas_ass(wav: Path, destino: Path) -> Path:
    """Blocos de 3 palavras, a atual em amarelo. Fonte grande, centro-baixo."""
    ps = palavras(wav)
    (destino / "palavras.json").write_text(json.dumps(ps, ensure_ascii=False))
    cab = textwrap.dedent("""\
        [Script Info]
        ScriptType: v4.00+
        PlayResX: 1080
        PlayResY: 1920

        [V4+ Styles]
        Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
        Style: Leg,DejaVu Sans,86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,60,60,300,1

        [Events]
        Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
        """)

    def ts(s):
        return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"

    linhas = []
    for i in range(0, len(ps), 3):
        grupo = ps[i:i + 3]
        for j, w in enumerate(grupo):
            fim = grupo[j + 1]["start"] if j + 1 < len(grupo) else w["end"]
            txt = " ".join(
                ("{\\c&H00D7FF&}" + _esc(x["word"].strip().upper()) + "{\\c&HFFFFFF&}") if k == j
                else _esc(x["word"].strip().upper())
                for k, x in enumerate(grupo))
            linhas.append(f"Dialogue: 0,{ts(w['start'])},{ts(fim)},Leg,,0,0,0,,{txt}")
    ass = destino / "legenda.ass"
    ass.write_text(cab + "\n".join(linhas) + "\n", encoding="utf-8")
    return ass


def montar(sync: Path, wav: Path, gancho: str, destino: Path, nome: str = "reel_final.mp4") -> Path:
    """sync = vídeo já com a boca sincronizada (qualquer resolução); wav = a voz."""
    destino.mkdir(parents=True, exist_ok=True)
    ass = legendas_ass(wav, destino)
    w, h = (int(x) for x in _ffprobe(sync, "stream=width,height").split("\n")[0].split(","))

    # já é 9:16 (gravação-base no celular) → só escala; senão centraliza num
    # quadro escuro 1080x1920.
    if abs(w / h - 9 / 16) < 0.02:
        filtros = ["scale=1080:1920"]
    else:
        filtros = ["scale=1080:-2", "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#0f1720"]

    if gancho:
        gtxt = destino / "gancho.txt"
        gtxt.write_text("\n".join(textwrap.wrap(gancho.replace("'", "’"), 22)))
        filtros.append(f"drawtext=textfile='{gtxt}':fontsize=72:fontcolor=white:line_spacing=12"
                       f":x=(w-text_w)/2:y=110:box=1:boxcolor=black@0.55:boxborderw=28")
    filtros.append(f"subtitles='{ass}'")

    final = destino / nome
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(sync), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                    "-vf", ",".join(filtros), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", str(final)], check=True)
    return final


def ler_roteiro(caminho: Path):
    """1ª linha `GANCHO: ...`; resto é a fala, quebrada em pedaços de ~280 chars."""
    import re
    linhas = caminho.read_text(encoding="utf-8").strip().splitlines()
    gancho = ""
    if linhas and linhas[0].upper().startswith("GANCHO:"):
        gancho = linhas.pop(0).split(":", 1)[1].strip()
    corpo = " ".join(l.strip() for l in linhas if l.strip())
    partes, atual = [], ""
    for frase in re.split(r"(?<=[.!?])\s+", corpo):
        if len(atual) + len(frase) > 280 and atual:
            partes.append(atual.strip()); atual = ""
        atual += " " + frase
    if atual.strip():
        partes.append(atual.strip())
    return gancho, partes
