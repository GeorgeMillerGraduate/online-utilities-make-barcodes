"""Optional GPU QR art service. Run outside the public static website directory."""
import base64
import io
import os
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title='Jenga-Code QR Art')
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('QR_ALLOWED_ORIGINS', 'https://jenga-code.com').split(','), allow_methods=['POST'], allow_headers=['Content-Type'])
lock = threading.Lock()
pipeline = None

class Request(BaseModel):
    data: str = Field(min_length=1, max_length=300)
    prompt: str = Field(default='', max_length=500)
    style: Literal['copper', 'botanical', 'city', 'workshop'] = 'copper'

STYLES = {
    'copper': 'copperplate scientific engraving, antique printing press, cream paper and dark navy ink, fine cross hatching',
    'botanical': 'botanical scientific engraving, fern leaves and branching stems, cream paper, dark green ink',
    'city': 'architectural etching of a compact city, geometric buildings, cream paper, dark charcoal ink',
    'workshop': 'vintage computing workshop illustration, gears and instruments, cream paper, dark copper ink',
}

def produce_verified(data, prompt, style):
    global pipeline
    import torch
    import qrcode
    import zxingcpp
    from PIL import Image
    from diffusers import ControlNetModel, StableDiffusionControlNetPipeline
    if not torch.cuda.is_available():
        raise HTTPException(503, 'A CUDA GPU is required for AI artwork.')
    if pipeline is None:
        model = ControlNetModel.from_pretrained('monster-labs/control_v1p_sd15_qrcode_monster', subfolder='v2', torch_dtype=torch.float16)
        pipeline = StableDiffusionControlNetPipeline.from_pretrained(os.getenv('QR_BASE_MODEL', 'stable-diffusion-v1-5/stable-diffusion-v1-5'), controlnet=model, torch_dtype=torch.float16).to('cuda')
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=4, box_size=1)
    qr.add_data(data)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    module = max(1, min(16, 704 // len(matrix)))
    mark = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    mark = mark.resize((len(matrix)*module, len(matrix)*module), Image.Resampling.NEAREST)
    condition = Image.new('RGB', (768, 768), '#808080')
    condition.paste(mark, ((768-mark.width)//2, (768-mark.height)//2))
    for strength in (1.15, 1.45, 1.75):
        result = pipeline(prompt=STYLES[style]+', '+prompt+', high contrast, no letters, no typography', negative_prompt='blurry, low contrast, text, watermark', image=condition, width=768, height=768, num_inference_steps=35, guidance_scale=7.5, controlnet_conditioning_scale=strength)
        if result.nsfw_content_detected and any(result.nsfw_content_detected):
            continue
        image = result.images[0]
        if any(r.text == data for r in zxingcpp.read_barcodes(image, try_harder=True)):
            out = io.BytesIO()
            image.save(out, format='PNG')
            return {'png_base64': base64.b64encode(out.getvalue()).decode(), 'decoded_text': data}
    raise HTTPException(422, 'No artwork passed the exact-content scan check. Try a shorter link or different art direction.')

@app.post('/generate')
def generate(request: Request):
    if len(request.data.encode('utf-8')) > 300:
        raise HTTPException(422, 'Use no more than 300 UTF-8 bytes.')
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'The GPU is busy. Please try again shortly.')
    try:
        return produce_verified(request.data, request.prompt, request.style)
    finally:
        lock.release()
