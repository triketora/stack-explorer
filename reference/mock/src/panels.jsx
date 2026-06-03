/* Stack Explorer — drilldown panel + file tree */

/* ---- drilldown comparison panel ---------------------------------------- */
function Drilldown({ node, onClose, onOpenFile }) {
  const open = !!node;
  return (
    <React.Fragment>
      <div className={"panel-scrim" + (open ? " show" : "")} onClick={onClose} />
      <aside className={"panel" + (open ? " show" : "")} aria-hidden={!open}>
        {node && (
          <React.Fragment>
            <div className="panel-head">
              <button className="panel-close" onClick={onClose} aria-label="Close">
                <Icon name="close" />
              </button>
              <div className="eyebrow"><span className="idx-dot" />compare technology</div>
              <div className="title-row">
                <span className="glyph-lg">{node.glyph}</span>
                <div>
                  <h2>{node.name}</h2>
                  <span className="cat2">{node.cat}</span>
                </div>
              </div>
              <div className="tags">
                {node.tags.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>

            <div className="panel-body">
              <div className="rationale">
                <span className="lead">why it's here</span>
                {node.rationale}
              </div>

              <div className="sec-label">Maps to code</div>
              <div className="files-list">
                {node.files.map((f) => {
                  const dir = f.endsWith("/");
                  return (
                    <div key={f} className="file-line" onClick={() => onOpenFile(node.id)}>
                      <Icon name={dir ? "folder" : "file"} className="ic" style={{ width: 14, height: 14 }} />
                      <span>{f}</span>
                    </div>
                  );
                })}
              </div>

              <div className="sec-label">Alternatives &amp; tradeoffs</div>

              <div className="alt current">
                <div className="alt-head">
                  <span className="alt-name">{node.name}<span className="mono-mini">{node.cat}</span></span>
                  <span className="badge-current">current</span>
                </div>
                <div className="alt-blurb">{node.rationale}</div>
              </div>

              {node.alts.map((a) => (
                <div key={a.name} className="alt">
                  <div className="alt-head">
                    <span className="alt-name">{a.name}<span className="mono-mini">{a.tag}</span></span>
                  </div>
                  <div className="alt-blurb">{a.blurb}</div>
                  <div className="pc">
                    <div className="pros">
                      <div className="col-label">Pros</div>
                      <ul>{a.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                    <div className="cons">
                      <div className="col-label">Cons</div>
                      <ul>{a.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  </div>
                  <div className="when"><b>when to choose</b>{a.when}</div>
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
      </aside>
    </React.Fragment>
  );
}

/* ---- recursive file tree ----------------------------------------------- */
function TreeNode({ node, depth, path, activeNodeId, hoverNodeId, onHoverFile, onClickFile, defaultOpen }) {
  const [open, setOpen] = useState(depth < 2 || defaultOpen);
  const isDir = node.type === "dir";
  const maps = node.maps || [];
  const focusId = hoverNodeId || activeNodeId;

  // does this subtree contain a hit? (for dirs we still show own maps)
  const selfHit = focusId && maps.includes(focusId);

  // compute whether any descendant matches (so we can fade non-matching when focused)
  const subtreeHas = (n) => {
    if ((n.maps || []).includes(focusId)) return true;
    return (n.children || []).some(subtreeHas);
  };
  const faded = focusId && !selfHit && !(isDir && subtreeHas(node));

  return (
    <div className="tnode">
      <div
        className={"trow " + (isDir ? "dir " : "") + (selfHit ? "hit " : "") + (faded ? "faded" : "")}
        style={{ paddingLeft: 8 }}
        onClick={() => { isDir ? setOpen(!open) : onClickFile(node); }}
        onMouseEnter={() => onHoverFile(maps)}
        onMouseLeave={() => onHoverFile(null)}
        title={path}
      >
        <span className="tw">
          {isDir
            ? <Icon name="chevron" style={{ width: 11, height: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
            : <Icon name="file" style={{ width: 12, height: 12 }} />}
        </span>
        <span className="tname">{node.name}{isDir ? "/" : ""}</span>
        {maps.length > 0 && <span className="maps">{maps.length}</span>}
      </div>
      {isDir && open && (
        <div className="tchildren">
          {node.children.map((c, i) => (
            <TreeNode key={c.name + i} node={c} depth={depth + 1} path={path + "/" + c.name}
              activeNodeId={activeNodeId} hoverNodeId={hoverNodeId}
              onHoverFile={onHoverFile} onClickFile={onClickFile} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileTreePane({ activeNodeId, hoverNodeId, onHoverFile, onClickFile }) {
  const focus = hoverNodeId || activeNodeId;
  const focusNode = focus ? NODE_BY_ID[focus] : null;
  return (
    <div className="tree-pane">
      <div className="tree-head">
        <Icon name="code" style={{ width: 16, height: 16, color: "var(--ink-2)" }} />
        <div>
          <div className="eyebrow">codebase</div>
          <h3>{STACK.repo}</h3>
        </div>
      </div>
      <div className="tree-hint">
        {focusNode
          ? <React.Fragment>highlighting files for <b>{focusNode.name}</b></React.Fragment>
          : "hover a technology or a file to see what maps where"}
      </div>
      <div className="tree-body">
        {FILETREE.children.map((c, i) => (
          <TreeNode key={c.name + i} node={c} depth={1} path={c.name}
            activeNodeId={activeNodeId} hoverNodeId={hoverNodeId}
            onHoverFile={onHoverFile} onClickFile={onClickFile} defaultOpen={true} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Drilldown, TreeNode, FileTreePane });
