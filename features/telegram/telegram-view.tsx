"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudienceTab } from "./audience-tab";
import { AutopostTab } from "./autopost-tab";
import { ContentPlanTab } from "./content-plan/content-plan-tab";
import { DashboardTab } from "./dashboard-tab";
import { PostsTab } from "./posts-tab";
import { TodayTab } from "./today-tab";

export function TelegramView() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Telegram</h1>
        <p className="text-sm text-muted-foreground">Бот та канал «Світло Ікони».</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="audience">Аудиторія</TabsTrigger>
          <TabsTrigger value="today">Сьогодні</TabsTrigger>
          <TabsTrigger value="posts">Публікації</TabsTrigger>
          <TabsTrigger value="autopost">Автопублікація</TabsTrigger>
          <TabsTrigger value="content-plan">Контент-план</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="audience">
          <AudienceTab />
        </TabsContent>
        <TabsContent value="today">
          <TodayTab />
        </TabsContent>
        <TabsContent value="posts">
          <PostsTab />
        </TabsContent>
        <TabsContent value="autopost">
          <AutopostTab />
        </TabsContent>
        <TabsContent value="content-plan">
          <ContentPlanTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
