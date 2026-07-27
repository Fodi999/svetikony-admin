import { MoreMenuList } from "@/components/layout/more-menu-list";

export default function MorePage() {
  return (
    <div className="space-y-4 p-4 md:hidden">
      <h1 className="text-lg font-semibold">Усі розділи</h1>
      <MoreMenuList />
    </div>
  );
}
