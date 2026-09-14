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
import os, sys, json, subprocess, shutil, random
from pathlib import Path

AQUI = Path(__file__).resolve().parent
VENV_PY = AQUI / ".venv/bin/python"
MUSETALK = AQUI / "MuseTalk"
BASES = AQUI / "base"
VOZ_REF = AQUI / "bruto/voz_ref.wav"
SAIDA = AQUI / "saida"

import static_ffmpeg
static_ffmpeg.add_paths()
sys.path.insert(0, str(AQUI))
import montagem
from montagem import ler_roteiro
FFMPEG_DIR = os.path.dirname(shutil.which("ffmpeg"))


def sh(*args, **kw):
    return subprocess.run([str(a) for a in args], check=True, **kw)


# ---------------------------------------------------------------- 1. voz
def voz(roteiro: Path, destino: Path) -> Path:
    destino.mkdir(parents=True, exist_ok=True)
    gancho, partes = ler_roteiro(roteiro)
    (destino / "meta.json").write_text(json.dumps({"gancho": gancho, "partes": partes}, ensure_ascii=False, indent=1))
    wav = destino / "voz.wav"
    sh(VENV_PY, AQUI / "tts.py", roteiro, VOZ_REF, wav)
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
def montar(destino: Path) -> Path:
    meta = json.loads((destino / "meta.json").read_text())
    final = montagem.montar(destino / "musetalk/v15/sync.mp4", destino / "voz.wav", meta.get("gancho", ""), destino)
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
