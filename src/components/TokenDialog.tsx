"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
  error: string | null;
  onSave: (token: string) => void;
  onClose: () => void;
}

/**
 * 填写 read token 的弹层（shadcn Dialog）。token 只存在浏览器 localStorage，服务端不保存。
 * 输入框初始为空由 useState 初始值保证；父组件按需挂载，每次打开都是新实例。
 */
export default function TokenDialog({ error, onSave, onClose }: Props) {
  const [value, setValue] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>输入 read token</DialogTitle>
          <DialogDescription>
            编辑书签需要 read token（服务端环境变量 NAV_TOKEN）。它只保存在这台浏览器的
            localStorage 里。
          </DialogDescription>
        </DialogHeader>

        <Input
          type="password"
          value={value}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) onSave(value.trim());
          }}
          placeholder="粘贴 NAV_TOKEN"
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => onSave(value.trim())} disabled={!value.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
