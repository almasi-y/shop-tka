import { LoaderCircle } from "lucide-react";
import { cn } from "cn";

type SpinnerProps = React.ComponentProps<typeof LoaderCircle>;

export function Spinner({ className, ...props }: SpinnerProps) {
  return <LoaderCircle className={cn("animate-spin", className)} {...props} />;
}
