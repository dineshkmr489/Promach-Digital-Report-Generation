import type { UserRole } from "./workspaceTypes";

export type RolePermission =
  | "field-service:use"
  | "master:manage"
  | "reports:operate"
  | "storage:view"
  | "users:manage";

const rolePermissions: Record<UserRole, readonly RolePermission[]> = {
  Administrator: [
    "field-service:use",
    "master:manage",
    "reports:operate",
    "storage:view",
    "users:manage",
  ],
  "Operations Manager": [
    "field-service:use",
    "master:manage",
    "reports:operate",
  ],
  "Service Technician": ["field-service:use", "reports:operate"],
  Viewer: [],
};

export function hasRolePermission(
  role: UserRole,
  permission: RolePermission,
): boolean {
  return rolePermissions[role].includes(permission);
}

export function permissionsForRole(role: UserRole): readonly RolePermission[] {
  return rolePermissions[role];
}
