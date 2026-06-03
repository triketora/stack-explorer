"use client";

import type { Technology, Alternative } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Props {
  node: Technology | null;
  rationale: string;
  alts: Alternative[];
  altStatus: "idle" | "loading" | "ready" | "error";
  fileCount: number;
  onRetryAlts: () => void;
  onShowInCode: () => void;
  onClose: () => void;
}

export function Drilldown({ node, rationale, alts, altStatus, fileCount, onRetryAlts, onShowInCode, onClose }: Props) {
  const open = !!node;

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
              <div className="rationale">
                <span className="lead">why it&apos;s here</span>
                {rationale || node.rationale || (altStatus === "loading" ? <span className="mono" style={{ color: "var(--ink-3)" }}>analyzing…</span> : "")}
              </div>

              {fileCount > 0 && (
                <button type="button" className="show-in-code" onClick={onShowInCode}>
                  <Icon name="map" style={{ width: 14, height: 14 }} />
                  See where it&apos;s used in the Code map ({fileCount})
                </button>
              )}

              <div className="sec-label">Alternatives &amp; tradeoffs</div>

              <div className="alt current">
                <div className="alt-head">
                  <span className="alt-name">{node.name}<span className="mono-mini">{node.cat}</span></span>
                  <span className="badge-current">current</span>
                </div>
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
