// src/components/HistogramGenerator.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import pyodideContext from '../../utils/pyodideContext.js';
import { mulberry32 as jsMulberry32 } from '../../utils/random';

const HistogramGenerator: React.FC = () => {
  // Dimensions and margins
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const width = 600;
  const height = 300;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Controls
  const [speed, setSpeed] = useState<number>(10);
  const [running, setRunning] = useState<boolean>(true);

  // Stats
  const [totalCount, setTotalCount] = useState<number>(0);
  const [meanValue, setMeanValue] = useState<number>(4.5);

  // Python‐vs‐JS RNG toggle
  const [usePythonRand, setUsePythonRand] = useState<boolean>(false);

  // Data refs
  const countsRef = useRef<number[]>(Array(10).fill(0));
  const randRef = useRef(jsMulberry32(Date.now())); 
  const fractionRef = useRef<number>(0);

  // D3 and tooltip refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize Pyodide and detect if `mulberry32` exists in the default namespace
  useEffect(() => {
    async function initPy() {
      await pyodideContext.init();
      const exists = await pyodideContext.runSync(`"mulberry32" in globals()`);
      setUsePythonRand(Boolean(exists));
    }
    initPy();
  }, []);

  // Function to update the D3 chart
  const updateChart = () => {
    const counts = countsRef.current;
    const total = counts.reduce((sum, c) => sum + c, 0);
    const mean = total > 0
      ? counts.reduce((sum, c, i) => sum + c * i, 0) / total
      : 4.5;
    setTotalCount(total);
    setMeanValue(mean);

    // Scales
    const xBand = d3.scaleBand<string>()
      .domain(counts.map((_, i) => String(i)))
      .range([0, innerWidth])
      .padding(0.1);
    const maxCount = Math.max(1, d3.max(counts) ?? 1);
    const y = d3.scaleLinear()
      .domain([0, maxCount])
      .range([innerHeight, 0]);

    // Mean line position
    const step = xBand.step();
    const half = xBand.bandwidth() / 2;
    const floorMean = Math.floor(mean);
    const frac = mean - floorMean;
    const centerPos = (xBand(String(floorMean)) ?? 0) + half + frac * step;

    const g = gRef.current;
    if (!g) return;

    // Axes
    g.select<SVGGElement>('.x-axis')
      .call(d3.axisBottom(xBand))
      .selectAll('text').style('font-size', '14px');
    g.select<SVGGElement>('.y-axis')
      .transition().duration(300)
      .call(d3.axisLeft(y).ticks(Math.min(maxCount, 5)).tickFormat(d3.format('d')))
      .selectAll('text').style('font-size', '14px');

    // Bars data join
    const bins = counts.map((c, i) => ({ value: i, count: c }));
    const bars = g.select<SVGGElement>('.bars')
      .selectAll<SVGRectElement, typeof bins[0]>('rect')
      .data(bins, d => String(d.value));

    // Enter
    const enter = bars.enter()
      .append('rect')
      .attr('fill', '#3b82f6')
      .attr('x', d => xBand(String(d.value))!)
      .attr('width', xBand.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0);

    // Enter+Update with tooltip handlers
    const merged = enter.merge(bars as any)
      .on('mouseover', (_e, d) => {
        hoveredRef.current = d.value;
        d3.select(tooltipRef.current).style('display', 'block');
      })
      .on('mousemove', (event, d) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        pointerRef.current = { x: mx, y: my };
        d3.select(tooltipRef.current)
          .text(`Value ${d.value}: ${countsRef.current[d.value]} times`)
          .style('left', `${mx + 50}px`)
          .style('top', `${my + 20}px`);
      })
      .on('mouseout', () => {
        hoveredRef.current = null;
        d3.select(tooltipRef.current!).style('display', 'none');
      });

    // Animate bars
    merged.transition().duration(300)
      .attr('y', d => y(d.count))
      .attr('height', d => innerHeight - y(d.count));
    bars.exit().remove();

    // Animate mean line
    g.select<SVGLineElement>('.mean-line')
      .transition().duration(300)
      .attr('x1', centerPos)
      .attr('x2', centerPos)
      .attr('y1', 0)
      .attr('y2', innerHeight);

    // Update tooltip if still hovering
    if (hoveredRef.current !== null) {
      const h = hoveredRef.current;
      const { x: px, y: py } = pointerRef.current;
      d3.select(tooltipRef.current!)
        .text(`Value ${h}: ${countsRef.current[h]} times`)
        .style('left', `${px + 50}px`)
        .style('top', `${py + 20}px`);
    }
  };

  // Initial render of axes, groups, etc.
  useEffect(() => {
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    gRef.current = g;

    g.append('g').attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`);
    g.append('g').attr('class', 'y-axis');
    g.append('text')
      .attr('x', innerWidth / 2).attr('y', innerHeight + margin.bottom - 10)
      .attr('text-anchor', 'middle').style('font-size', '14px')
      .text('Value');
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2).attr('y', -margin.left + 15)
      .attr('text-anchor', 'middle').style('font-size', '14px')
      .text('Count');
    g.append('g').attr('class', 'bars');

    // Draw initial mean line at 4.5
    {
      const xBandInit = d3.scaleBand<string>()
        .domain(Array.from({ length: 10 }, (_, i) => String(i)))
        .range([0, innerWidth]).padding(0.1);
      const stepInit = xBandInit.step();
      const halfInit = xBandInit.bandwidth() / 2;
      const centerInit = (xBandInit('4') ?? 0) + halfInit + 0.5 * stepInit;
      g.append('line')
        .attr('class', 'mean-line')
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4 2')
        .attr('x1', centerInit).attr('x2', centerInit)
        .attr('y1', 0).attr('y2', innerHeight);
    }

    updateChart();
  }, []);

  // Data‐generation loop, using Python mulberry32() if available, else JS
  useEffect(() => {
    const interval = 100;
    const tick = async () => {
      if (!running) return;
      fractionRef.current += (speed * interval) / 1000;
      const toGen = Math.floor(fractionRef.current);
      fractionRef.current -= toGen;
      if (toGen > 0) {
        for (let i = 0; i < toGen; i++) {
          let r: number;
          if (pyodideContext.isReady()) {
            console.log("trying python");
            try {
              // r = await pyodideContext.runSync('mulberry32()');
              r = await pyodideContext.get('rng');
              r = r();
              // r = randRef.current();
            } catch {
              console.log("some errors, using js");
              r = randRef.current();
            }
          } else {
            console.log("using js");
            r = randRef.current();
          }
          countsRef.current[Math.floor(r * 10)]++;
        }
        updateChart();
      }
    };
    const id = setInterval(() => { tick().catch(console.error); }, interval);
    return () => clearInterval(id);
  }, [running, speed, usePythonRand]);

  // Handlers
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setSpeed(v > 0 ? Math.min(v, 9999) : 1);
    fractionRef.current = 0;
  };
  const handleReset = () => {
    countsRef.current = Array(10).fill(0);
    fractionRef.current = 0;
    updateChart();
    setTotalCount(0);
    setMeanValue(4.5);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 whitespace-nowrap overflow-x-auto">
        <label htmlFor="speed" className="font-medium">Speed:</label>
        <input
          id="speed"
          type="number"
          min={1}
          max={9999}
          value={speed}
          onChange={handleSpeedChange}
          className="w-20 border rounded px-2 py-1 text-center font-bold"
        />
        <span className="ml-1">numbers/sec</span>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setRunning(r => !r)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded"
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded"
        >
          Reset
        </button>
      </div>
      <div className="w-full relative">
        <div
          ref={tooltipRef}
          className="absolute bg-white text-black border border-gray-300 rounded px-2 py-1 text-sm shadow pointer-events-none dark:bg-gray-800 dark:text-white dark:border-gray-600"
          style={{ display: 'none' }}
        />
        <svg ref={svgRef} className="w-full h-auto block" />
      </div>
      <div>
        Total values: {totalCount}, Mean: {meanValue.toFixed(2)}
      </div>
    </div>
  );
};

export default HistogramGenerator;
