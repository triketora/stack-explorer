"use client";

import { useState } from "react";
import type { Technology, Alternative } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Props {
  node: Technology | null;
  fileHandles: Map<string, File>;
  alts: Alternative[];
  altStatus: "idle" | "loading" | "ready" | "error";
  onRetryAlts: () => void;
  onClose: () => void;
}

export function Drilldown({ node, fileHandles, alts, altStatus, onRetryAlts, onClose }: Props) {
  const open = !!node;
  const [preview, setPreview] = useState<{ path: string; text: string } | null>(null);

  async function openFile(path: string) {
    const clean = path.replace(/\/$/, "");
    const handle = fileHandles.get(clean);
    if (!handle) { setPreview({ path: clean, text: "(file contents unavailable)" }); return; }
    const text = await handle.text();
    setPreview({ path: clean, text: text.slice(0, 20000) });
  }

  return (
    <>
      <div className={"panel-scrim" + (open ? " show" : "")} onClick={onClose} />
      <aside className={"panel" + (open ? " show" : "")} aria-hidden={!open}>
        {node && (
          <>
            <div className="panel-head">
              <button className="panel-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
              <div className="eyebrow"><span className="idx-dot" />compare technology</div>
              <div className="title-row">
                <span className="glyph-lg">{node.glyph}</span>
                <div><h2>{node.name}</h2><span className="cat2">{node.cat}</span></div>
              </div>
              <div className="tags">{node.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            </div>

            <div className="panel-body">
              <div className="rationale"><span className="lead">why it&apos;s here</span>{node.rationale}</div>

              <div className="sec-label">Maps to code</div>
              <div className="files-list">
                {node.files.map((f) => {
                  const dir = f.endsWith("/");
                  return (
                    <div key={f} className="file-line" onClick={() => !dir && openFile(f)}>
                      <Icon name={dir ? "folder" : "file"} style={{ width: 14, height: 14 }} />
                      <span>{f}</span>
                    </div>
                  );
                })}
              </div>

              {preview && (
                <pre className="file-preview" style={{ maxHeight: 220, overflow: "auto", fontFamily: "var(--mono)", fontSize: 12, background: "var(--surface-2)", padding: 10, borderRadius: 6 }}>
                  <div className="sec-label">{preview.path}</div>
                  {preview.text}
                </pre>
              )}

              <div className="sec-label">Alternatives &amp; tradeoffs</div>

              <div className="alt current">
                <div className="alt-head">
                  <span className="alt-name">{node.name}<span className="mono-mini">{node.cat}</span></span>
                  <span className="badge-current">current</span>
                </div>
                <div className="alt-blurb">{node.rationale}</div>
              </div>

              {(altStatus === "loading" || altStatus === "idle") && (
                <div className="alt-loading mono">finding alternatives…</div>
              )}
              {altStatus === "error" && (
                <div className="alt-error">
                  couldn&apos;t load alternatives.{" "}
                  <button className="link-btn" onClick={onRetryAlts}>Retry</button>
                </div>
              )}

              {alts.map((a) => (
                <div key={a.name} className="alt">
                  <div className="alt-head"><span className="alt-name">{a.name}<span className="mono-mini">{a.tag}</span></span></div>
                  <div className="alt-blurb">{a.blurb}</div>
                  <div className="pc">
                    <div className="pros"><div className="col-label">Pros</div><ul>{a.pros.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                    <div className="cons"><div className="col-label">Cons</div><ul>{a.cons.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
                  </div>
                  <div className="when"><b>when to choose</b>{a.when}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
