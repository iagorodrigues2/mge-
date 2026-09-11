# Fábrica de reels (sem gravar, sem editar, custo zero)

Roteiro em texto → voz clonada do Iago → lip-sync no vídeo-base → legenda grande → 1080x1920.
Tudo roda local no Mac (Apple Silicon). Modelos: Chatterbox (MIT) + MuseTalk v1.5 (MIT) + Whisper.

## Setup (uma vez)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh && export PATH="$HOME/.local/bin:$PATH"
uv venv --python 3.11 .venv && source .venv/bin/activate
uv pip install yt-dlp static-ffmpeg mlx-whisper chatterbox-tts "torchvision==0.21.0" \
  "diffusers>=0.30" accelerate opencv-python soundfile librosa einops omegaconf face-alignment gdown imageio "huggingface_hub[cli]"
git clone --depth 1 https://github.com/TMElyralab/MuseTalk.git   # + aplicar patches (ver git log deste diretório)
# pesos: hf download TMElyralab/MuseTalk --include "musetalkV15/*" --local-dir MuseTalk/models ; sd-vae-ft-mse ; whisper-tiny ; face-parse-bisent
```
Patches no MuseTalk (Mac): mmpose/DWPose → `face_alignment` (mesmos 68 pontos iBUG); device MPS;
`torch.load(..., weights_only=False)`; rodar com `TORCH_COMPILE_DISABLE=1 PYTORCH_ENABLE_MPS_FALLBACK=1`.

## Insumos
- `bruto/voz_ref.wav` — 20s da voz do Iago (extraído de um reel dele, fala contínua, sem música)
- `base/*.mp4` — trechos do Iago falando pra câmera, 25fps, sem áudio, sem legenda queimada (720x900)
- `roteiros/NN-nome.txt` — 1ª linha `GANCHO: ...`, resto é a fala

## Uso
```bash
source .venv/bin/activate
python reel.py tudo roteiros/01-taxa.txt      # → saida/01-taxa/reel_final.mp4
```
Tempo no M4 16GB: ~2 min de voz + ~10 min de lip-sync por reel de 45s. Roda em lote de madrugada.
