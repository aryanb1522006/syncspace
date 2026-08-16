function renderSyncSpaceDiagrams() {
  if (!window.mermaid) return;

  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
  });

  const diagrams = document.querySelectorAll(".mermaid:not([data-processed='true'])");
  if (diagrams.length > 0) {
    window.mermaid.run({ nodes: diagrams });
  }
}

if (typeof document$ !== "undefined") {
  document$.subscribe(renderSyncSpaceDiagrams);
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderSyncSpaceDiagrams);
} else {
  renderSyncSpaceDiagrams();
}
