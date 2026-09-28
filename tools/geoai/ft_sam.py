"""Fine-tune SAM 3.1's detection and mask heads on OSM building footprints.

The image backbone (454M) and text encoder (354M) stay frozen; the DETR
encoder/decoder, mask decoder and scoring head (~25M) train. The target is
the same map the site evaluates: per pixel, the max over detections of mask
probability x confidence, scored with BCE + Dice against the OSM mask. No
instance matching, since the demo only ever reads that per-pixel map.

Five towns train, Bayamón picks the checkpoint, Ponce and Guaynabo are only
touched after training finishes.
"""
import copy, random, time
import numpy as np, torch, torch.nn.functional as F
from PIL import Image

TRAIN = ["sanjuan", "caguas", "mayaguez", "carolina", "arecibo"]
VAL   = "bayamon"
HEADS = ["detr_encoder", "detr_decoder", "mask_decoder", "dot_product_scoring"]
TILE  = 384      # matches inference windows in sam_infer.py

def load(name):
    return (np.asarray(Image.open(f"data/{name}_img.jpg").convert("RGB")),
            np.asarray(Image.open(f"data/{name}_mask.png")) > 127)

def freeze_to_heads(model):
    for p in model.parameters(): p.requires_grad_(False)
    params = [p for h in HEADS for p in getattr(model, h).parameters()]
    for p in params: p.requires_grad_(True)
    return params

def heads_state(model):
    return {h: copy.deepcopy({k: v.detach().cpu() for k, v in getattr(model, h).state_dict().items()})
            for h in HEADS}

def load_heads(model, state):
    for h in HEADS: getattr(model, h).load_state_dict(state[h])

def sample_batch(towns, n, rng):
    """Random TILE crops from random training towns, with flips and 90-degree turns."""
    imgs, masks = [], []
    for _ in range(n):
        img, mask = towns[rng.randrange(len(towns))]
        y = rng.randrange(img.shape[0] - TILE + 1); x = rng.randrange(img.shape[1] - TILE + 1)
        i, m = img[y:y + TILE, x:x + TILE], mask[y:y + TILE, x:x + TILE]
        k = rng.randrange(4); i, m = np.rot90(i, k), np.rot90(m, k)
        if rng.random() < .5: i, m = i[:, ::-1], m[:, ::-1]
        imgs.append(np.ascontiguousarray(i)); masks.append(np.ascontiguousarray(m))
    return imgs, np.stack(masks)

def composite(out):
    """Per-pixel max over queries of mask prob x score, as in sam_infer.tile_prob."""
    score = out.pred_logits.sigmoid()
    if out.presence_logits is not None: score = score * out.presence_logits.sigmoid()
    return (out.pred_masks.sigmoid() * score[..., None, None]).amax(1)

def loss_fn(prob, truth):
    t = F.interpolate(truth[:, None].float(), size=prob.shape[-2:], mode="area")[:, 0]
    p = prob.float().clamp(1e-6, 1 - 1e-6)
    bce = F.binary_cross_entropy(p, t)
    dice = 1 - (2 * (p * t).sum((1, 2)) + 1) / (p.sum((1, 2)) + t.sum((1, 2)) + 1)
    return bce + dice.mean()

def finetune(model, proc, prompt, infer, best_iou, steps=1000, batch=4, lr=2e-5,
             eval_every=100, seed=0, log=print):
    dev = next(model.parameters()).device
    cuda = dev.type == "cuda"
    # bf16 on Ampere and newer; older GPUs (T4) fall back to fp32 so nothing overflows
    bf16 = cuda and torch.cuda.get_device_capability(dev)[0] >= 8
    rng = random.Random(seed); torch.manual_seed(seed)

    towns = [load(n) for n in TRAIN]
    val_img, val_truth = load(VAL)
    params = freeze_to_heads(model)
    log(f"training {sum(p.numel() for p in params)/1e6:.1f}M of "
        f"{sum(p.numel() for p in model.parameters())/1e6:.0f}M params, bf16={bf16}")

    txt = proc(text=prompt, return_tensors="pt").to(dev)
    with torch.no_grad():
        text_embeds = model.get_text_features(input_ids=txt.input_ids, attention_mask=txt.attention_mask,
                                              return_dict=True).pooler_output

    opt = torch.optim.AdamW(params, lr=lr, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda s: min(1, (s + 1) / 50) * 0.5 * (1 + np.cos(np.pi * min(s, steps) / steps)))

    def evaluate():
        model.eval()
        t, iou = best_iou(infer(val_img), val_truth)
        return iou, t

    best_val, best_t = evaluate(); best_step, best_state = 0, heads_state(model)
    log(f"step    0  val {VAL} IoU {best_val:.3f} @ t={best_t:.2f}  (zero-shot)")
    t0, run = time.time(), 0.0
    for step in range(1, steps + 1):
        model.train(); model.vision_encoder.eval(); model.text_encoder.eval()
        imgs, masks = sample_batch(towns, batch, rng)
        px = proc.image_processor(images=imgs, return_tensors="pt").pixel_values.to(dev)
        with torch.no_grad(), torch.autocast(dev.type, dtype=torch.bfloat16, enabled=bf16):
            vis = model.get_vision_features(pixel_values=px)
        if bf16:  # hand the heads fp32 features; autocast below decides their precision
            vis = type(vis)(**{k: tuple(x.float() for x in v) if isinstance(v, tuple) else
                               v.float() if torch.is_tensor(v) else v for k, v in vis.items()})
        with torch.autocast(dev.type, dtype=torch.bfloat16, enabled=bf16):
            out = model(vision_embeds=vis, text_embeds=text_embeds.expand(batch, -1, -1),
                        attention_mask=txt.attention_mask.expand(batch, -1))
        loss = loss_fn(composite(out), torch.from_numpy(masks).to(dev))
        opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(params, 1.0); opt.step(); sched.step()
        run = loss.item() if step == 1 else 0.95 * run + 0.05 * loss.item()
        if step % eval_every == 0 or step == steps:
            iou, t = evaluate()
            mark = ""
            if iou > best_val:
                best_val, best_t, best_step, best_state, mark = iou, t, step, heads_state(model), "  *best"
            log(f"step {step:4d}  loss {run:.3f}  val {VAL} IoU {iou:.3f} @ t={t:.2f}  "
                f"{(time.time()-t0)/step:.2f}s/step{mark}")
    load_heads(model, best_state); model.eval()
    log(f"kept step {best_step}: val {VAL} IoU {best_val:.3f}")
    return dict(best_step=best_step, val_iou=float(best_val), val_t=best_t, steps=steps,
                batch=batch, lr=lr, state=best_state)
