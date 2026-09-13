"use strict";
/**
 * Authorization Service
 * Checks user permissions based on role.
 *
 * RULE: This is a standalone module with no external dependencies.
 * It can be used by any domain service or UI component.
 *
 * RULE: This is a CLIENT-SIDE authorization boundary.
 * In a production system with a real backend, each API endpoint
 * would independently verify authorization server-side.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permissions = void 0;
exports.hasPermission = hasPermission;
exports.requirePermission = requirePermission;
exports.hasAllPermissions = hasAllPermissions;
exports.canCreate = canCreate;
exports.canPost = canPost;
exports.canDelete = canDelete;
exports.canView = canView;
exports.canExport = canExport;
const rbac_1 = require("../types/rbac");
var rbac_2 = require("../types/rbac");
Object.defineProperty(exports, "Permissions", { enumerable: true, get: function () { return rbac_2.Permissions; } });
/**
 * Check if a role has a specific permission.
 */
function hasPermission(role, permission) {
    const rolePermissions = rbac_1.SYSTEM_ROLES[role];
    if (!rolePermissions) {
        return false;
    }
    return rolePermissions.includes(permission);
}
/**
 * Require a specific permission. Throws if not authorized.
 * Use this at the start of mutation methods.
 */
function requirePermission(role, permission) {
    if (!hasPermission(role, permission)) {
        const roleName = role;
        throw new Error(`Unauthorized: role "${roleName}" does not have permission "${permission}".`);
    }
}
/**
 * Check multiple permissions (user must have ALL).
 */
function hasAllPermissions(role, permissions) {
    return permissions.every(p => hasPermission(role, p));
}
/**
 * Check if user can perform a mutation operation on a module.
 * Maps CRUD operations to permissions.
 */
function canCreate(role, module) {
    const perm = `${module}.create`;
    return hasPermission(role, perm);
}
function canPost(role, module) {
    const perm = `${module}.post`;
    return hasPermission(role, perm);
}
function canDelete(role, module) {
    const perm = `${module}.delete`;
    return hasPermission(role, perm);
}
function canView(role, module) {
    const perm = `${module}.view`;
    return hasPermission(role, perm);
}
function canExport(role, module) {
    const perm = `${module}.export`;
    return hasPermission(role, perm);
}
