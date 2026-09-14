"""Voz clonada do Iago (Chatterbox multilingual, MIT). Roda em venv próprio
porque o chatterbox pina outra versão do transformers que o LatentSync.

    python tts.py <roteiro.txt> <voz_ref.wav> <saida.wav> [--exag 0.5 --cfg 0.5]
"""
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from montagem import ler_roteiro


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro"); ap.add_argument("voz_ref"); ap.add_argument("saida")
    ap.add_argument("--exag", type=float, default=0.5)
    ap.add_argument("--cfg", type=float, default=0.5)
    ap.add_argument("--temp", type=float, default=0.8)
    a = ap.parse_args()

    import torch, torchaudio, perth
    if torch.cuda.is_available():
        dev = "cuda"
    elif torch.backends.mps.is_available():
        dev = "mps"
        perth.PerthImplicitWatermarker = perth.DummyWatermarker  # sem backend no Mac
        _load = torch.load
        torch.load = lambda *x, **k: _load(*x, **{**k, "map_location": "cpu"})
    else:
        dev = "cpu"
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device=dev)

    _, partes = ler_roteiro(Path(a.roteiro))
    pedacos = []
    for i, texto in enumerate(partes):
        print(f"[voz] {i+1}/{len(partes)}: {texto[:60]}…", flush=True)
        w = m.generate(texto, language_id="pt", audio_prompt_path=a.voz_ref,
                       exaggeration=a.exag, cfg_weight=a.cfg, temperature=a.temp)
        pedacos.append(w.cpu())
        pedacos.append(torch.zeros(1, int(m.sr * 0.35)))  # pausa entre frases
    audio = torch.cat(pedacos, dim=1)
    torchaudio.save(a.saida, audio, m.sr)
    print(f"[voz] {audio.shape[-1]/m.sr:.1f}s → {a.saida}")


if __name__ == "__main__":
    main()
