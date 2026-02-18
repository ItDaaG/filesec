import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  label: string;
  pendingText: string;
  className?: string;
}

export const SubmitButton = ({ label, pendingText, className }: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending} 
      className={className ?? "w-full"}
    >
      {pending ? pendingText : label}
    </Button>
  );
};