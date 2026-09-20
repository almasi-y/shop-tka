import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";
import { Button, buttonVariants } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    icon?: LucideIcon;
  };
  size?: "sm" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Empty>
      <EmptyMedia variant="icon">
        <Icon />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action?.href && (
        <Link href={action.href} className={buttonVariants()}>
          {action.label}
        </Link>
      )}
      {action?.onClick && (
        <Button onClick={action.onClick} disabled={action.disabled}>
          {action.icon && <action.icon />}
          {action.label}
        </Button>
      )}
    </Empty>
  );
}
