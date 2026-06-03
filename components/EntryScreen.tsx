"use client";

import { useState } from "react";
import { FolderPicker } from "@/components/FolderPicker";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { DEMOS, type DemoEntry } from "@/lib/demo";

interface Props {
  onPicked: (req: AnalyzeRequest, files: Map<string, File>) => void;
  onDemo: (demo: DemoEntry) => void;
  onError: (message: string) => void;
  error: string | null;
}

export function EntryScreen({ onPicked, onDemo, onError, error }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="entry">
      <div className="card">
        <div className="brand" style={{ fontSize: 13 }}><span className="mark" /> Stack Explorer</div>
        <h2>Point at a codebase</h2>
        <p>Select a project directory and Stack Explorer maps its tech stack and systems architecture.</p>
        <FolderPicker onPicked={onPicked} onError={onError} />
        {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

        <div className="samples">
          <span className="samples-label mono">or explore a sample</span>
          {DEMOS.map((d) => (
            <button key={d.slug} type="button" className="sample-chip" onClick={() => onDemo(d)}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="disclosure">
          <span><strong>Your code mostly stays on your device.</strong></span>{" "}
          <span className="disclosure-anchor">
            <button type="button" className="link-btn" onClick={() => setShowDetail((s) => !s)} aria-expanded={showDetail}>
              What&apos;s sent? {showDetail ? "▾" : "▸"}
            </button>
            {showDetail && (
              <div className="disclosure-popover">
                Stack Explorer reads the folder in your browser and sends only your
                dependency/config manifests (e.g. <span className="mono">package.json</span>) and the
                list of file paths to the Claude API to analyze the stack. Your source file contents
                are <strong>not</strong> uploaded — file previews are read locally in your browser.
                Nothing is stored on our servers after your session.
              </div>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
