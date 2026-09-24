import assert from "node:assert/strict";
import { test } from "node:test";
import { CLIENT_IMAGE_MAX_BYTES, CLIENT_IMAGE_MIME_TYPES, clientImageError } from "../lib/client-media-policy";
import { uploadFile } from "../lib/upload-client";

test("Imagens de cliente: aceita formatos permitidos até 20 MB e rejeita o byte excedente", () => {
  assert.equal(CLIENT_IMAGE_MAX_BYTES,20*1024*1024);
  for (const type of CLIENT_IMAGE_MIME_TYPES) {
    assert.equal(clientImageError({type,size:CLIENT_IMAGE_MAX_BYTES}),null);
    assert.match(clientImageError({type,size:CLIENT_IMAGE_MAX_BYTES+1},"Banner do cliente")!,/Banner do cliente: o limite é 20 MB/);
  }
});

test("Imagens de cliente: recusa arquivos vazios, tamanho inválido e formato incompatível", () => {
  for(const size of [0,-1,NaN,Infinity,1.5]) assert(clientImageError({type:"image/png",size}));
  for(const type of ["image/svg+xml","application/pdf","image/heic",""]) assert.match(clientImageError({type,size:100})!,/JPG, PNG, WEBP ou GIF/);
});

test("Imagens de cliente: upload inválido não inicia requisição", async () => {
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error("Fixture should not reach network");};
  try {
    await assert.rejects(uploadFile("avatar","fixture",new File(["pdf"],"foto.pdf",{type:"application/pdf"})),/Foto do cliente: use/);
    await assert.rejects(uploadFile("banner","fixture",new File([],"banner.png",{type:"image/png"})),/não esteja vazio/);
    assert.equal(calls,0);
  } finally {globalThis.fetch=originalFetch;}
});
