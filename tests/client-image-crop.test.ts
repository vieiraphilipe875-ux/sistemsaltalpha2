import assert from "node:assert/strict";
import { test } from "node:test";
import { CLIENT_IMAGE_CROP_SPECS, clientImageCropFilename, clientImageCropGeometry } from "../lib/client-image-crop";

test("Recorte: uma foto vertical cabe pela largura do banner sem deformação", () => {
  const crop = clientImageCropGeometry(1200, 1600, "banner");
  assert.deepEqual([crop.x, crop.y, crop.width, crop.height], [0, 650, 1200, 300]);
  assert.deepEqual([crop.outputWidth, crop.outputHeight], [1920, 480]);
  assert.equal(crop.outputWidth / crop.width, crop.outputHeight / crop.height);
});

test("Recorte: foto panorâmica preenche o avatar quadrado sem faixas vazias", () => {
  const crop = clientImageCropGeometry(2400, 600, "avatar");
  assert.deepEqual([crop.x, crop.y, crop.width, crop.height], [900, 0, 600, 600]);
  assert.equal(crop.outputWidth, 512);
  assert.equal(crop.outputHeight, 512);
  assert.equal(crop.overflowY, 0);
});

test("Recorte: os extremos de posição alcançam topo e base sem ultrapassar a imagem", () => {
  for (const [position, expectedY] of [[-2, 0], [0, 0], [1, 1300], [8, 1300]]) {
    const crop = clientImageCropGeometry(1200, 1600, "banner", 1, 0.5, position);
    assert.equal(crop.y, expectedY);
    assert(crop.y >= 0 && crop.y + crop.height <= 1600);
  }
});

test("Recorte: zoom proporcional amplia os dois eixos e mantém todas as bordas dentro da origem", () => {
  for (const kind of ["avatar", "banner"] as const) {
    const spec = CLIENT_IMAGE_CROP_SPECS[kind];
    for (const zoom of [0.3, 1, 1.75, 3, 20]) {
      for (const position of [0, 0.5, 1]) {
        const crop = clientImageCropGeometry(1920, 1080, kind, zoom, position, position);
        assert(Math.abs(crop.width / crop.height - spec.aspectRatio) < 1e-9);
        assert(crop.x >= 0 && crop.y >= 0);
        assert(crop.x + crop.width <= 1920 + 1e-9);
        assert(crop.y + crop.height <= 1080 + 1e-9);
      }
    }
    assert.deepEqual(clientImageCropGeometry(1920, 1080, kind, 20), clientImageCropGeometry(1920, 1080, kind, 3));
  }
});

test("Recorte: imagem sem dimensões válidas é recusada e controles inválidos voltam ao centro", () => {
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.throws(() => clientImageCropGeometry(invalid, 400, "avatar"), RangeError);
    assert.throws(() => clientImageCropGeometry(400, invalid, "banner"), RangeError);
  }
  assert.deepEqual(clientImageCropGeometry(1200, 1600, "banner", NaN, Infinity, NaN), clientImageCropGeometry(1200, 1600, "banner"));
});

test("Recorte: o arquivo final tem extensão PNG e preserva o nome sem caminhos ou sufixos repetidos", () => {
  assert.equal(clientImageCropFilename("Foto de capa.JPEG"), "Foto de capa-crop.png");
  assert.equal(clientImageCropFilename("C:\\arquivos\\cliente-crop.webp"), "cliente-crop.png");
  assert.equal(clientImageCropFilename(""), "imagem-crop.png");
});
