import { FolderPicker } from "@/components/FolderPicker";
import type { AnalyzeRequest } from "@/lib/analyze-contract";

interface Props {
  onPicked: (req: AnalyzeRequest, files: Map<string, File>) => void;
  onError: (message: string) => void;
  error: string | null;
}

export function EntryScreen({ onPicked, onError, error }: Props) {
  return (
    <div className="entry">
      <div className="card">
        <div className="brand" style={{ fontSize: 13 }}><span className="mark" /> Stack Explorer</div>
        <h2>Point at a codebase</h2>
        <p>Select a project directory and Stack Explorer maps its architecture — every technology, why it was chosen, and what you could have used instead.</p>
        <FolderPicker onPicked={onPicked} onError={onError} />
        {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}
