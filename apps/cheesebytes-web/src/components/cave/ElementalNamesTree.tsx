import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { elementsData } from './PeriodicTable';

const ELEMENT_SYMBOLS = new Set(elementsData.map(e => e.symbol));
const ELEMENT_NAMES = Object.fromEntries(elementsData.map(e => [e.symbol, e.name]));
const DEAD_END_NODE = { status: 'dead_end', name: 'dead_end', text: '✗' };

interface ElementalTreeProps {
  initialText?: string;
  maxDepth?: number;
  showInput?: boolean;
  collapsedNodes?: string[];
  highlightBranchIds?: string[];
  enableZoom?: boolean;
}

export const ElementalTree: React.FC<ElementalTreeProps> = ({
  initialText = 'Coco',
  maxDepth = 99,
  showInput = false,
  collapsedNodes = [],
  highlightBranchIds = [],
  enableZoom,
}) => {
  const [name, setName] = useState(initialText);
  // Inicializa el estado collapsed a partir de collapsedNodes
  const [collapsed, setCollapsed] = useState<{ [id: string]: boolean }>(
    () => (collapsedNodes.reduce((acc, id) => { acc[id] = true; return acc; }, {} as { [id: string]: boolean }))
  );
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determinar si el zoom está habilitado
  const zoomEnabled = enableZoom !== undefined ? enableZoom : showInput;

  // --- Build tree data up to maxDepth ---
  const buildTreeData = useCallback((word: string, depth = 0, parentId = 'root'): any => {
    if (depth > maxDepth) return null;
    const node: any = {
      id: parentId + '-' + word,
      text: word,
      children: [],
      status: 'intermediate',
      depth,
    };
    if (word === '') {
      node.status = 'success';
      return node;
    }
    // Si estamos en el nivel máximo, no expandir más
    if (depth === maxDepth) {
      return node;
    }
    // 1-letter symbol
    const symbol1 = word.substring(0, 1).toUpperCase();
    if (ELEMENT_SYMBOLS.has(symbol1)) {
      const child = buildTreeData(word.substring(1), depth + 1, node.id + '-' + symbol1);
      node.children.push(child ? { ...child, symbol: symbol1 } : { ...DEAD_END_NODE, symbol: symbol1 });
    } else {
      node.children.push({ ...DEAD_END_NODE, symbol: symbol1 });
    }
    // 2-letter symbol
    if (word.length >= 2) {
      const symbol2 = word.charAt(0).toUpperCase() + word.charAt(1);
      if (ELEMENT_SYMBOLS.has(symbol2)) {
        const child = buildTreeData(word.substring(2), depth + 1, node.id + '-' + symbol2);
        node.children.push(child ? { ...child, symbol: symbol2 } : { ...DEAD_END_NODE, symbol: symbol2 });
      } else {
        node.children.push({ ...DEAD_END_NODE, symbol: symbol2 });
      }
    }
    return node;
  }, [maxDepth]);

  // --- Collapse/Expand logic ---
  useEffect(() => {
    // Collapse all nodes at maxDepth when maxDepth is set
    if (maxDepth < 99) {
      const treeData = buildTreeData((showInput ? name : initialText).toLowerCase());
      const collapsedAtDepth: { [id: string]: boolean } = {};
      function markCollapse(node: any) {
        if (node.depth === maxDepth && node.children && node.children.length > 0) {
          collapsedAtDepth[node.id] = true;
        }
        if (node.children) node.children.forEach(markCollapse);
      }
      if (treeData) markCollapse(treeData);
      setCollapsed(collapsedAtDepth);
    }
  }, [maxDepth, name, initialText, showInput, buildTreeData]);

  const handleNodeClick = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Highlight branch logic ---
  // Calcula el conjunto de nodos a resaltar (los nodos raíz y todos sus descendientes para cada id)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Memoiza highlightBranchIds para que solo cambie si el contenido cambia realmente
  function arraysEqual(a: string[] = [], b: string[] = []) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  const stableHighlightBranchIds = useMemo(() => highlightBranchIds, [JSON.stringify(highlightBranchIds)]);

  useEffect(() => {
    if (!stableHighlightBranchIds || stableHighlightBranchIds.length === 0) {
      setHighlightedIds(new Set());
      return;
    }
    // Construye el árbol y busca las ramas
    const targetName = (showInput ? name : initialText) || '';
    const treeData = buildTreeData(targetName.toLowerCase());
    if (!treeData) {
      setHighlightedIds(new Set());
      return;
    }
    // Busca los nodos y sus descendientes
    const ids = new Set<string>();
    function findAndCollect(node: any, targets: Set<string>) {
      if (targets.has(node.id)) {
        collectAll(node);
        return;
      }
      if (node.children) {
        for (const child of node.children) {
          findAndCollect(child, targets);
        }
      }
    }
    function collectAll(node: any) {
      ids.add(node.id);
      if (node.children) node.children.forEach(collectAll);
    }
    const targets = new Set(stableHighlightBranchIds);
    findAndCollect(treeData, targets);
    setHighlightedIds(ids);
  }, [stableHighlightBranchIds, name, initialText, showInput, buildTreeData]);

  // --- Draw tree with D3 ---
  // Guardar el estado de zoom/pan entre renders
  const zoomTransformRef = useRef(d3.zoomIdentity);
  // Referencia persistente al grupo raíz para no recrear zoom ni pan
  const gRef = useRef<SVGGElement | null>(null);
  const linksRef = useRef<SVGGElement | null>(null);
  const nodesRef = useRef<SVGGElement | null>(null);
  // Guardar la posición previa de cada nodo para animaciones
  const prevPos = useRef<{ [id: string]: { x: number; y: number } }>({});
  // Referencia para saber si el zoom ya fue configurado
  const zoomConfigured = useRef<boolean | null>(null);

  // --- Mantener viewBox fijo solo al montar o al cambiar la raíz ---
  const lastViewBox = useRef<string | null>(null);
  const viewBoxSet = useRef(false);
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    // Inicializar grupo raíz solo una vez
    if (!gRef.current) {
      gRef.current = svg.append('g').attr('class', 'zoom-content').node();
      linksRef.current = d3.select(gRef.current).append('g').attr('class', 'links').node();
      nodesRef.current = d3.select(gRef.current).append('g').attr('class', 'nodes').node();
      zoomConfigured.current = null; // Marcar que necesita configuración inicial
    }
    
    // Configurar o quitar zoom solo si el estado ha cambiado
    if (zoomConfigured.current !== zoomEnabled) {
      svg.on('.zoom', null); // Limpiar zoom anterior
      if (zoomEnabled) {
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.05, 10])
          .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            zoomTransformRef.current = event.transform;
            d3.select(gRef.current).attr('transform', event.transform);
          });
        svg.call(zoom as any);
        svg.call(zoom.transform, zoomTransformRef.current);
      }
      zoomConfigured.current = zoomEnabled;
    }
    // Limpiar solo los hijos de los grupos, no el grupo raíz ni el zoom
    d3.select(linksRef.current).selectAll('*').remove();
    d3.select(nodesRef.current).selectAll('*').remove();
    d3.select(gRef.current).selectAll('.svg-tooltip').remove();

    // Layout y renderizado
    const targetName = (showInput ? name : initialText) || '';
    const treeData = buildTreeData(targetName.toLowerCase());
    if (!treeData || !svgRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const root = d3.hierarchy(treeData);
    let i = 0; root.each((d: any) => (d.id = i++));
    (root as any).x0 = height / 2; (root as any).y0 = 0;
    root.descendants().forEach((d: any) => {
      if (collapsed[d.data.id] && d.children) {
        d._children = d.children;
        d.children = null;
      } else if (d._children) {
        d.children = d._children;
        d._children = null;
      }
    });
    const treeLayout = d3.tree().nodeSize([60, 160]);
    treeLayout(root);
    const nodes = root.descendants().filter((d: any) => d.x !== undefined && d.y !== undefined);
    const links = root.links().filter((d: any) => d.source && d.target && d.source.x !== undefined && d.source.y !== undefined && d.target.x !== undefined && d.target.y !== undefined);
    if (nodes.length === 0) return;
    // Solo fijar el viewBox al montar o al cambiar la raíz
    if (!viewBoxSet.current) {
      const minX = Math.min(...nodes.map((d: any) => d.x));
      const maxX = Math.max(...nodes.map((d: any) => d.x));
      const minY = Math.min(...nodes.map((d: any) => d.y));
      const maxY = Math.max(...nodes.map((d: any) => d.y));
      const margin = 40;
      const vbWidth = maxY - minY + margin * 2;
      const vbHeight = maxX - minX + margin * 2;
      const newViewBox = `${minY - margin} ${minX - margin} ${vbWidth} ${vbHeight}`;
      svg.attr('viewBox', newViewBox);
      lastViewBox.current = newViewBox;
      viewBoxSet.current = true;
      // Resetear el zoom de D3 al cambiar la raíz solo si está habilitado
      if (zoomEnabled) {
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.05, 10])
          .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            zoomTransformRef.current = event.transform;
            d3.select(gRef.current).attr('transform', event.transform);
          });
        svg.call(zoom as any);
        svg.call(zoom.transform, d3.zoomIdentity);
        zoomTransformRef.current = d3.zoomIdentity;
      }
    }

    // --- Detectar rama expandida/colapsada ---
    // Encuentra el último nodo expandido/colapsado (último click)
    const lastToggledId = Object.keys(collapsed).find(
      k => collapsed[k] !== undefined && collapsed[k] !== false
    );
    // Marca los nodos/enlaces descendientes de ese nodo
    const toggledSet = new Set<string>();
    if (lastToggledId) {
      const markDescendants = (d: any) => {
        toggledSet.add(d.id);
        if (d.children) d.children.forEach(markDescendants);
        if (d._children) d._children.forEach(markDescendants);
      };
      const toggledNode = nodes.find((d: any) => d.data.id === lastToggledId);
      if (toggledNode) markDescendants(toggledNode);
    }

    // Guardar posiciones previas
    nodes.forEach((d: any) => {
      if (!prevPos.current[d.id]) {
        prevPos.current[d.id] = { x: d.x, y: d.y };
      }
    });

    // --- HighlightedIds local ---
    const currentHighlightedIds = highlightedIds;
    // Nodes
    const nodeSel = d3.select(nodesRef.current)
      .selectAll('g.node')
      .data(nodes, (d: any) => d.id);
    const nodeEnter = nodeSel.enter().append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${prevPos.current[d.id]?.y ?? d.y},${prevPos.current[d.id]?.x ?? d.x})`)
      .on('click', (event: any, d: any) => handleNodeClick(d.data.id));
    nodeEnter.append('rect')
      .attr('class', (d: any) => {
        switch (d.data.status) {
          case 'success': return 'node-rect-success';
          case 'dead_end': return 'node-rect-dead_end';
          default: return 'node-rect-intermediate';
        }
      })
      .attr('width', (d: any) => (d.data.text ? d.data.text.length : 1) * 9 + 20)
      .attr('height', 30)
      .attr('x', (d: any) => -((d.data.text ? d.data.text.length : 1) * 4.5 + 10))
      .attr('y', -15)
      .attr('rx', 8);
    nodeEnter.append('text')
      .attr('class', (d: any) => d.data.status === 'dead_end' ? 'node-text-dead_end' : 'node-text-default')
      .attr('dy', '0.3em')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.text || '✓');
    // Sin animación: solo setear la posición directamente
    nodeSel.merge(nodeEnter as any)
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);
    nodeSel.exit().remove();

    // --- Highlight bounding box para las ramas seleccionadas ---
    d3.select(gRef.current).selectAll('.highlight-branch-rect').remove();
    if (highlightBranchIds && highlightBranchIds.length > 0 && currentHighlightedIds.size > 0) {
      // Para cada id de rama, calcula el bounding box de su subárbol
      highlightBranchIds.forEach((branchId) => {
        const branchNodes = nodes.filter((d: any) => {
          const current = d.data?.id;
          if (!current || !branchId) return false;
          if (current === branchId) return true;
          if (current.startsWith(branchId + '-')) return true;
          return false;
        });
        if (branchNodes.length > 0) {
          // Calcula el bounding box
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          branchNodes.forEach((d: any) => {
            const w = (d.data.text ? d.data.text.length : 1) * 9 + 20;
            const h = 30;
            const x = d.y - w / 2;
            const y = d.x - h / 2;
            minX = Math.min(minX, y);
            maxX = Math.max(maxX, y + h);
            minY = Math.min(minY, x);
            maxY = Math.max(maxY, x + w);
          });
          // Añade margen
          const margin = 5;
          d3.select(gRef.current)
            .insert('rect', ':first-child')
            .attr('class', 'highlight-branch-rect')
            .attr('x', minY - margin)
            .attr('y', minX - margin)
            .attr('width', maxY - minY + margin * 2)
            .attr('height', maxX - minX + margin * 2)
            .attr('rx', 0)
        }
      });
    }

    // --- Animación de enlaces ---
    const linkSel = d3.select(linksRef.current)
      .selectAll('path.link')
      .data(links, (d: any) => d.target.id);
    const linkEnter = linkSel.enter().append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        const o = prevPos.current[d.target.id] || d.target;
        return d3.linkHorizontal()
          .x(() => o.y)
          .y(() => o.x)({ source: o, target: o });
      })
      .style('stroke-dasharray', (d: any) => d.target.data.status === 'dead_end' ? '3,4' : 'none');
    // Sin animación: solo setear el path directamente
    linkSel.merge(linkEnter as any)
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      );
    linkSel.exit().remove();

    // Link labels (sin animación por simplicidad)
    d3.select(linksRef.current)
      .selectAll('.link-label')
      .data(links, (d: any) => d.target.id)
      .join('text')
      .attr('class', 'link-label')
      .attr('dy', '-0.5em')
      .attr('text-anchor', 'middle')
      .attr('x', (d: any) => (d.source.y + d.target.y) / 2)
      .attr('y', (d: any) => (d.source.x + d.target.x) / 2)
      .text((d: any) => d.target.data.symbol)
      .on('mouseenter', function (event: any, d: any) {
        d3.select(gRef.current).selectAll('.svg-tooltip').remove();
        const symbol = d.target.data.symbol;
        const name = ELEMENT_NAMES[symbol];
        const exists = !!name;
        const label = exists
          ? `${symbol}: ${name}`
          : `${symbol}: no existe`;
        d3.select(gRef.current)
          .append('g')
          .attr('class', 'svg-tooltip')
          .attr('pointer-events', 'none')
          .attr('transform', `translate(${(d.source.y + d.target.y) / 2},${(d.source.x + d.target.x) / 2 - 30})`)
          .append('rect')
          .attr('x', -80)
          .attr('y', -28)
          .attr('width', 160)
          .attr('height', 32)
          .attr('rx', 8)
          .attr('fill', 'rgba(30,41,59,0.97)')
          .attr('stroke', exists ? '#fff' : '#f87171')
          .attr('stroke-width', 1.5);
        d3.select(gRef.current).select('.svg-tooltip')
          .append('text')
          .attr('x', 0)
          .attr('y', -8)
          .attr('text-anchor', 'middle')
          .attr('fill', exists ? '#fff' : '#f87171')
          .attr('font-size', 16)
          .attr('font-family', 'inherit')
          .text(label);
      })
      .on('mouseleave', function () {
        d3.select(gRef.current).selectAll('.svg-tooltip').remove();
      });

    // Guardar nuevas posiciones para la próxima animación
    nodes.forEach((d: any) => {
      prevPos.current[d.id] = { x: d.x, y: d.y };
    });
  }, [name, initialText, showInput, buildTreeData, collapsed, highlightedIds, highlightBranchIds, zoomEnabled]);

  // Resetear viewBox si cambia la raíz (nombre)
  useEffect(() => {
    viewBoxSet.current = false;
  }, [name, initialText, showInput]);

  // --- Responsive redraw ---
  // Usar un estado dummy para forzar render al cambiar tamaño, evitando ciclo infinito
  const [, setContainerSize] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      setContainerSize(Date.now()); // Solo fuerza un render, no cambia el nombre
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .node { cursor: pointer; }
        .node rect { stroke-width: 1.5px; }
        .node text { font-size: 18px; font-weight: 600; pointer-events: none; }
        .link { fill: none; stroke: #e2e8f0; stroke-width: 2.5px; }
        .dark .link { stroke: #475569; }
        .link-label { font-size: 17px; font-weight: bold; fill: #475569; paint-order: stroke; stroke: #ffffff; stroke-width: 4px; pointer-events: all; }
        .dark .link-label { fill: #cbd5e1; stroke: #1e293b; }
        .node-rect-intermediate { fill: #dbeafe; stroke: #60a5fa; }
        .dark .node-rect-intermediate { fill: #374151; stroke: #4b5563; }
        .node-rect-success { fill: #dcfce7; stroke: #22c55e; }
        .dark .node-rect-success { fill: #14532d; stroke: #22c55e; }
        .node-rect-dead_end { fill: #fee2e2; stroke: #ef4444; }
        .dark .node-rect-dead_end { fill: #7f1d1d; stroke: #ef4444; }
        .node-text-default { fill: #1e293b; }
        .dark .node-text-default { fill: #e2e8f0; }
        .node-text-dead_end { fill: #b91c1c; }
        .dark .node-text-dead_end { fill: #fca5a5; }
        .collapse-icon { fill: #64748b; font-weight: bold; cursor: pointer; pointer-events: all; }
        .fullscreen-btn rect { filter: drop-shadow(0 1px 2px #0001); }
        .fullscreen-btn text { font-family: inherit; }
        .highlight-branch-rect {
          stroke: #fbbf24;
          stroke-width: 1px;
          fill: rgba(251,191,36,0.10);
          pointer-events: none;
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: 'none', display: 'flex', flexDirection: 'column' }}>
        {showInput ? (
          <div style={{ flex: '0 0 3em', minHeight: '3em', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-lg w-full max-w-xs focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-slate-100"
              placeholder="Introduce un nombre..."
            />
          </div>
        ) : null}
        <div style={{ flex: '1 1 0%', minHeight: 0 }}>
          <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block', background: 'none', overflow: 'visible' }} />
        </div>
        {false && tooltip && (
          <div style={{
            position: 'fixed',
            left: (tooltip?.x ?? 0) + 12,
            top: (tooltip?.y ?? 0) + 12,
            background: 'rgba(30,41,59,0.97)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 16,
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px #0003',
            maxWidth: 320,
          }}>{tooltip?.text}</div>
        )}
      </div>
    </>
  );
};

export default ElementalTree;