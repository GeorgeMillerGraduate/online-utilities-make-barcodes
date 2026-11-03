# Optional AI QR service — GPU host required

This is a separate Python service, not a browser model and not part of a normal static cPanel installation. Its GPU generation has not been run in this build environment. The ordinary styled code maker works without it.

1. Copy this directory to a separate CUDA GPU host, outside public_html.
2. Create a Python virtual environment and install requirements.txt, using a PyTorch build compatible with that host's CUDA drivers. Model downloads require Internet access and substantial disk space. Review the model licences before use.
3. Set QR_ALLOWED_ORIGINS to your exact website origin (comma-separated for several), and optionally QR_BASE_MODEL to a compatible SD1.5 model.
4. Start: uvicorn app:app --host 127.0.0.1 --port 8090
5. Put a HTTPS reverse proxy in front of /generate, with request-size, rate and spending/resource limits. CORS is not authentication. Keep this a single worker: its lock only coordinates one process. Set the proxy timeout above the generation duration. Restrict who can use a costly GPU endpoint as appropriate for your hosting.
6. Set endpoint in the website's js/ai-config.js to your HTTPS /generate URL. Never put a secret key in browser JavaScript.

The browser sends only the entered data, optional prompt and style after Generate AI artwork is pressed. The service makes up to three candidates and returns only one decoded to the exact input. The browser checks it again before allowing export. A successful software scan is not a guarantee for every camera, print size or lighting condition; physically scan final artwork before publishing or printing.

Models and references:
- QR Monster v2: https://huggingface.co/monster-labs/control_v1p_sd15_qrcode_monster (OpenRAIL++ as listed in model card).
- Default SD1.5: https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5 (review its CreativeML OpenRAIL-M terms).
- Diffusers ControlNet: https://huggingface.co/docs/diffusers/api/pipelines/controlnet
- Qraft research/reference: https://github.com/sergiocrol/qraft
- DiffQRCoder research/reference: https://github.com/jwliao1209/DiffQRCoder

No Qraft, DiffQRCoder or QRBTF source is bundled. This small adapter is original code. AI generation applies to QR only. Other formats use deliberate geometric styling with their essential patterns preserved.
