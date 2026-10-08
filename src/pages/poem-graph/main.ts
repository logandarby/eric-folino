import { drag } from 'd3-drag';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { select, selectAll } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { bootstrap } from '../../app/bootstrap.ts';
import { h } from '../../core/component.ts';
import { center, fromDOMRect, rectPolygon } from '../../core/geometry.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import type { DialogAnchor } from '../../dialog/anchor.ts';
import type { DialogContent } from '../../site/types.ts';
import {
  findPoem,
  graph,
  linkHref,
  poemPath,
  type PoemLink,
} from '../poems/graph.ts';
import { readPoems } from '../poems/read.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_RADIUS = 16;
/** How far out the hover ring is from a poem's circle. */
const RING_GAP = 5;
/** How long a link is at rest. */
const LINK_LENGTH = 200;
/** How hard poems push each other away (negative: apart). */
const REPEL = -700;
/** How many times harder a poem pushes while its title is showing. */
const SHOWN_REPEL = 3;
/** How much the graph stirs when that starts or stops (see d3's alpha). */
const STIR = 0.3;
/** How hard everything is pulled to the middle, so loose poems stay near. */
const GATHER = 0.04;
/** The widest a link is drawn, for a score of 1. */
const LINK_WIDTH = 3;
/** How far in and out the wheel zooms. */
const ZOOM_RANGE: [number, number] = [0.25, 4];
/** How visible a link is, by how many of its ends are read. */
const LINK_OPACITY = [0.12, 0.35, 0.8];
/** What a locked poem's dialog says in place of its title. */
const LOCKED_TITLE = '???';
/** The dialog's button that goes to the poem (on touch, where tap is hover). */
const FOLLOW_LABEL = 'read';
/** Shows the table of links, on the dev server only. */
const DEBUG_KEY = '`';

interface PoemNode extends SimulationNodeDatum {
  slug: string;
  title: string;
  read: boolean;
  anchor: DialogAnchor;
  el: SVGElement;
}

interface Edge extends SimulationLinkDatum<PoemNode> {
  source: PoemNode;
  target: PoemNode;
  link: PoemLink;
  el: SVGLineElement;
}

// The text demo has the same key as the table of links.
const { dialogs } = bootstrap({ textDemo: false });
const container = document.querySelector<HTMLElement>('[data-poem-graph]');
if (container) drawGraph(container);
if (import.meta.env.DEV) installDebugTable();

/**
 * Each poem a circle, each link a line pulling its two poems together as
 * hard as the link is close in meaning. Poems not read yet are locked: dim,
 * blurred and nameless. Hovering a poem shows its title; dragging one moves
 * it, dragging elsewhere moves around, and the wheel zooms.
 */
function drawGraph(container: HTMLElement): void {
  const read = readPoems();
  const svg = svgEl('svg', { 'aria-hidden': 'true' });
  const world = svgEl('g');
  svg.append(blurFilter(), world);
  container.append(svg);

  const nodes: PoemNode[] = graph.poems.map((poem) => {
    const isRead = read.has(poem.slug);
    const circle = svgEl('circle', {
      r: String(NODE_RADIUS),
      class: isRead ? 'poem-graph-node' : 'poem-graph-node is-locked',
    });
    // A read poem is a link to it; a locked one goes nowhere.
    const el = isRead
      ? svgEl('a', { href: poemPath(poem.slug), 'aria-label': poem.lines[0] })
      : svgEl('g');
    el.append(circle);
    // The dashed ring a read poem gets on hover and focus, like the outline
    // of everything else you can use (see graph.css).
    if (isRead) {
      el.append(
        svgEl('circle', {
          r: String(NODE_RADIUS + RING_GAP),
          class: 'poem-graph-ring',
        })
      );
    }
    const rect = () => fromDOMRect(circle.getBoundingClientRect());
    return {
      slug: poem.slug,
      title: poem.lines[0],
      read: isRead,
      el,
      anchor: {
        element: container,
        rect,
        center: () => center(rect()),
        outline: () => rectPolygon(rect()),
      },
    };
  });
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const node = (slug: string) => {
    const found = bySlug.get(slug);
    if (!found) throw new Error(`No poem "${slug}"; try \`npm run poems\``);
    return found;
  };
  const edges: Edge[] = graph.links.map((link) => {
    const source = node(link.from);
    const target = node(link.to);
    const ends = Number(source.read) + Number(target.read);
    return {
      source,
      target,
      link,
      el: svgEl('line', {
        class: 'poem-graph-link',
        'stroke-width': String(link.score * LINK_WIDTH),
        'stroke-opacity': String(LINK_OPACITY[ends]),
      }),
    };
  });
  world.append(...edges.map((e) => e.el), ...nodes.map((n) => n.el));

  // The poem whose title is showing pushes the others back, to make room.
  let shown: PoemNode | null = null;
  const repel = forceManyBody<PoemNode>().strength((n) =>
    n === shown ? REPEL * SHOWN_REPEL : REPEL
  );
  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<PoemNode, Edge>(edges)
        .distance(LINK_LENGTH)
        .strength((e) => e.link.score)
    )
    .force('repel', repel)
    .force('collide', forceCollide(NODE_RADIUS * 3))
    .force('x', forceX(0).strength(GATHER))
    .force('y', forceY(0).strength(GATHER))
    .on('tick', draw);
  // Without motion, it settles before it's shown and then only moves when
  // dragged.
  const still = prefersReducedMotion();
  if (still) simulation.stop().tick(300);

  function draw() {
    for (const { el, source, target } of edges) {
      el.setAttribute('x1', String(source.x));
      el.setAttribute('y1', String(source.y));
      el.setAttribute('x2', String(target.x));
      el.setAttribute('y2', String(target.y));
    }
    for (const { el, x, y } of nodes) {
      el.setAttribute('transform', `translate(${x},${y})`);
    }
    dialogs.reposition();
  }
  draw();

  // Moving around: drag the background, wheel or pinch to zoom. Starts with
  // the middle of the graph in the middle of the window.
  const zoomer = zoom<SVGSVGElement, unknown>()
    .scaleExtent(ZOOM_RANGE)
    .on('start', () => container.classList.add('is-panning'))
    .on('zoom', (e: { transform: { toString(): string } }) => {
      world.setAttribute('transform', e.transform.toString());
      dialogs.reposition();
    })
    .on('end', () => container.classList.remove('is-panning'));
  select(svg)
    .call(zoomer)
    .call(
      zoomer.transform,
      zoomIdentity.translate(
        container.clientWidth / 2,
        container.clientHeight / 2
      )
    );

  // Moving a poem: the others follow while it's held. A drag that moves
  // doesn't also count as a click.
  const dragger = drag<SVGElement, PoemNode>()
    .on('start', (e: { subject: PoemNode }) => {
      void hide();
      if (!still) simulation.alphaTarget(0.3).restart();
      e.subject.fx = e.subject.x;
      e.subject.fy = e.subject.y;
    })
    .on('drag', (e: { subject: PoemNode; x: number; y: number }) => {
      e.subject.fx = e.subject.x = e.x;
      e.subject.fy = e.subject.y = e.y;
      if (still) draw();
    })
    .on('end', (e: { subject: PoemNode }) => {
      if (!still) simulation.alphaTarget(0);
      e.subject.fx = e.subject.fy = null;
    });
  selectAll<SVGElement, PoemNode>(nodes.map((n) => n.el))
    .data(nodes)
    .call(dragger);

  // Hover (or focus) shows a poem's title. On touch there's no hover, so a
  // tap shows it instead, with a button to go there.
  let touch = false;
  const show = (node: PoemNode, follow = false) => {
    setShown(node);
    return dialogs.open({
      anchor: node.anchor,
      content: titleDialog(node, follow),
      modal: false,
      closable: follow,
    });
  };
  const hide = (node = shown) => {
    if (!node || shown !== node) return;
    setShown(null);
    return dialogs.close();
  };
  /**
   * Makes `node` the one pushing harder, held still so it doesn't slide
   * out from under the pointer while the rest move away.
   */
  function setShown(node: PoemNode | null) {
    if (shown) shown.fx = shown.fy = null;
    shown = node;
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
    // Strengths are read when set, so setting it again picks up the change.
    repel.strength(repel.strength());
    if (!still) simulation.alpha(Math.max(simulation.alpha(), STIR)).restart();
  }
  container.addEventListener('pointerdown', (e) => {
    touch = e.pointerType !== 'mouse';
    // A tap off the poems puts the title away.
    if (touch && !(e.target as Element).closest('.poem-graph-node')) {
      void hide();
    }
  });
  for (const node of nodes) {
    node.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') void show(node);
    });
    node.el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') void hide(node);
    });
    // Only read poems take focus (they're links). Chrome makes any SVG
    // element with focus listeners focusable, so locked ones get none.
    if (node.read) {
      node.el.addEventListener('focus', () => void show(node));
      node.el.addEventListener('blur', () => void hide(node));
    }
    node.el.addEventListener('click', (e) => {
      if (!touch || shown === node) return;
      e.preventDefault();
      void show(node, node.read);
    });
  }
}

function titleDialog(node: PoemNode, follow: boolean): DialogContent {
  return {
    title: node.read ? node.title.replaceAll('{', '{{') : LOCKED_TITLE,
    instant: true,
    body: [],
    actions: follow ? [{ label: FOLLOW_LABEL, href: poemPath(node.slug) }] : [],
  };
}

/** What blurs a locked poem (see graph.css). */
function blurFilter(): SVGElement {
  const blur = svgEl('feGaussianBlur', { stdDeviation: '2.5' });
  const filter = svgEl('filter', {
    id: 'poem-graph-blur',
    x: '-100%',
    y: '-100%',
    width: '300%',
    height: '300%',
  });
  filter.append(blur);
  const defs = svgEl('defs');
  defs.append(filter);
  return defs;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}

/** Every link in a table, for checking them: the debug key shows it. */
function installDebugTable(): void {
  const title = (slug: string) => findPoem(slug).lines[0];
  const cells = (tag: 'th' | 'td', values: (Node | string)[]) =>
    h(
      'tr',
      {},
      values.map((v) => h(tag, {}, [v]))
    );
  const table = h('table', {}, [
    h('thead', {}, [cells('th', ['From', 'Word', 'To', 'Lands on', 'Score'])]),
    h(
      'tbody',
      {},
      graph.links.map((link) =>
        cells('td', [
          h('a', { href: poemPath(link.from) }, [title(link.from)]),
          link.word.text,
          h('a', { href: linkHref(link) }, [title(link.to)]),
          findPoem(link.to).lines[link.line],
          String(link.score),
        ])
      )
    ),
  ]);
  const panel = h('div', { class: 'poem-graph-debug', hidden: '' }, [table]);
  document.body.append(panel);
  document.addEventListener('keydown', (e) => {
    if (e.key !== DEBUG_KEY || e.repeat || e.ctrlKey || e.metaKey) return;
    panel.hidden = !panel.hidden;
  });
}
