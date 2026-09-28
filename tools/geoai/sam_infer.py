"""Zero-shot building segmentation with SAM 3.1 (text prompt, no training).

Writes data/<aoi>_prob.npy: per-pixel max over detected instances of
mask probability x instance score, so the site's threshold slider still has
a continuous map to sweep.

facebook/sam3.1 ships only Meta's native checkpoint (gated; request access on
Hugging Face). Meta's own package assumes CUDA, so the detector weights are
remapped in memory onto transformers' Sam3Model, which runs on MPS/CPU.
"""
import os, sys
import numpy as np, torch
from PIL import Image
from huggingface_hub import hf_hub_download
from transformers import CLIPTokenizerFast, Sam3Config, Sam3ImageProcessor, Sam3Model, Sam3Processor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convert_sam3_to_hf import convert_old_keys_to_new_keys, split_qkv

DEV    = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
TILE   = 384     # ~300 m per tile; SAM resizes to 1008, so rooftops get ~2.6x
STEP   = 256
PROMPT = os.environ.get("SAM_PROMPT", "building")

def load_sam31():
    ckpt = torch.load(hf_hub_download("facebook/sam3.1", "sam3.1_multiplex.pt"),
                      map_location="cpu", weights_only=True, mmap=True)
    ckpt = ckpt.get("model", ckpt)
    # the image detector is the "detector." half; the "tracker." half is video-only
    old = {k[len("detector."):]: v for k, v in ckpt.items() if k.startswith("detector.")}
    names = convert_old_keys_to_new_keys(list(old))
    new = {}
    for k, v in old.items():
        nk = names[k]
        new[nk] = v[:, 1:, :] if nk == "vision_encoder.backbone.embeddings.position_embeddings" else v
    new = split_qkv(new)
    if "text_encoder.text_projection.weight" in new:
        new["text_encoder.text_projection.weight"] = new["text_encoder.text_projection.weight"].T
    model = Sam3Model(Sam3Config())
    missing, unexpected = model.load_state_dict(new, strict=False)
    # same allowances as the upstream converter: bias-free projections, the
    # identity mask projection, and RoPE tables computed on the fly. SAM 3.1
    # also drops the 0.5x FPN level, which Sam3Model computes but discards.
    real = [k for k in missing if not k.endswith(("projection.bias", "rope_embeddings"))
            and "mask_encoder.projection" not in k and "neck.fpn_layers.3." not in k]
    assert not real, f"SAM 3.1 weights did not cover: {real[:10]}"
    print(f"  SAM 3.1 detector: {sum(p.numel() for p in model.parameters())/1e6:.0f}M params, "
          f"{len(unexpected)} tracker-only keys skipped", flush=True)
    return model.to(DEV).eval()

model = load_sam31()
proc  = Sam3Processor(image_processor=Sam3ImageProcessor(),
                      tokenizer=CLIPTokenizerFast.from_pretrained("openai/clip-vit-base-patch32",
                                                                  max_length=32, model_max_length=32))

@torch.inference_mode()
def tile_prob(tile):
    inp = proc(images=Image.fromarray(tile), text=PROMPT, return_tensors="pt").to(DEV)
    out = model(**inp)
    score = out.pred_logits[0].sigmoid()
    if out.presence_logits is not None:
        score = score * out.presence_logits[0].sigmoid()
    masks = torch.nn.functional.interpolate(out.pred_masks[0][None], size=tile.shape[:2],
                                            mode="bilinear", align_corners=False)[0].sigmoid()
    return (masks * score.view(-1, 1, 1)).amax(0).float().cpu().numpy()

def infer(img):
    """Overlapping tiles, cosine-feathered, same scheme as the old U-Net export."""
    H, W, _ = img.shape
    acc = np.zeros((H, W), np.float32); wgt = np.zeros((H, W), np.float32)
    ramp = np.maximum(np.hanning(TILE)[:, None] * np.hanning(TILE)[None, :], 1e-3)
    ys = sorted(set(list(range(0, H - TILE + 1, STEP)) + [H - TILE]))
    xs = sorted(set(list(range(0, W - TILE + 1, STEP)) + [W - TILE]))
    for y in ys:
        for x in xs:
            p = tile_prob(img[y:y + TILE, x:x + TILE])
            acc[y:y + TILE, x:x + TILE] += p * ramp; wgt[y:y + TILE, x:x + TILE] += ramp
    return acc / np.maximum(wgt, 1e-6)

def best_iou(prob, truth):
    """Best IoU over the same 0.05-0.95 threshold sweep the site reports."""
    return max(((round(float(t), 2), ((prob >= t) & truth).sum() / max(((prob >= t) | truth).sum(), 1))
                for t in np.arange(0.05, 0.96, 0.05)), key=lambda r: r[1])

if __name__ == "__main__":
    for name in sys.argv[1:] or ["ponce", "guaynabo"]:
        img = np.asarray(Image.open(f"data/{name}_img.jpg").convert("RGB"))
        prob = infer(img)
        np.save(f"data/{name}_prob.npy", prob)
        t, iou = best_iou(prob, np.asarray(Image.open(f"data/{name}_mask.png")) > 127)
        print(f"  {name:9s} prompt={PROMPT!r} best IoU {iou:.3f} @ t={t:.2f}", flush=True)
