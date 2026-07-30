import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { AdminLayout } from '../../layouts/admin-layout'
import {
  useUsers,
  useUpdateRole,
  useToggleActive,
  useDeleteUser,
  type AdminUser,
} from '../../hooks/use-admin'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../components/ui/table'
import { Toggle } from '../../components/ui/toggle'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { useAuth } from '../../hooks/use-auth'
import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: AdminUsers,
})

function AdminUsers() {
  const { data: users, isLoading } = useUsers()
  const { user: currentUser } = useAuth()
  const updateRole = useUpdateRole()
  const toggleActive = useToggleActive()
  const deleteUser = useDeleteUser()
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  function handleRoleChange(u: AdminUser, roleName: string) {
    setChangingRole(u.id)
    updateRole.mutate(
      { userId: u.id, roleName },
      { onSettled: () => setChangingRole(null) },
    )
  }

  function handleToggleActive(u: AdminUser) {
    toggleActive.mutate({ userId: u.id })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    const u = deleteTarget
    setDeleteTarget(null)
    setDeleting(u.id)
    deleteUser.mutate(
      { userId: u.id },
      { onSettled: () => setDeleting(null) },
    )
  }

  return (
    <AdminLayout>
    <ConfirmDialog
      open={!!deleteTarget}
      title="Delete user"
      message={
        deleteTarget
          ? `Are you sure you want to delete ${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.email})? This cannot be undone.`
          : ''
      }
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={handleDeleteConfirm}
      onCancel={() => setDeleteTarget(null)}
    />
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Users</h1>
        <p className="mt-0.5 text-sm text-text-muted">Manage platform users</p>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 animate-shimmer rounded-lg" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Username</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.firstName} {u.lastName}
                </TableCell>
                <TableCell className="text-text-muted">{u.email}</TableCell>
                <TableCell className="text-text-muted">@{u.username}</TableCell>
                <TableCell>
                  <select
                    value={u.role}
                    disabled={u.id === currentUser?.id || changingRole === u.id}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                    className="cursor-pointer rounded-md border border-border bg-page px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="user">user</option>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={u.isActive}
                      onChange={() => handleToggleActive(u)}
                      disabled={u.id === currentUser?.id}
                    />
                    <span className={`text-xs ${u.isActive ? 'text-success' : 'text-text-muted'}`}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    disabled={u.id === currentUser?.id || deleting === u.id}
                    className="rounded-lg p-1.5 text-text-muted transition-all duration-150 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                    title="Delete user"
                  >
                    <Trash size={16} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
    </AdminLayout>
  )
}
