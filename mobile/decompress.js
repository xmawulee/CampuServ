const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

const url = "https://storage.googleapis.com/eas-workflows-production/logs/b0266316-e0b1-4a0e-8638-13b69bf75d2e/c64426e2-a938-4770-b458-ddf1b9a25555/2026-08-05T00%3A10%3A59Z-cef382c5-cfc5-4b9f-a6d6-1802ac4d668a.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260805%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260805T002411Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=601946538311ec5d8fbc6942ed72a509f873782125115c546234523b36d6dc75e87d3b761dbd8fc98777cba37f9c0a096ef0c1f80c5ca8e0eea659946463ac3cad187d51e64fd6757436d619041f39d16b8316c71c83186da2d664b5a114dad53c8dd86fab8ad65222e521c72fa9e5fd4069f9101c7ea510eb1f74e3a024f8762b41f3751b42b37083895d0a7f5971cf3610e72db128f25f40ac4913524293c5881dd3fdd822c74b39d7ae565f97036e1cd2c863fe0bafae7ac5065f0828f2b7b7b91c630516c8220684b9db35b19e5c044dee02aed36d5c96a1eb6a38d619d84897e282b5bbeb5368e7f864aed0f462a9edc4f6b737274b7f1b44e6db2c783c";

console.log("Downloading logs via HTTPS...");
https.get(url, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const encoding = res.headers['content-encoding'];
    console.log("Response encoding:", encoding);
    
    let result = buffer;
    if (encoding === 'br') {
      console.log("Decompressing Brotli...");
      result = zlib.brotliDecompressSync(buffer);
    } else if (encoding === 'gzip') {
      console.log("Decompressing Gzip...");
      result = zlib.gunzipSync(buffer);
    } else if (encoding === 'deflate') {
      console.log("Decompressing Deflate...");
      result = zlib.inflateSync(buffer);
    } else {
      // In case content-encoding header is missing but data is Brotli
      try {
        console.log("Trying fallback Brotli decompression...");
        result = zlib.brotliDecompressSync(buffer);
      } catch (err) {
        console.log("Fallback Brotli decompression failed, treating as raw data");
      }
    }
    
    fs.writeFileSync('eas_build_log_decompressed.txt', result);
    console.log("Saved decompressed logs to eas_build_log_decompressed.txt");
  });
}).on('error', (err) => {
  console.error("Download error:", err);
});
