export const permissionKeys = ["clients.view", "clients.manage", "demands.create", "demands.execute", "crm.access", "finance.access"] as const;

export type PermissionKey = typeof permissionKeys[number];

export const rolePermissionDefaults: Record<string, PermissionKey[]> = {
  manager: [...permissionKeys],
  admin: [...permissionKeys],
  editor: ["clients.view", "demands.create", "demands.execute"],
  viewer: ["clients.view"],
};

export function effectivePermissions(role: string, explicit: string[] | null = null): PermissionKey[] {
  if (role === "manager" || role === "admin") return [...permissionKeys];
  return explicit === null ? (rolePermissionDefaults[role] ?? []) : permissionKeys.filter((permission) => explicit.includes(permission));
}

export const professionLabels: Record<string,string> = {
  designer:"Designer", social:"Social media", copywriter:"Redator(a)", video_editor:"Editor(a) de vídeo", traffic:"Gestor(a) de tráfego", account:"Atendimento", manager:"Gestão", other:"Outra profissão",
};
export const roleLabels: Record<string,string> = {manager:"Proprietário",admin:"Administrador",editor:"Editor",viewer:"Leitor"};

export function hasPermission(role: string, explicit: string[], permission: PermissionKey) {
  return effectivePermissions(role, explicit).includes(permission);
}
