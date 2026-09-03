import { env } from "cloudflare:workers";
import { importPKCS8, SignJWT } from "jose";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

async function getServiceAccount(): Promise<ServiceAccount | null> {
  const json = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    return JSON.parse(json) as ServiceAccount;
  } catch {
    return null;
  }
}

let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function getDriveToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }

  const sa = await getServiceAccount();
  if (!sa) return null;

  try {
    const privateKey = await importPKCS8(sa.private_key, "RS256");
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const jwt = await new SignJWT({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp,
      iat,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .sign(privateKey);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      console.error("Failed to get Google Drive token:", await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  } catch (error) {
    console.error("Error creating Google Drive token:", error);
    return null;
  }
}

export function extractFolderIdFromUrl(url: string): string | null {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function ensureDemandFolder(clientDriveUrl: string, demandName: string): Promise<string | null> {
  const token = await getDriveToken();
  if (!token) return null;

  const parentFolderId = extractFolderIdFromUrl(clientDriveUrl);
  if (!parentFolderId) return null;

  // Verifica se já existe a pasta da demanda
  const query = encodeURIComponent(`'${parentFolderId}' in parents and name = '${demandName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json() as any;
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Cria a pasta
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: demandName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  if (createRes.ok) {
    const data = await createRes.json() as any;
    return data.id;
  }

  console.error("Failed to create demand folder:", await createRes.text());
  return null;
}

export async function uploadFileToDrive(folderId: string, file: File, fileName: string): Promise<string | null> {
  const token = await getDriveToken();
  if (!token) return null;

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (res.ok) {
    const data = await res.json() as any;
    return data.webViewLink; // Retorna o link para visualizar o arquivo
  }

  console.error("Failed to upload file to drive:", await res.text());
  return null;
}
