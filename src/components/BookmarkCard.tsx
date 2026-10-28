"use client";

import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import type { Bookmark } from "@/lib/bookmarks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Favicon, { hostOf } from "./Favicon";

interface Props {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
}

/** 单张书签卡片（shadcn Card）：favicon + 标题外链 + 描述 + 标签 Badge + 编辑按钮 */
export default function BookmarkCard({ bookmark, onEdit }: Props) {
  const host = hostOf(bookmark.url);

  return (
    <Card className="group h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <Favicon url={bookmark.url} title={bookmark.title} />
          <CardTitle className="min-w-0 truncate text-base">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              title={bookmark.url}
            >
              <span className="truncate">{bookmark.title}</span>
              <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
            </a>
          </CardTitle>
        </div>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="编辑"
            onClick={() => onEdit(bookmark)}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <PencilIcon />
          </Button>
        </CardAction>
        <CardDescription className="truncate">{host || bookmark.url}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {bookmark.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {bookmark.description}
          </p>
        ) : null}

        {bookmark.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
