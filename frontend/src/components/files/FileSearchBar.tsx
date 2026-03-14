import { Input } from "@/components/ui/input";

interface FileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const FileSearchBar = ({
  value,
  onChange,
  placeholder = "Search files and folders...",
}: FileSearchBarProps) => {
  return (
    <div className="max-w-sm">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full"
      />
    </div>
  );
};