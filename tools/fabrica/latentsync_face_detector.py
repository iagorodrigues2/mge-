# Uso comercial (Mac e nuvem): o insightface (modelos só p/ pesquisa, onnx CUDA) foi
# trocado pela face_alignment (FAN, BSD). O pipeline só consome 3 pontos do
# detector — centro das duas sobrancelhas e centro do nariz — via índices do
# layout de 106 pontos do insightface. Devolvemos um array 106x2 só com esses
# índices preenchidos a partir dos 68 pontos iBUG.
import numpy as np
import torch
import face_alignment as _fa

INSIGHTFACE_DETECT_SIZE = 512


class FaceDetector:
    def __init__(self, device="cuda"):
        dev = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.fan = _fa.FaceAlignment(_fa.LandmarksType.TWO_D, flip_input=False, device=dev)
        self._ultimo = (None, None)  # frame borrado (corte, movimento) reaproveita a detecção anterior

    def __call__(self, frame, threshold=0.5):
        f_h, f_w, _ = frame.shape
        lms = self.fan.get_landmarks(frame[:, :, ::-1])  # FAN espera RGB; o pipeline passa BGR
        if not lms:
            lms = self.fan.get_landmarks(frame)  # tenta na outra ordem de canal antes de desistir
        if not lms:
            return self._ultimo
        lm = max(lms, key=lambda l: (l[:, 0].max() - l[:, 0].min()) * (l[:, 1].max() - l[:, 1].min()))
        lm = np.round(lm).astype(np.int_)

        # iBUG 68: 17-21 sobrancelha esquerda (da imagem), 22-26 direita, 30-33 nariz (ponta/base)
        lmk = np.zeros((106, 2), dtype=np.int_)
        lmk[[43, 48, 49, 51, 50]] = lm[17:22]
        lmk[101:106] = lm[22:27]
        lmk[[74, 77, 83, 86]] = lm[[30, 31, 33, 35]]
        lmk[73] = lm[29]

        x1, y1 = lm[:, 0].min(), lm[:, 1].min()
        x2, y2 = lm[:, 0].max(), lm[:, 1].max()
        y2 += int((x2 - x1) * 0.1)
        x1 -= int((x2 - x1) * 0.05)
        x2 += int((x2 - x1) * 0.05)
        self._ultimo = ((max(0, x1), max(0, y1), min(f_w, x2), min(f_h, y2)), lmk)
        return self._ultimo
