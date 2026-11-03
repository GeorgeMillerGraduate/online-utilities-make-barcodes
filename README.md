# Jenga-Code — 2D Code Studio

Upload index.html, css, js and images into public_html/apps/make-barcodes/, replacing the corresponding app files. Keep all js subdirectories and the local .wasm decoder file. Serve through HTTP/HTTPS; opening index.html directly as file:// will not load WebAssembly reliably. Refresh with Ctrl+F5. If your host has a strict Content Security Policy, allow its local WebAssembly decoder and blob/data image previews.

The original six encoders remain in place. The editorial renderer adds four treatments for QR, Micro QR, Data Matrix and Aztec. PDF417 bars and MaxiCode hexagons retain exact shapes. Download buttons are enabled only after the local decoder recovers exactly the entered text; PNG exports are checked again at their chosen resolution. Inputs stay on the device in Styled codes mode. No ordinary code generation API or external runtime CDN is required.

This edition is browser-only. No Python service or AI generation is included.

Validation: all six formats across four style settings decoded correctly for the HELLO123 sample using ZXing-C++; browser UI and local WASM verification were also checked. A further 20 longer-payload checks passed across QR, Data Matrix, Aztec and PDF417. Phone and tablet layouts were checked for horizontal overflow. Sample tests cannot establish support for every payload/reader. Unsupported inputs report encoder or scan errors instead of enabling exports.
