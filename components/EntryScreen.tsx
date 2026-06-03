"use client";

import { useState } from "react";
import { FolderPicker } from "@/components/FolderPicker";
import type { AnalyzeRequest } from "@/lib/analyze-contract";

interface Props {
  onPicked: (req: AnalyzeRequest, files: Map<string, File>) => void;
  onError: (message: string) => void;
  error: string | null;
}

export function EntryScreen({ onPicked, onError, error }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="entry">
      <div className="card">
        <div className="brand" style={{ fontSize: 13 }}><span className="mark" /> Stack Explorer</div>
        <h2>Point at a codebase</h2>
        <p>Select a project directory and Stack Explorer maps its architecture — every technology, why it was chosen, and what you could have used instead.</p>
        <FolderPicker onPicked={onPicked} onError={onError} />
        {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

        <div className="disclosure">
          <span><strong>Your code mostly stays on your device.</strong></span>{" "}
          <button type="button" className="link-btn" onClick={() => setShowDetail((s) => !s)}>
            What&apos;s sent? {showDetail ? "▾" : "▸"}
          </button>
          {showDetail && (
            <p className="disclosure-detail">
              Stack Explorer reads the folder in your browser and sends only your
              dependency/config manifests (e.g. <span className="mono">package.json</span>) and the
              list of file paths to the Claude API to analyze the stack. Your source file contents
              are <strong>not</strong> uploaded — file previews are read locally in your browser.
              Nothing is stored on our servers after your session.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
