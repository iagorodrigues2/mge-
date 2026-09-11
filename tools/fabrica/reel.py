#!/usr/bin/env python
"""Fábrica de reels — roteiro em texto vira vídeo pronto pra postar, sem gravar.

    python reel.py tudo roteiros/01-taxa.txt            # faz tudo
    python reel.py voz  roteiros/01-taxa.txt            # só a voz clonada
    python reel.py lipsync saida/01-taxa/voz.wav        # só o lip-sync
    python reel.py montar saida/01-taxa                 # só legendas + 9:16

Etapas (todas locais, custo zero, Apple Silicon):
  1. voz      Chatterbox multilingual (MIT) clona a voz do Iago a partir de
              `bruto/voz_ref.wav` (22s tirados de um reel dele) e lê o roteiro.
  2. lipsync  MuseTalk v1.5 (MIT) coloca essa fala na boca do Iago sobre o
              vídeo-base (`base/*.mp4`, trechos dele falando pra câmera).
  3. montar   mlx-whisper marca cada palavra no tempo; ffmpeg queima legenda
              grande, põe o gancho no topo e entrega 1080x1920.

Formato do roteiro (.txt):
  linha 1:  GANCHO: texto que aparece escrito no topo (o hook)
  resto:    o que a voz fala. Linhas em branco separam frases/pausas.
"""
import os, re, sys, json, subprocess, shutil, random, textwrap
from pathlib import Path

AQUI = Path(__file__).resolve().parent
VENV_PY = AQUI / ".venv/bin/python"
MUSETALK = AQUI / "MuseTalk"
BASES = AQUI / "base"
VOZ_REF = AQUI / "bruto/voz_ref.wav"
SAIDA = AQUI / "saida"

import static_ffmpeg
static_ffmpeg.add_paths()
FFMPEG_DIR = os.path.dirname(shutil.which("ffmpeg"))


def sh(*args, **kw):
    return subprocess.run([str(a) for a in args], check=True, **kw)


def ler_roteiro(caminho: Path):
    linhas = caminho.read_text(encoding="utf-8").strip().splitlines()
    gancho = ""
    if linhas and linhas[0].upper().startswith("GANCHO:"):
        gancho = linhas.pop(0).split(":", 1)[1].strip()
    corpo = "\n".join(linhas).strip()
    # frases: o Chatterbox rende melhor em pedaços de até ~300 caracteres
    partes, atual = [], ""
    for frase in re.split(r"(?<=[.!?])\s+", corpo.replace("\n", " ")):
        if len(atual) + len(frase) > 280 and atual:
            partes.append(atual.strip()); atual = ""
        atual += " " + frase
    if atual.strip():
        partes.append(atual.strip())
    return gancho, partes


# ---------------------------------------------------------------- 1. voz
def voz(roteiro: Path, destino: Path) -> Path:
    destino.mkdir(parents=True, exist_ok=True)
    gancho, partes = ler_roteiro(roteiro)
    (destino / "meta.json").write_text(json.dumps({"gancho": gancho, "partes": partes}, ensure_ascii=False, indent=1))

    import torch, torchaudio, perth
    perth.PerthImplicitWatermarker = perth.DummyWatermarker  # sem backend CUDA no Mac
    _load = torch.load
    torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": "cpu"})
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device="mps")

    pedacos = []
    for i, texto in enumerate(partes):
        print(f"[voz] parte {i+1}/{len(partes)}: {texto[:60]}…")
        w = m.generate(texto, language_id="pt", audio_prompt_path=str(VOZ_REF), exaggeration=0.5, cfg_weight=0.5)
        pedacos.append(w.cpu())
        # pausa curta entre frases: sem isso a fala vira metralhadora
        pedacos.append(torch.zeros(1, int(m.sr * 0.35)))
    audio = torch.cat(pedacos, dim=1)
    wav = destino / "voz.wav"
    torchaudio.save(str(wav), audio, m.sr)
    print(f"[voz] {audio.shape[-1]/m.sr:.1f}s → {wav}")
    return wav


# ------------------------------------------------------------ 2. lipsync
def escolher_base(duracao: float) -> Path:
    bases = sorted(BASES.glob("*.mp4"))
    if not bases:
        sys.exit(f"nenhum vídeo-base em {BASES}/ — coloque trechos do Iago falando pra câmera (25fps, sem legenda)")
    return random.choice(bases)


def lipsync(wav: Path, destino: Path) -> Path:
    destino.mkdir(parents=True, exist_ok=True)
    wav16 = destino / "voz16.wav"
    sh("ffmpeg", "-v", "error", "-y", "-i", wav, "-ar", "16000", "-ac", "1", wav16)
    dur = float(subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav16)], capture_output=True, text=True).stdout)
    base = escolher_base(dur)
    cfg = destino / "musetalk.yaml"
    cfg.write_text(f'task_0:\n video_path: "{base}"\n audio_path: "{wav16}"\n')
    print(f"[lipsync] base {base.name}, áudio {dur:.1f}s — isso demora (Mac, sem CUDA)")
    env = {**os.environ, "TORCH_COMPILE_DISABLE": "1", "PYTORCH_ENABLE_MPS_FALLBACK": "1"}
    subprocess.run([str(VENV_PY), "-m", "scripts.inference", "--inference_config", str(cfg), "--result_dir", str(destino / "musetalk"),
                    "--unet_model_path", "models/musetalkV15/unet.pth", "--unet_config", "models/musetalkV15/musetalk.json",
                    "--version", "v15", "--ffmpeg_path", FFMPEG_DIR, "--output_vid_name", "sync.mp4"],
                   cwd=MUSETALK, env=env, check=True)
    out = destino / "musetalk/v15/sync.mp4"
    if not out.exists():
        sys.exit("[lipsync] MuseTalk não gerou o vídeo — veja o log acima")
    return out


# ------------------------------------------------------------- 3. montar
def _ass_escape(t: str) -> str:
    return t.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def legendas_ass(wav: Path, destino: Path) -> Path:
    """Legenda palavra-a-palavra em blocos de 3, estilo reel: a palavra atual
    em destaque. Fonte grande, centro-baixo, sem depender de fonte instalada."""
    import mlx_whisper
    r = mlx_whisper.transcribe(str(wav), path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="pt", word_timestamps=True)
    palavras = [w for s in r["segments"] for w in s.get("words", [])]
    (destino / "palavras.json").write_text(json.dumps(palavras, ensure_ascii=False))

    cab = textwrap.dedent("""\
        [Script Info]
        ScriptType: v4.00+
        PlayResX: 1080
        PlayResY: 1920

        [V4+ Styles]
        Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
        Style: Leg,Arial,86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,60,60,300,1

        [Events]
        Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
        """)

    def ts(s):
        h = int(s // 3600); m = int(s % 3600 // 60); sec = s % 60
        return f"{h}:{m:02d}:{sec:05.2f}"

    linhas = []
    bloco = 3
    for i in range(0, len(palavras), bloco):
        grupo = palavras[i:i + bloco]
        for j, w in enumerate(grupo):
            ini, fim = w["start"], w["end"]
            if j + 1 < len(grupo):
                fim = grupo[j + 1]["start"]
            txt = " ".join(
                ("{\\c&H00D7FF&}" + _ass_escape(x["word"].strip().upper()) + "{\\c&HFFFFFF&}") if k == j else _ass_escape(x["word"].strip().upper())
                for k, x in enumerate(grupo)
            )
            linhas.append(f"Dialogue: 0,{ts(ini)},{ts(fim)},Leg,,0,0,0,,{txt}")
    ass = destino / "legenda.ass"
    ass.write_text(cab + "\n".join(linhas) + "\n", encoding="utf-8")
    return ass


def montar(destino: Path) -> Path:
    meta = json.loads((destino / "meta.json").read_text())
    sync = destino / "musetalk/v15/sync.mp4"
    wav = destino / "voz.wav"
    ass = legendas_ass(wav, destino)
    gancho = _ass_escape(meta.get("gancho", "")).replace("'", "’")

    # vídeo-base é 720x900 (rosto, sem a faixa de legenda antiga) → 1080x1350,
    # centralizado num quadro 1080x1920 escuro; gancho em cima, legenda embaixo.
    filtros = [
        "scale=1080:-2",
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#0f1720",
    ]
    if gancho:
        gancho_quebrado = "\n".join(textwrap.wrap(gancho, 22))
        gtxt = destino / "gancho.txt"
        gtxt.write_text(gancho_quebrado)
        filtros.append(f"drawtext=textfile='{gtxt}':fontsize=72:fontcolor=white:line_spacing=12:x=(w-text_w)/2:y=110:box=1:boxcolor=black@0.55:boxborderw=28")
    filtros.append(f"subtitles='{ass}'")
    final = destino / "reel_final.mp4"
    sh("ffmpeg", "-v", "error", "-y", "-i", sync, "-i", wav, "-map", "0:v", "-map", "1:a",
       "-vf", ",".join(filtros), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", final)
    print(f"[montar] pronto → {final}")
    return final


# ------------------------------------------------------------------ cli
def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    cmd, alvo = sys.argv[1], Path(sys.argv[2]).resolve()
    if cmd == "voz":
        voz(alvo, SAIDA / alvo.stem)
    elif cmd == "lipsync":
        lipsync(alvo, alvo.parent)
    elif cmd == "montar":
        montar(alvo)
    elif cmd == "tudo":
        dest = SAIDA / alvo.stem
        wav = voz(alvo, dest)
        lipsync(wav, dest)
        montar(dest)
    else:
        print(__doc__); sys.exit(1)


if __name__ == "__main__":
    main()
