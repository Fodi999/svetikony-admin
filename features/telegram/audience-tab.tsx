"use client";

import { useQuery } from "@tanstack/react-query";
import { StateMessage } from "@/components/feedback/state-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { errorMessageFor } from "@/lib/api/errors";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA");
}

export function AudienceTab() {
  const usersQuery = useQuery({ queryKey: ["telegram", "users"], queryFn: () => apiClient.telegram.listUsers() });
  const chatsQuery = useQuery({ queryKey: ["telegram", "chats"], queryFn: () => apiClient.telegram.listChats() });

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Користувачі ({usersQuery.data?.length ?? "…"})</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : usersQuery.isError ? (
            <StateMessage variant="error" title="Помилка" description={errorMessageFor(usersQuery.error)} />
          ) : usersQuery.data && usersQuery.data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Ім&apos;я</TableHead>
                    <TableHead>Мова</TableHead>
                    <TableHead>Підключився</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username ? `@${user.username}` : "—"}</TableCell>
                      <TableCell>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell>{user.languageCode ?? "—"}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ще ніхто не писав боту.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Чати ({chatsQuery.data?.length ?? "…"})</CardTitle>
        </CardHeader>
        <CardContent>
          {chatsQuery.isLoading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : chatsQuery.isError ? (
            <StateMessage variant="error" title="Помилка" description={errorMessageFor(chatsQuery.error)} />
          ) : chatsQuery.data && chatsQuery.data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Назва / username</TableHead>
                    <TableHead>Підключено</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chatsQuery.data.map((chat) => (
                    <TableRow key={chat.id}>
                      <TableCell>{chat.chatType}</TableCell>
                      <TableCell>{chat.title || (chat.username ? `@${chat.username}` : "—")}</TableCell>
                      <TableCell>{formatDate(chat.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ще немає жодного чату.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
