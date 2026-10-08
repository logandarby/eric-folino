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
/**
 * Each poem is a pixel-art star, drawn on this grid (see star()) with each
 * of its pixels `PIXEL` screen pixels wide.
 */
const STAR_GRID = 11;
const PIXEL = 3;
/** How wide a poem's star is. */
const NODE_SIZE = STAR_GRID * PIXEL;
/** Room kept clear around each poem's star. */
const COLLIDE_GAP = 32;
/** How far out the hover outline is from a poem's star. */
const RING_GAP = 4;
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
/** How far in and out the wheel zooms. */
const ZOOM_RANGE: [number, number] = [0.25, 4];
/** How visible a link is, by how many of its ends are read. */
const LINK_OPACITY = [0.06, 0.18, 0.35];
/** How visible the specks flowing along it are, the same way. */
const FLOW_OPACITY = [0, 0.6, 1];
/**
 * Specks fire along a link like a synapse: one quick streak, then quiet.
 * Each link waits its own while (at random, between these, in px of
 * travel, so it's the same as time at the one speed), so they fire at
 * different moments.
 */
const FIRE_GAP = { min: 20000, max: 60000 };
/** How fast a speck crosses, in px a second. */
const FIRE_SPEED = 900;
/** What a locked poem's dialog says in place of its title. */
const LOCKED_TITLE = '???';
/** The dialog's button that goes to the poem. */
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
  /** The specks flowing along it, from `source` to `target` (see graph.css). */
  flow: SVGLineElement;
}

// The text demo has the same key as the table of links.
const { dialogs } = bootstrap({ textDemo: false });
const container = document.querySelector<HTMLElement>('[data-poem-graph]');
if (container) drawGraph(container);
if (import.meta.env.DEV) installDebugTable();

/**
 * Each poem a pixel star, each link a faint glowing line pulling its two
 * poems together as hard as the link is close in meaning. Poems not read
 * yet are locked: grey and nameless. Clicking a poem shows its title, with
 * a button to read it; dragging one moves it, dragging elsewhere moves
 * around, and the wheel (or a pinch) zooms.
 */
function drawGraph(container: HTMLElement): void {
  const read = readPoems();
  const svg = svgEl('svg', { 'aria-hidden': 'true' });
  const world = svgEl('g');
  const links = svgEl('g', { class: 'poem-graph-links' });
  const flows = svgEl('g', { class: 'poem-graph-flows' });
  const stars = svgEl('g');
  world.append(links, flows, stars);
  svg.append(starSymbol(), world);
  container.append(svg);

  const half = NODE_SIZE / 2;
  const nodes: PoemNode[] = graph.poems.map((poem) => {
    const isRead = read.has(poem.slug);
    // A read poem is a link to it; a locked one goes nowhere.
    const el = isRead
      ? svgEl('a', { href: poemPath(poem.slug), 'aria-label': poem.lines[0] })
      : svgEl('g');
    el.setAttribute(
      'class',
      isRead ? 'poem-graph-node' : 'poem-graph-node is-locked'
    );
    // The star has gaps between its rays; this square catches the pointer
    // in them.
    const hit = svgEl('rect', {
      class: 'poem-graph-hit',
      x: String(-half),
      y: String(-half),
      width: String(NODE_SIZE),
      height: String(NODE_SIZE),
    });
    el.append(
      hit,
      svgEl('use', {
        href: '#poem-graph-star',
        class: 'poem-graph-star',
        x: String(-half),
        y: String(-half),
        width: String(NODE_SIZE),
        height: String(NODE_SIZE),
      })
    );
    // The dashed outline a read poem gets on hover and focus, like
    // everything else you can use (see graph.css).
    if (isRead) {
      el.append(
        svgEl('rect', {
          class: 'poem-graph-ring',
          x: String(-half - RING_GAP),
          y: String(-half - RING_GAP),
          width: String(NODE_SIZE + 2 * RING_GAP),
          height: String(NODE_SIZE + 2 * RING_GAP),
        })
      );
    }
    const rect = () => fromDOMRect(hit.getBoundingClientRect());
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
        'stroke-opacity': String(LINK_OPACITY[ends]),
      }),
      // Only links to a poem that's been read flow, so locked parts stay
      // still. Each starts at its own point, so they don't pulse together.
      flow: svgEl('line', {
        class: 'poem-graph-flow',
        'stroke-opacity': String(FLOW_OPACITY[ends]),
        style: firing(),
      }),
    };
  });
  links.append(...edges.map((e) => e.el));
  flows.append(...edges.map((e) => e.flow));
  stars.append(...nodes.map((n) => n.el));

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
    .force('collide', forceCollide<PoemNode>(half + COLLIDE_GAP))
    .force('x', forceX(0).strength(GATHER))
    .force('y', forceY(0).strength(GATHER))
    .on('tick', draw);
  // Without motion, it settles before it's shown and then only moves when
  // dragged.
  const still = prefersReducedMotion();
  if (still) simulation.stop().tick(300);

  function draw() {
    for (const { el, flow, source, target } of edges) {
      for (const line of [el, flow]) {
        line.setAttribute('x1', String(source.x));
        line.setAttribute('y1', String(source.y));
        line.setAttribute('x2', String(target.x));
        line.setAttribute('y2', String(target.y));
      }
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
      if (!still) simulation.alphaTarget(0.3).restart();
      e.subject.fx = e.subject.x;
      e.subject.fy = e.subject.y;
    })
    .on('drag', (e: { subject: PoemNode; x: number; y: number }) => {
      // Only once it moves: a press that doesn't is a click, which opens
      // and closes the dialog itself.
      void hide();
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

  // Clicking (or tapping) a poem shows its title, with a button to go and
  // read it; clicking it again, or off the poems, puts it away. The same
  // with a mouse as on touch, which has no hover.
  const show = (node: PoemNode) => {
    setShown(node);
    return dialogs.open({
      anchor: node.anchor,
      content: titleDialog(node),
      modal: false,
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
    if (!(e.target as Element).closest('.poem-graph-node')) void hide();
  });
  // Its close button and Esc, too. Only for `shown`'s own dialog, not when
  // another poem's replaces it.
  let shownView: unknown = null;
  dialogs.events.on('open', ({ view, anchor }) => {
    shownView = anchor === shown?.anchor ? view : null;
  });
  dialogs.events.on('close', ({ view }) => {
    if (shown && view === shownView) setShown(null);
  });
  for (const node of nodes) {
    node.el.addEventListener('click', (e) => {
      // Modified clicks (a new tab, say) still go straight to the poem.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      void (shown === node ? hide() : show(node));
    });
  }
}

/**
 * A link's firing, as the style for its specks (see graph.css): how far
 * apart they are, how long the cycle takes at `FIRE_SPEED`, and where in it
 * the link starts.
 */
function firing(): string {
  const gap = FIRE_GAP.min + Math.random() * (FIRE_GAP.max - FIRE_GAP.min);
  const seconds = gap / FIRE_SPEED;
  return [
    `--flow-gap: ${Math.round(gap)}px`,
    `animation-duration: ${seconds.toFixed(2)}s`,
    `animation-delay: ${(-Math.random() * seconds).toFixed(2)}s`,
  ].join(';');
}

/** A poem's title and a button to read it; a locked one has neither. */
function titleDialog(node: PoemNode): DialogContent {
  return {
    title: node.read ? node.title.replaceAll('{', '{{') : LOCKED_TITLE,
    instant: true,
    body: [],
    actions: node.read
      ? [{ label: FOLLOW_LABEL, href: poemPath(node.slug) }]
      : [],
  };
}

/**
 * The star every poem is drawn with: eight rays round a dot, in pixels on
 * a `STAR_GRID` square. Each poem shows it with <use>, so its colour comes
 * from the poem's `fill` (see graph.css).
 */
function starSymbol(): SVGElement {
  const c = Math.floor(STAR_GRID / 2);
  const pixels = new Set<string>();
  const add = (x: number, y: number) => pixels.add(`${x},${y}`);
  // The dot: a small plus.
  add(c, c);
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    add(c + dx, c + dy);
  // The rays: straight ones after a pixel's gap, diagonal ones from the
  // dot's corners, about as long.
  for (let k = 3; k <= c; k++) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      add(c + dx * k, c + dy * k);
    }
  }
  for (let k = 2; k <= c - 1; k++) {
    for (const [dx, dy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      add(c + dx * k, c + dy * k);
    }
  }
  const path = svgEl('path', {
    d: [...pixels]
      .map((p) => {
        const [x, y] = p.split(',');
        return `M${x} ${y}h1v1h-1z`;
      })
      .join(''),
  });
  const symbol = svgEl('symbol', {
    id: 'poem-graph-star',
    viewBox: `0 0 ${STAR_GRID} ${STAR_GRID}`,
  });
  symbol.append(path);
  const defs = svgEl('defs');
  defs.append(symbol);
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
