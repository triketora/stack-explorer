/* Stack Explorer — diagram components */
const { useState, useRef, useLayoutEffect, useEffect, useCallback } = React;

/* ---- tiny inline icons -------------------------------------------------- */
function Icon({ name, className }) {
  const p = {
    folder: "M3 5.5A1.5 1.5 0 0 1 4.5 4h3l1.5 1.8h6A1.5 1.5 0 0 1 16.5 7.3v8.2A1.5 1.5 0 0 1 15 17H4.5A1.5 1.5 0 0 1 3 15.5z",
    file: "M5 2.5h6l4 4v11A1.5 1.5 0 0 1 13.5 19h-9A1.5 1.5 0 0 1 3 17.5v-13A2 2 0 0 1 5 2.5z M11 2.5v4h4",
    chevron: "M7 4l6 6-6 6",
    layers: "M10 3l7 4-7 4-7-4 7-4z M3 13l7 4 7-4",
    flow: "M4 10h12 M12 6l4 4-4 4",
    box: "M10 2l7 4v8l-7 4-7-4V6z M3 6l7 4 7-4 M10 10v8",
    close: "M5 5l10 10 M15 5L5 15",
    map: "M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2z M8 3v14 M12 5v14",
    code: "M7 6l-4 4 4 4 M13 6l4 4-4 4",
    search: "M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3z M14 14l4 4",
  }[name];
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {p.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}

/* ---- a single technology node ------------------------------------------ */
function StackNode({ node, registerNode, active, dim, filehit, related, onClick, onHover }) {
  return (
    <button
      ref={(el) => registerNode(node.id, el)}
      className={"node" + (active ? " active" : "") + (dim ? " dim" : "") + (filehit ? " filehit" : "")}
      onClick={() => onClick(node)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="alt-count mono">{node.alts.length} alt</span>
      <span className="nrow">
        <span className="glyph">{node.glyph}</span>
        <span>
          <span className="nm" style={{ display: "block" }}>{node.name}</span>
          <span className="cat">{node.cat}</span>
        </span>
      </span>
    </button>
  );
}

/* ---- measured edge layer ----------------------------------------------- */
function EdgeLayer({ canvasRef, nodeEls, edges, activeId, relatedIds, bump, layout }) {
  const [paths, setPaths] = useState([]);

  const compute = useCallback(() => {
    const wrap = canvasRef.current;
    if (!wrap) return;
    const base = wrap.getBoundingClientRect();
    const out = [];
    edges.forEach(([a, b], i) => {
      const ea = nodeEls.current.get(a);
      const eb = nodeEls.current.get(b);
      if (!ea || !eb) return;
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      const ax = ra.left - base.left + ra.width / 2;
      const ay = ra.top - base.top + ra.height / 2;
      const bx = rb.left - base.left + rb.width / 2;
      const by = rb.top - base.top + rb.height / 2;
      let d;
      if (layout === "flow") {
        const mx = (ax + bx) / 2;
        d = `M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`;
      } else {
        const my = (ay + by) / 2;
        d = `M ${ax} ${ay} C ${ax} ${my}, ${bx} ${my}, ${bx} ${by}`;
      }
      out.push({ id: a + "-" + b, d, a, b, ax, ay, bx, by });
    });
    setPaths(out);
  }, [edges, layout, canvasRef, nodeEls]);

  useLayoutEffect(() => {
    compute();
    const t = setTimeout(compute, 60);
    const t2 = setTimeout(compute, 260);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [compute, bump]);

  useEffect(() => {
    const onR = () => compute();
    window.addEventListener("resize", onR);
    const ro = new ResizeObserver(onR);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => { window.removeEventListener("resize", onR); ro.disconnect(); };
  }, [compute, canvasRef]);

  const hotSet = activeId ? new Set([activeId, ...(relatedIds || [])]) : null;

  return (
    <svg className="edge-layer">
      {paths.map((p) => {
        const hot = activeId && (p.a === activeId || p.b === activeId);
        const dim = activeId && !hot;
        return <path key={p.id} d={p.d} className={hot ? "hot" : dim ? "dim" : ""} />;
      })}
      {paths.map((p) => {
        const hot = activeId && (p.a === activeId || p.b === activeId);
        if (activeId && !hot) return null;
        return (
          <g key={p.id + "-d"}>
            <circle className={"edge-dot" + (hot ? " hot" : "")} cx={p.ax} cy={p.ay} r="2.4" />
            <circle className={"edge-dot" + (hot ? " hot" : "")} cx={p.bx} cy={p.by} r="2.4" />
          </g>
        );
      })}
    </svg>
  );
}

/* ---- tier (layered + flow share this) ---------------------------------- */
function Tier({ tier, common }) {
  return (
    <section className="tier" data-screen-label={"tier:" + tier.id}>
      <div className="tier-label">
        <span className="idx mono">{tier.idx}</span>
        <span className="name">{tier.name}</span>
        <span className="desc">{tier.desc}</span>
        <span className="rule" />
      </div>
      <div className="node-row">
        {tier.nodes.map((n) => (
          <StackNode key={n.id} node={n} {...common} active={common.activeId === n.id}
            dim={common.mapDim ? !common.fileHits?.has(n.id) : false}
            filehit={common.fileHits?.has(n.id)} />
        ))}
      </div>
    </section>
  );
}

/* ---- nested / deployment topology -------------------------------------- */
function NestedDiagram({ common }) {
  const byId = (id) => STACK.tiers.flatMap(t => t.nodes).find(n => n.id === id);
  const renderNodes = (ids) => (
    <div className="node-row">
      {ids.map((id) => {
        const n = byId(id);
        return <StackNode key={id} node={n} {...common} active={common.activeId === id}
          dim={common.mapDim ? !common.fileHits?.has(id) : false}
          filehit={common.fileHits?.has(id)} />;
      })}
    </div>
  );
  return (
    <div className="nest">
      <div className="nest-label"><Icon name="box" className="ic" style={{ width: 14, height: 14 }} />
        Render — managed platform · build &amp; runtime
      </div>
      {renderNodes(["render", "docker", "ci"])}
      <div className="nest nest-inner" style={{ marginTop: 16 }}>
        <div className="nest-label">web service container · gunicorn → flask</div>
        <div className="nest-row">
          <div className="nest-col">
            <div className="tier-label"><span className="idx mono">APP</span><span className="desc">request handling</span></div>
            {renderNodes(["gunicorn", "flask", "sqlalchemy", "celery"])}
          </div>
        </div>
        <div className="nest nest-inner" style={{ marginTop: 14 }}>
          <div className="nest-label">browser · served as static assets</div>
          {renderNodes(["react", "vite", "router", "tailwind"])}
        </div>
      </div>
      <div className="nest nest-inner" style={{ marginTop: 16 }}>
        <div className="nest-label">managed data services</div>
        {renderNodes(["mysql", "redis", "s3"])}
      </div>
    </div>
  );
}

/* ---- diagram surface --------------------------------------------------- */
function Diagram({ layout, common, canvasRef, nodeEls, bump, edgeFocus }) {
  const showEdges = layout !== "nested";
  return (
    <div className="canvas" ref={canvasRef}>
      <div className="diagram-head">
        <h1>System architecture</h1>
        <span className="sub">{STACK.tiers.flatMap(t => t.nodes).length} technologies · {STACK.edges.length} links</span>
      </div>
      <div className="diagram-legend">
        <span className="lg"><span className="swatch" /> data flow</span>
        <span className="lg"><span className="swatch accent" /> selected path</span>
        <span className="lg"><span className="swatch box" /> technology · click to compare</span>
        <span className="lg mono">layout: {layout}</span>
      </div>

      {showEdges && (
        <EdgeLayer canvasRef={canvasRef} nodeEls={nodeEls} edges={STACK.edges}
          activeId={edgeFocus} relatedIds={common.relatedIds} bump={bump} layout={layout} />
      )}

      {layout === "nested"
        ? <NestedDiagram common={common} />
        : (
          <div className={"tiers" + (layout === "flow" ? " flow" : "")}>
            {STACK.tiers.map((t) => <Tier key={t.id} tier={t} common={common} />)}
          </div>
        )}
    </div>
  );
}

Object.assign(window, { Icon, StackNode, EdgeLayer, Tier, NestedDiagram, Diagram });
