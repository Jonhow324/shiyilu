"use client";

import { SearchIcon, TagIcon } from "lucide-react";
import type { TagCount } from "@/lib/bookmarks";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface Props {
  tags: TagCount[];
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

/** 左侧栏（shadcn Sidebar）：搜索框 + 标签过滤（带计数，可多选，AND 语义） */
export default function NavSidebar({
  tags,
  selected,
  query,
  onQueryChange,
  onToggleTag,
  onClear,
}: Props) {
  const hasFilter = selected.length > 0 || query.trim().length > 0;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            id="nav-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索标题或描述…"
            className="pl-8"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>标签</SidebarGroupLabel>
          <SidebarGroupContent>
            {tags.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">还没有标签</p>
            ) : (
              <SidebarMenu>
                {tags.map(({ tag, count }) => (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton
                      isActive={selected.includes(tag)}
                      onClick={() => onToggleTag(tag)}
                      tooltip={tag}
                    >
                      <TagIcon />
                      <span className="truncate">{tag}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{count}</SidebarMenuBadge>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {hasFilter ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onClear}>
                    <span>清除筛选</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
