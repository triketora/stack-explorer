/* Stack Explorer — main app */
const { useState: useS, useEffect: useE, useRef: useR, useCallback: useCb } = React;

const ACCENTS = {
  blue:   ["#3a5bd9", "#2c40a8", "#eef1fd", "#adbdf0"],
  violet: ["#7b3fd4", "#5d2ea6", "#f3edfd", "#c9aef0"],
  teal:   ["#1a8497", "#14687a", "#e7f5f8", "#9bd2dd"],
  amber:  ["#b9791a", "#8a5e13", "#faf1e2", "#e9c690"],
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "layered",
  "accent": "blue",
  "density": "comfortable"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [analyzed, setAnalyzed] = useS(() => localStorage.getItem("se_analyzed_v1") === "1");
  const [scanning, setScanning] = useS(false);
  const [mode, setMode] = useS("arch");           // arch | code
  const [activeNode, setActiveNode] = useS(null);  // drilldown target
  const [hoverNodeId, setHoverNodeId] = useS(null);
  const [fileMaps, setFileMaps] = useS(null);      // node ids highlighted from a hovered file
  const [bump, setBump] = useS(0);

  const canvasRef = useR(null);
  const nodeEls = useR(new Map());
  const registerNode = useCb((id, el) => {
    if (el) nodeEls.current.set(id, el); else nodeEls.current.delete(id);
  }, []);

  // apply visual tweaks to :root
  useE(() => {
    const root = document.documentElement;
    const a = ACCENTS[t.accent] || ACCENTS.blue;
    root.style.setProperty("--accent", a[0]);
    root.style.setProperty("--accent-ink", a[1]);
    root.style.setProperty("--accent-wash", a[2]);
    root.style.setProperty("--accent-edge", a[3]);
    root.setAttribute("data-density", t.density === "compact" ? "compact" : "comfortable");
  }, [t.accent, t.density]);

  // recompute edges when layout/mode/density change
  useE(() => { setBump((b) => b + 1); }, [t.layout, t.density, mode, analyzed]);

  // esc closes drilldown
  useE(() => {
    const h = (e) => { if (e.key === "Escape") setActiveNode(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const analyze = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setAnalyzed(true);
      localStorage.setItem("se_analyzed_v1", "1");
    }, 1500);
  };

  const onNodeClick = (n) => setActiveNode((cur) => (cur && cur.id === n.id ? null : n));

  const fileHits = fileMaps ? new Set(fileMaps) : null;
  const common = {
    registerNode,
    activeId: activeNode ? activeNode.id : null,
    relatedIds: [],
    onClick: onNodeClick,
    onHover: setHoverNodeId,
    mapDim: mode === "code" && !!fileMaps,
    fileHits,
  };

  const edgeFocus = hoverNodeId || (activeNode ? activeNode.id : null);

  return (
    <div className="app">
      {/* top bar */}
      <header className="topbar">
        <div className="brand"><span className="mark" /> Stack Explorer</div>
        <div className="repo-chip">
          <span className="dot" /><b>{STACK.repo}</b>
          <span style={{ opacity: 0.6 }}>· {STACK.branch} · {STACK.files} files</span>
        </div>
        <div className="spacer" />
        <div className="seg" role="group" aria-label="View mode">
          <button aria-pressed={mode === "arch"} onClick={() => setMode("arch")}>
            <Icon name="layers" /> Architecture
          </button>
          <button aria-pressed={mode === "code"} onClick={() => setMode("code")}>
            <Icon name="map" /> Codebase map
          </button>
        </div>
        <button className="btn-ghost" onClick={() => { localStorage.removeItem("se_analyzed_v1"); setAnalyzed(false); setActiveNode(null); setMode("arch"); }}>
          <Icon name="folder" /> New directory
        </button>
      </header>

      {/* work area */}
      <div className={"work" + (mode === "code" ? " split" : "")}>
        <div className="canvas-wrap">
          <Diagram layout={t.layout}
            common={common}
            edgeFocus={edgeFocus}
            canvasRef={canvasRef} nodeEls={nodeEls} bump={bump} />
        </div>

        {mode === "code" && (
          <FileTreePane
            activeNodeId={activeNode ? activeNode.id : null}
            hoverNodeId={hoverNodeId}
            onHoverFile={(maps) => setFileMaps(maps && maps.length ? maps : null)}
            onClickFile={(f) => { if (f.maps && f.maps.length) { const n = NODE_BY_ID[f.maps[0]]; if (n) setActiveNode(n); } }}
          />
        )}

        <Drilldown node={activeNode} onClose={() => setActiveNode(null)}
          onOpenFile={() => setMode("code")} />
      </div>

      {/* entry / analyze overlay */}
      {!analyzed && (
        <div className="entry">
          <div className="card">
            {scanning && <div className="scan-line" />}
            <div className="brand" style={{ fontSize: 13 }}><span className="mark" /> Stack Explorer</div>
            <h2>Point at a codebase</h2>
            <p>Select a project directory and Stack Explorer maps its architecture — every technology, why it was chosen, and what you could have used instead.</p>
            <div className="drop" onClick={analyze}>
              {scanning
                ? <span>analyzing <b>{STACK.repo}</b> — reading {STACK.files} files…</span>
                : <span>drop a folder here, or click to choose a directory ↵</span>}
            </div>
            <div className="samples">
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", alignSelf: "center", marginRight: 4 }}>samples:</span>
              <button onClick={analyze}>react + flask + mysql</button>
              <button onClick={analyze} disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>next.js + postgres</button>
              <button onClick={analyze} disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>node + mongo</button>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Diagram" />
        <TweakRadio label="Layout" value={t.layout}
          options={["layered", "flow", "nested"]}
          onChange={(v) => setTweak("layout", v)} />
        <TweakSection label="Appearance" />
        <TweakColor label="Accent" value={ACCENTS[t.accent] || ACCENTS.blue}
          options={[ACCENTS.blue, ACCENTS.violet, ACCENTS.teal, ACCENTS.amber]}
          onChange={(arr) => {
            const key = Object.keys(ACCENTS).find((k) => ACCENTS[k][0] === arr[0]) || "blue";
            setTweak("accent", key);
          }} />
        <TweakRadio label="Density" value={t.density}
          options={["comfortable", "compact"]}
          onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
Object.assign(window, { App });
