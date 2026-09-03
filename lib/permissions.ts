export const permissionKeys = ["clients.view", "clients.manage", "demands.create", "demands.execute", "crm.access", "finance.access"] as const;

export type PermissionKey = typeof permissionKeys[number];

export const rolePermissionDefaults: Record<string, PermissionKey[]> = {
  manager: [...permissionKeys],
  admin: [...permissionKeys],
  social: ["clients.view", "clients.manage", "demands.create"],
  designer: ["clients.view", "demands.execute"],
  copywriter: ["clients.view", "demands.execute"],
  video_editor: ["clients.view", "demands.execute"],
  collaborator: ["clients.view", "demands.execute"],
  client: ["clients.view"],
};

export function effectivePermissions(role: string, explicit: string[]): PermissionKey[] {
  if (role === "manager" || role === "admin") return [...permissionKeys];
  return explicit.length ? permissionKeys.filter((permission) => explicit.includes(permission)) : (rolePermissionDefaults[role] ?? []);
}

export function hasPermission(role: string, explicit: string[], permission: PermissionKey) {
  return effectivePermissions(role, explicit).includes(permission);
}
