import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { columns, type UserTableData } from "@/components/Admin/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"

function UsersTableContent() {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery({
    queryKey: ["users"],
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
  })

  const tableData: UserTableData[] = users.data.map((user: UserPublic) => ({
    ...user,
    isCurrentUser: currentUser?.id === user.id,
  }))

  return <DataTable columns={columns} data={tableData} />
}

export function UsersView() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">
          Manage user accounts, roles and permissions.
        </p>
        <AddUser />
      </div>
      <Suspense fallback={<PendingUsers />}>
        <UsersTableContent />
      </Suspense>
    </div>
  )
}
