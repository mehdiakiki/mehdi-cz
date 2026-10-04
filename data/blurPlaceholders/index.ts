const blurPlaceholders: Record<string, string> = {
  "/static/images/mehdi_image_enhanced_square.webp":
    "data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAAAwBQCdASoUABQAPwFmq0+rJSOiMBgMAWAgCWUAx+WMOmrpd8MY+H1Bh/sAPAFQkz7zAAD+w+HId9FyfC7R6rkxpw6jpqpaa1y9iq6XSdGHwG7gZHC0D+JJmHFdjv9rRCQs3ONAtBpdKRo4lA6A2EAtB2meRYubYT6o2H2mYdvqaDH02NVMH1nss08QAAAA",
  "/static/images/mehdi_image_enhanced_square.png":
    "data:image/webp;base64,UklGRpoAAABXRUJQVlA4II4AAAAwBQCdASoUABQAPwFmq0+rJSOiMBgMAWAgCWUAx+WMOmrpd8MY+H1Bh/sAPAFQkz7zAAD+w+HId9FyfC7R6rkxpw6jpqpaa1y9iq6XSdGHwG7gZHC0D+JJmHFdjv9rRCQs3ONAtBpdKRo4lA6A2EAtB2meRYubYT6o2H2mYdvqaDH02NVMH1nss08QAAAA",

  "/static/images/system-design-db-control-plane.webp":
    "data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAACQAQCdASoJAAoABUB8JZwAApdBo4AA/q22o08xigAckuRMPTBuCCrDbPbOxrt0n4cAnMOObamkAAAA",

  "/static/images/logo.webp":
    "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADwAQCdASoKAAoABUB8JaQAD4AO0o62tgAA/ubn3z2yyva4HJdRLSA8lcB5ZiBQfX8fl7IMMFmtOqm5/MblU8AAAAA=",
  "/static/images/logo.png":
    "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADwAQCdASoKAAoABUB8JaQAD4AO0o62tgAA/ubn3z2yyva4HJdRLSA8lcB5ZiBQfX8fl7IMMFmtOqm5/MblU8AAAAA=",

  "/static/images/dicom_viewer.webp":
    "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACwAQCdASoKAAUABUB8JYgCdADW0agAAOAVxMjXQRqTz/shZCaKbcvZSHCr4AAA",
  "/static/images/dicom_viewer.png":
    "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACwAQCdASoKAAUABUB8JYgCdADW0agAAOAVxMjXQRqTz/shZCaKbcvZSHCr4AAA",

  "/static/images/new-application.webp":
    "data:image/webp;base64,UklGRjQAAABXRUJQVlA4ICgAAACQAQCdASoKAAUABUB8JQAAXQXUZIAA/rg1laupT1GSrelhl6LQuAAA",
  "/static/images/new-application.png":
    "data:image/webp;base64,UklGRjQAAABXRUJQVlA4ICgAAACQAQCdASoKAAUABUB8JQAAXQXUZIAA/rg1laupT1GSrelhl6LQuAAA",

  "/static/images/rust_analyzer.webp":
    "data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAAAwAQCdASoKAAUABUB8JZwAA3AA/u+z4Y05tv+G34jhtdXBj0KZ68DwAAA=",
  "/static/images/rust_analyzer.png":
    "data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAAAwAQCdASoKAAUABUB8JZwAA3AA/u+z4Y05tv+G34jhtdXBj0KZ68DwAAA=",

  "/static/images/twitter-card.webp":
    "data:image/webp;base64,UklGRioAAABXRUJQVlA4IB4AAABQAQCdASoKAAUABUB8JZwABAAAAP7wOQslS7W4oAA=",
  "/static/images/twitter-card.png":
    "data:image/webp;base64,UklGRioAAABXRUJQVlA4IB4AAABQAQCdASoKAAUABUB8JZwABAAAAP7wOQslS7W4oAA=",

  "/static/images/monitorme.png":
    "data:image/webp;base64,UklGRngAAABXRUJQVlA4WAoAAAAQAAAACQAAAgAAQUxQSB8AAAAAAAknhhIICgwCAAA+kWYqOjQ2CgAAABR6CAACAQAAAFZQOCAyAAAA0AEAnQEqCgADAAVAfCWIAnQBF1TiEAAA+TIms7fRpgbeo0is16CuXIBxmfFGYcFgAAA=",

  "/static/images/go_worker_pool.png":
    "data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoKAAUABUB8JZQAAvrQzyAA/uJSvOQYo/fHiS60WluxsAQIAAA=",

  "/static/images/rust.png":
    "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACQAQCdASoKAAUABUB8JaQAAuznhqAA/grJsZP39wu5t3XlKD10PmI9TobhXKfPgAAAAA==",

  "/static/images/deno.png":
    "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACQAQCdASoKAAYABUB8JaQAAvaWJkAA/sl+E6tpccTDYP5pAUcyb1vAUmIAAAAA",
};

export function getBlurDataURL(src: string): string | undefined {
  const normalizedSrc = src.replace(/^\/+/, "/");
  return blurPlaceholders[normalizedSrc];
}

export { blurPlaceholders };
