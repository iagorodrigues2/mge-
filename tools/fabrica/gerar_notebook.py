#!/usr/bin/env python3
"""Gera `fabrica_reels.ipynb` — a fábrica inteira num notebook pra GPU grátis
(Google Colab ou Kaggle). Embute montagem.py, tts.py e o detector patchado
pra o notebook ser auto-suficiente: o Iago só clica "Run all".

    python3 gerar_notebook.py   → fabrica_reels.ipynb
"""
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
MONTAGEM = (AQUI / "montagem.py").read_text()
TTS = (AQUI / "tts.py").read_text()
DETECTOR = (AQUI / "latentsync_face_detector.py").read_text()


def md(s): return {"cell_type": "markdown", "metadata": {}, "source": s}
def code(s): return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s}


cells = [
md("""# 🏭 Fábrica de reels — Iago Rodrigues

Roteiro em texto → sua voz (clonada) → sua boca sincronizada no vídeo-base → legenda → reel 1080x1920 pronto.
Tudo com modelos de código aberto de uso comercial livre (Chatterbox MIT · LatentSync Apache 2.0 · Whisper MIT).

## Como usar (Colab)
1. **Runtime → Change runtime type → T4 GPU** (grátis).
2. No seu Google Drive crie a pasta `fabrica/` com:
   - `voz_ref.wav` — 20–60 s da sua voz, lugar silencioso (o vídeo 2 do briefing serve: o notebook extrai o áudio se você colocar `voz_ref.mp4`)
   - `base/` — os vídeos-base (celular vertical 1080p, olhando pra câmera, sem legenda)
   - `roteiros/` — um `.txt` por reel: 1ª linha `GANCHO: ...`, resto é a fala
3. **Runtime → Run all**. Os reels prontos aparecem em `fabrica/saida/`.

Reels já feitos não são refeitos: pra regerar um, apague a pasta dele em `saida/`.

## Kaggle
Anexe um Dataset privado com a mesma estrutura (`voz_ref.wav`, `base/`, `roteiros/`), ligue **GPU T4** em Settings → Accelerator e rode tudo. A saída fica em `/kaggle/working/saida/` (baixe o zip no fim).
"""),

code("""#@title 1. Onde estão os arquivos
import os, sys, shutil, subprocess, json, time
from pathlib import Path

NO_KAGGLE = Path("/kaggle").exists()
if NO_KAGGLE:
    entradas = [p for p in Path("/kaggle/input").iterdir() if p.is_dir()]
    ENTRADA = next((p for p in entradas if (p / "roteiros").exists()), entradas[0] if entradas else Path("/kaggle/input"))
    SAIDA = Path("/kaggle/working/saida")
    TRABALHO = Path("/kaggle/working/fabrica")
else:
    from google.colab import drive
    drive.mount("/content/drive", force_remount=False)
    ENTRADA = Path("/content/drive/MyDrive/fabrica")
    SAIDA = ENTRADA / "saida"
    TRABALHO = Path("/content/fabrica")

SAIDA.mkdir(parents=True, exist_ok=True); TRABALHO.mkdir(parents=True, exist_ok=True)
roteiros = sorted((ENTRADA / "roteiros").glob("*.txt"))
bases = sorted((ENTRADA / "base").glob("*.mp4")) + sorted((ENTRADA / "base").glob("*.mov"))
voz_ref = ENTRADA / "voz_ref.wav"
assert roteiros, f"nenhum roteiro .txt em {ENTRADA/'roteiros'}"
assert bases, f"nenhum vídeo-base em {ENTRADA/'base'}"
print(f"{len(roteiros)} roteiros · {len(bases)} vídeos-base · voz_ref: {'ok' if voz_ref.exists() else 'FALTA (vou tentar extrair de voz_ref.mp4)'}")
print(subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"], capture_output=True, text=True).stdout or "SEM GPU — ative a T4 em Runtime → Change runtime type")
"""),

code("""#@title 2. Instalar (≈4 min na primeira vez)
%%bash
set -e
pip -q install "diffusers==0.32.2" "transformers==4.48.0" accelerate einops omegaconf opencv-python \\
  python_speech_features librosa face-alignment kornia DeepCache decord imageio imageio-ffmpeg \\
  faster-whisper huggingface_hub soundfile scipy matplotlib ffmpeg-python 2>&1 | tail -1
# Chatterbox pina outro transformers → venv separado, só pra voz
python -m venv /content/venv_tts 2>/dev/null || python -m venv /kaggle/working/venv_tts
VENV=$( [ -d /content/venv_tts ] && echo /content/venv_tts || echo /kaggle/working/venv_tts )
$VENV/bin/pip -q install chatterbox-tts 2>&1 | tail -1
which ffmpeg || (apt-get -qq update && apt-get -qq install -y ffmpeg fonts-dejavu-core)
fc-list | grep -qi dejavu || apt-get -qq install -y fonts-dejavu-core
echo instalado
"""),

code("""#@title 3. LatentSync 1.6 + pesos + patch (detector sem insightface)
LS = TRABALHO / "LatentSync"
if not LS.exists():
    subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/bytedance/LatentSync.git", str(LS)], check=True)
from huggingface_hub import hf_hub_download
for f in ["latentsync_unet.pt", "whisper/tiny.pt"]:
    hf_hub_download("ByteDance/LatentSync-1.6", f, local_dir=str(LS / "checkpoints"))
(LS / "latentsync/utils/face_detector.py").write_text(DETECTOR := r'''""" + DETECTOR.replace("'''", "\\'\\'\\'") + """''')
print("LatentSync pronto em", LS)
"""),

code("""#@title 4. Código da fábrica (montagem + voz)
(TRABALHO / "montagem.py").write_text(r'''""" + MONTAGEM.replace("'''", "\\'\\'\\'") + """''')
(TRABALHO / "tts.py").write_text(r'''""" + TTS.replace("'''", "\\'\\'\\'") + """''')
sys.path.insert(0, str(TRABALHO))
import importlib, montagem; importlib.reload(montagem)
from montagem import ler_roteiro, montar
VENV_PY = next(p for p in [Path("/content/venv_tts/bin/python"), Path("/kaggle/working/venv_tts/bin/python")] if p.exists())

# referência de voz: aceita .wav ou extrai do .mp4/.mov do briefing
if not voz_ref.exists():
    src = next((p for p in [ENTRADA / "voz_ref.mp4", ENTRADA / "voz_ref.mov"] if p.exists()), None)
    assert src, "coloque voz_ref.wav (ou voz_ref.mp4) na pasta fabrica/"
    voz_ref = TRABALHO / "voz_ref.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "24000", "-t", "60", str(voz_ref)], check=True)
print("voz_ref:", voz_ref)
"""),

code("""#@title 5. Produzir os reels
import random
PASSOS = 20        # LatentSync: 20 = qualidade cheia
GUIDANCE = 1.5

def lipsync(base: Path, wav16: Path, out: Path):
    cmd = [sys.executable, "-m", "scripts.inference",
           "--unet_config_path", "configs/unet/stage2_512.yaml",
           "--inference_ckpt_path", "checkpoints/latentsync_unet.pt",
           "--inference_steps", str(PASSOS), "--guidance_scale", str(GUIDANCE), "--enable_deepcache",
           "--video_path", str(base), "--audio_path", str(wav16), "--video_out_path", str(out)]
    r = subprocess.run(cmd, cwd=LS, capture_output=True, text=True)
    if r.returncode != 0 or not out.exists():
        print(r.stdout[-2000:], r.stderr[-3000:]); raise RuntimeError("LatentSync falhou")

for rot in roteiros:
    nome = rot.stem
    pasta = SAIDA / nome
    final = pasta / "reel_final.mp4"
    if final.exists():
        print(f"✓ {nome} já existe, pulando"); continue
    pasta.mkdir(parents=True, exist_ok=True)
    t0 = time.time(); print(f"\\n▶ {nome}")
    gancho, _ = ler_roteiro(rot)

    wav = pasta / "voz.wav"
    if not wav.exists():
        r = subprocess.run([str(VENV_PY), str(TRABALHO / "tts.py"), str(rot), str(voz_ref), str(wav)], capture_output=True, text=True)
        if r.returncode != 0: print(r.stderr[-3000:]); raise RuntimeError("voz falhou")
    wav16 = pasta / "voz16.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-ar", "16000", "-ac", "1", str(wav16)], check=True)
    print(f"  voz ok ({time.time()-t0:.0f}s)")

    sync = pasta / "sync.mp4"
    if not sync.exists():
        lipsync(random.choice(bases), wav16, sync)
    print(f"  boca ok ({time.time()-t0:.0f}s)")

    montar(sync, wav, gancho, pasta)
    print(f"  ✅ {final} ({time.time()-t0:.0f}s)")

print("\\nTODOS PRONTOS →", SAIDA)
"""),

code("""#@title 6. (Kaggle) zipar a saída pra baixar
if NO_KAGGLE:
    shutil.make_archive("/kaggle/working/reels", "zip", SAIDA)
    print("baixe /kaggle/working/reels.zip no painel Output")
else:
    print("Colab: os reels já estão no Drive em", SAIDA)
"""),
]

nb = {"cells": cells, "metadata": {"accelerator": "GPU", "colab": {"provenance": []},
      "kernelspec": {"display_name": "Python 3", "name": "python3"}, "language_info": {"name": "python"}},
      "nbformat": 4, "nbformat_minor": 5}
out = AQUI / "fabrica_reels.ipynb"
out.write_text(json.dumps(nb, ensure_ascii=False, indent=1))
print("gerado:", out)
