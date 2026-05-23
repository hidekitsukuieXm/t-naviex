'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type Permissions,
  type PermissionAction,
  type ResourceType,
  RESOURCE_TYPE_LABELS,
  PERMISSION_ACTION_LABELS,
} from '@/types/role';

const RESOURCES: ResourceType[] = [
  'projects',
  'users',
  'roles',
  'testCases',
  'testRuns',
  'testResults',
  'bugs',
  'reports',
  'settings',
];

const ACTIONS: PermissionAction[] = ['create', 'read', 'update', 'delete'];

interface PermissionMatrixProps {
  permissions: Permissions;
  onChange?: (permissions: Permissions) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function PermissionMatrix({
  permissions,
  onChange,
  disabled = false,
  readOnly = false,
}: PermissionMatrixProps) {
  const hasPermission = (resource: ResourceType, action: PermissionAction): boolean => {
    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;
    return resourcePermissions.includes(action);
  };

  const togglePermission = (resource: ResourceType, action: PermissionAction) => {
    if (readOnly || disabled || !onChange) return;

    const newPermissions = { ...permissions };
    const resourcePermissions = newPermissions[resource] || [];

    if (resourcePermissions.includes(action)) {
      newPermissions[resource] = resourcePermissions.filter((a) => a !== action);
      if (newPermissions[resource]?.length === 0) {
        delete newPermissions[resource];
      }
    } else {
      newPermissions[resource] = [...resourcePermissions, action];
    }

    onChange(newPermissions);
  };

  const toggleResourceAll = (resource: ResourceType) => {
    if (readOnly || disabled || !onChange) return;

    const newPermissions = { ...permissions };
    const resourcePermissions = newPermissions[resource] || [];
    const allSelected = ACTIONS.every((action) => resourcePermissions.includes(action));

    if (allSelected) {
      delete newPermissions[resource];
    } else {
      newPermissions[resource] = [...ACTIONS];
    }

    onChange(newPermissions);
  };

  const toggleActionAll = (action: PermissionAction) => {
    if (readOnly || disabled || !onChange) return;

    const newPermissions = { ...permissions };
    const allSelected = RESOURCES.every((resource) => {
      const resourcePermissions = newPermissions[resource] || [];
      return resourcePermissions.includes(action);
    });

    RESOURCES.forEach((resource) => {
      const resourcePermissions = newPermissions[resource] || [];
      if (allSelected) {
        newPermissions[resource] = resourcePermissions.filter((a) => a !== action);
        if (newPermissions[resource]?.length === 0) {
          delete newPermissions[resource];
        }
      } else {
        if (!resourcePermissions.includes(action)) {
          newPermissions[resource] = [...resourcePermissions, action];
        }
      }
    });

    onChange(newPermissions);
  };

  const isResourceAllSelected = (resource: ResourceType): boolean => {
    const resourcePermissions = permissions[resource] || [];
    return ACTIONS.every((action) => resourcePermissions.includes(action));
  };

  const isActionAllSelected = (action: PermissionAction): boolean => {
    return RESOURCES.every((resource) => {
      const resourcePermissions = permissions[resource] || [];
      return resourcePermissions.includes(action);
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">リソース</TableHead>
            {ACTIONS.map((action) => (
              <TableHead key={action} className="w-20 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs">{PERMISSION_ACTION_LABELS[action]}</span>
                  {!readOnly && (
                    <Checkbox
                      checked={isActionAllSelected(action)}
                      onCheckedChange={() => toggleActionAll(action)}
                      disabled={disabled}
                      aria-label={`${PERMISSION_ACTION_LABELS[action]}をすべて選択`}
                    />
                  )}
                </div>
              </TableHead>
            ))}
            {!readOnly && <TableHead className="w-20 text-center">すべて</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {RESOURCES.map((resource) => (
            <TableRow key={resource}>
              <TableCell className="font-medium">{RESOURCE_TYPE_LABELS[resource]}</TableCell>
              {ACTIONS.map((action) => (
                <TableCell key={action} className="text-center">
                  <Checkbox
                    checked={hasPermission(resource, action)}
                    onCheckedChange={() => togglePermission(resource, action)}
                    disabled={disabled || readOnly}
                    aria-label={`${RESOURCE_TYPE_LABELS[resource]}の${PERMISSION_ACTION_LABELS[action]}`}
                  />
                </TableCell>
              ))}
              {!readOnly && (
                <TableCell className="text-center">
                  <Checkbox
                    checked={isResourceAllSelected(resource)}
                    onCheckedChange={() => toggleResourceAll(resource)}
                    disabled={disabled}
                    aria-label={`${RESOURCE_TYPE_LABELS[resource]}をすべて選択`}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
