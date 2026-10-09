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
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { pageScript } from '../../app/router.ts';
import { loaded } from '../../components/loading/loading.ts';
import { currentLayout } from '../../core/layout.ts';
import { h } from '../../core/component.ts';
import { Disposer, type Cleanup } from '../../core/disposer.ts';
import { center, rectPolygon } from '../../core/geometry.ts';
import { prefersReducedMotion } from '../../core/motion.ts';
import type { DialogAnchor } from '../../dialog/anchor.ts';
import type { DialogManager } from '../../dialog/manager.ts';
import {
  hideTooltip,
  repositionTooltip,
  showTooltip,
} from '../../dialog/tooltip.ts';
import type { DialogContent, LayoutName } from '../../site/types.ts';
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
/**
 * Room kept round a tapped poem and its neighbours when the web zooms out
 * to show them all, and how long that takes.
 */
const FIT_MARGIN = 24;
const FIT_MS = 350;
/**
 * Zoomed in this far, every read poem's title shows: less far on a phone,
 * where there's less room to zoom in to.
 */
const LABEL_ZOOM: Record<LayoutName, number> = { wide: 1.6, compact: 1.2 };
/** How many letters wide a title's lines are under its star, at most. */
const LABEL_WIDTH = 24;
/** Where the first line of a title sits under its star, and the rest. */
const LABEL_TOP = 18;
const LABEL_LINE = 20;
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
/** How long a speck is. */
const SPECK = 10;
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
  /** Its star's box on the screen. */
  rect: () => DOMRect;
  /** Its title under its star (see graph.css for when it shows). */
  label: SVGGElement;
  /** The poems it links to or from. */
  near: Set<PoemNode>;
}

interface Edge extends SimulationLinkDatum<PoemNode> {
  source: PoemNode;
  target: PoemNode;
  link: PoemLink;
  el: SVGLineElement;
  /** The specks flowing along it, from `source` to `target` (see graph.css). */
  flow: SVGLineElement;
}

pageScript(
  import.meta.url,
  ({ dialogs }) => {
    const disposer = new Disposer();
    const container = document.querySelector<HTMLElement>('[data-poem-graph]');
    if (container) disposer.add(drawGraph(container, dialogs));
    if (import.meta.env.DEV) disposer.add(installDebugTable());
    return () => disposer.dispose();
  },
  // The text demo has the same key as the table of links.
  { textDemo: false }
);

/**
 * Each poem a pixel star, each link a faint glowing line pulling its two
 * poems together as hard as the link is close in meaning. Poems not read
 * yet are locked: grey and nameless. Pointing at a poem (or tabbing to it,
 * or tapping it) shows its title and those of the poems it links to, and
 * dims the rest; zoomed in, every read poem's title shows. A click reads
 * the poem; on touch, a tap shows a dialog with a button to read it.
 * Dragging a poem moves it, dragging elsewhere moves around, and the wheel
 * (or a pinch) zooms. Returns a function that stops it all.
 */
function drawGraph(container: HTMLElement, dialogs: DialogManager): Cleanup {
  const disposer = new Disposer();
  const read = readPoems();
  // Only the read poems are there for a screen reader, as links named by
  // their titles; the rest is decoration.
  const svg = svgEl('svg', {
    role: 'group',
    'aria-label': `The web: ${read.size} of ${graph.poems.length} poems read`,
  });
  const world = svgEl('g');
  const links = svgEl('g', {
    class: 'poem-graph-links',
    'aria-hidden': 'true',
  });
  const flows = svgEl('g', {
    class: 'poem-graph-flows',
    'aria-hidden': 'true',
  });
  const stars = svgEl('g');
  const labels = svgEl('g', {
    class: 'poem-graph-labels',
    'aria-hidden': 'true',
  });
  world.append(links, flows, stars, labels);
  svg.append(starSymbol(), world);
  container.append(svg);

  const half = NODE_SIZE / 2;
  const nodes: PoemNode[] = graph.poems.map((poem) => {
    const isRead = read.has(poem.slug);
    // A read poem is a link to it; a locked one goes nowhere.
    const el = isRead
      ? svgEl('a', { href: poemPath(poem.slug), 'aria-label': poem.lines[0] })
      : svgEl('g', { 'aria-hidden': 'true' });
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
    // Where its star is on the screen, worked out rather than measured:
    // the dialog asks every frame, just after the stars have moved, and
    // measuring then would make the browser lay out the page there and
    // then. The web fills the window from its top left corner.
    const rect = () => {
      const { k, x, y } = zoomTransform(svg);
      const node = self;
      return {
        x: x + ((node.x ?? 0) - half) * k,
        y: y + ((node.y ?? 0) - half) * k,
        width: NODE_SIZE * k,
        height: NODE_SIZE * k,
      };
    };
    const self: PoemNode = {
      rect: () => {
        const r = rect();
        return new DOMRect(r.x, r.y, r.width, r.height);
      },
      slug: poem.slug,
      title: poem.lines[0],
      read: isRead,
      el,
      label: titleLabel(isRead ? poem.lines[0] : LOCKED_TITLE, isRead),
      near: new Set(),
      anchor: {
        element: container,
        rect,
        center: () => center(rect()),
        outline: () => rectPolygon(rect()),
      },
    };
    return self;
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
    source.near.add(target);
    target.near.add(source);
    const ends = Number(source.read) + Number(target.read);
    return {
      source,
      target,
      link,
      el: svgEl('line', {
        class: 'poem-graph-link',
        // Through CSS, which dims it further (see graph.css).
        style: `--opacity: ${LINK_OPACITY[ends]}`,
      }),
      // One dash, and a gap longer than any link, parked before the start
      // (with room for its square ends) until it fires.
      flow: svgEl('line', {
        class: 'poem-graph-flow',
        style: `--opacity: ${FLOW_OPACITY[ends]}`,
        'stroke-dasharray': `${SPECK} 100000`,
        'stroke-dashoffset': String(SPECK + 2),
      }),
    };
  });
  links.append(...edges.map((e) => e.el));
  flows.append(...edges.map((e) => e.flow));
  // Only links to a poem that's been read fire, so locked parts stay still.
  if (!prefersReducedMotion()) {
    const firing = new AbortController();
    disposer.add(() => firing.abort());
    for (const edge of edges) {
      if (FLOW_OPACITY[Number(edge.source.read) + Number(edge.target.read)]) {
        fireNowAndThen(edge, firing.signal);
      }
    }
  }
  stars.append(...nodes.map((n) => n.el));
  labels.append(...nodes.map((n) => n.label));

  // The poem in focus: the one tapped (with its dialog open), or else the
  // one the mouse is on, or else the one tabbed to. Its title and its
  // neighbours' show, and it pushes the others back to make room.
  let shown: PoemNode | null = null;
  /** `shown`'s dialog, once it opens. */
  let shownView: unknown = null;
  let hovered: PoemNode | null = null;
  let tabbed: PoemNode | null = null;
  let focused: PoemNode | null = null;
  const repel = forceManyBody<PoemNode>().strength((n) =>
    n === focused ? REPEL * SHOWN_REPEL : REPEL
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
  disposer.add(() => simulation.stop());
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
    drawLabels();
    dialogs.reposition();
    repositionTooltip();
  }
  // Titles stay the same size however far in or out: each is scaled back
  // by the zoom, under its star.
  let scale = 1;
  function drawLabels() {
    for (const { label, x, y } of nodes) {
      label.setAttribute(
        'transform',
        `translate(${x},${y}) scale(${1 / scale}) translate(0,${half * scale})`
      );
    }
  }
  draw();

  // Moving around: drag the background, wheel or pinch to zoom. Starts with
  // the middle of the graph in the middle of the window.
  // The view's size, given rather than measured: d3 measures it each time
  // the view moves, and the glide to a tapped poem moves it every frame.
  let viewSize: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0],
  ];
  const measureView = () => {
    viewSize = [
      [0, 0],
      [container.clientWidth, container.clientHeight],
    ];
  };
  measureView();
  disposer.listen(window, 'resize', measureView);
  const zoomer = zoom<SVGSVGElement, unknown>()
    .extent(() => viewSize)
    .scaleExtent(ZOOM_RANGE)
    .on('start', () => container.classList.add('is-panning'))
    .on(
      'zoom',
      (e: {
        transform: { k: number; toString(): string };
        sourceEvent: Event | null;
      }) => {
        // Moving around yourself (not a glide, which has no event of its
        // own) stops any glide, and keeps where you've moved to.
        if (e.sourceEvent) {
          fitting++;
          before = null;
        }
        world.setAttribute('transform', e.transform.toString());
        scale = e.transform.k;
        container.classList.toggle(
          'shows-labels',
          scale >= LABEL_ZOOM[currentLayout()]
        );
        drawLabels();
        dialogs.reposition();
        repositionTooltip();
      }
    )
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
      // The poem in focus stays put where it's dropped.
      if (e.subject !== focused) e.subject.fx = e.subject.fy = null;
    });
  selectAll<SVGElement, PoemNode>(nodes.map((n) => n.el))
    .data(nodes)
    .call(dragger);

  /**
   * Puts the poem that should be in focus there: its neighbours' titles
   * show, the rest dims, and it pushes the others back, held still so it
   * doesn't slide out from under the pointer. Its own title is in a
   * tooltip, or in its dialog when it's tapped, rather than under it.
   */
  function refocus() {
    const next = shown ?? hovered ?? tabbed;
    if (next && next !== shown) {
      showTooltip(next.read ? next.title : LOCKED_TITLE, next.rect);
    } else {
      hideTooltip();
    }
    if (next === focused) return;
    if (focused) focused.fx = focused.fy = null;
    focused = next;
    if (focused) {
      focused.fx = focused.x;
      focused.fy = focused.y;
    }
    container.classList.toggle('is-focusing', focused !== null);
    for (const n of nodes) {
      const near = focused !== null && (n === focused || focused.near.has(n));
      for (const el of [n.el, n.label]) {
        el.classList.toggle('is-near', near);
        el.classList.toggle('is-focused', n === focused);
      }
    }
    for (const e of edges) {
      const near =
        focused !== null && (e.source === focused || e.target === focused);
      e.el.classList.toggle('is-near', near);
      e.flow.classList.toggle('is-near', near);
    }
    // Strengths are read when set, so setting it again picks up the change.
    repel.strength(repel.strength());
    if (!still) simulation.alpha(Math.max(simulation.alpha(), STIR)).restart();
  }

  // On touch, which has no hover, a tap shows the poem's title in a dialog
  // with a button to read it; tapping it again, or off the poems, puts it
  // away. It opens at once, not drawn out like the site's other dialogs.
  const show = (node: PoemNode) => {
    shown = node;
    // The dialog open now (another poem's) closes to make way for this
    // one's; that isn't this one being put away.
    shownView = null;
    refocus();
    return dialogs
      .open({
        anchor: node.anchor,
        content: titleDialog(node),
        modal: false,
        animate: false,
        // It stays put as the view zooms out around it (fitNear), rather
        // than jumping to the other half of a phone's screen when the
        // poem crosses the middle.
        fixed: true,
      })
      .then(() => {
        if (shown === node) fitNear(node);
      });
  };

  /**
   * Zooms out (never in) and pans, if it has to, so `node`, its neighbours
   * and their titles are all in the room its dialog leaves.
   */
  let fitting = 0;
  // A glide still going stops, and one waiting for a dialog doesn't start.
  disposer.add(() => {
    fitting++;
    shown = null;
  });
  /** Where the view was before it zoomed out for a tapped poem. */
  let before: { k: number; x: number; y: number } | null = null;
  function fitNear(node: PoemNode) {
    const room = freeRoom();
    if (!room) return;
    const group = [node, ...node.near];
    // Each poem's reach from its centre on the screen at zoom `k`: its
    // star, and under it its title (which stays the same size), if shown.
    const extent = (k: number) => {
      const box = {
        left: Infinity,
        right: -Infinity,
        top: Infinity,
        bottom: -Infinity,
      };
      for (const n of group) {
        const titled = n !== node && n.read;
        const size = titled ? n.label.getBBox() : null;
        const across = Math.max(half * k, (size?.width ?? 0) / 2);
        const x = (n.x ?? 0) * k;
        const y = (n.y ?? 0) * k;
        box.left = Math.min(box.left, x - across);
        box.right = Math.max(box.right, x + across);
        box.top = Math.min(box.top, y - half * k);
        box.bottom = Math.max(
          box.bottom,
          y + half * k + (size ? size.y + size.height : 0)
        );
      }
      return box;
    };
    const now = zoomTransform(svg);
    const inside = (k: number, x: number, y: number) => {
      const box = extent(k);
      return (
        box.left + x >= room.left &&
        box.right + x <= room.right &&
        box.top + y >= room.top &&
        box.bottom + y <= room.bottom
      );
    };
    if (inside(now.k, now.x, now.y)) return;
    // The closest zoom at which they fit, centred in the room.
    let k = now.k;
    const fits = (k: number) => {
      const box = extent(k);
      return (
        box.right - box.left <= room.right - room.left &&
        box.bottom - box.top <= room.bottom - room.top
      );
    };
    while (k > ZOOM_RANGE[0] && !fits(k)) k = Math.max(k * 0.95, ZOOM_RANGE[0]);
    const box = extent(k);
    const x = (room.left + room.right) / 2 - (box.left + box.right) / 2;
    const y = (room.top + room.bottom) / 2 - (box.top + box.bottom) / 2;
    before ??= now;
    moveTo(k, x, y);
  }

  /**
   * The part of the web on screen not under the open dialog or the links
   * at the top, less `FIT_MARGIN` all round: the bigger side of the dialog.
   */
  function freeRoom() {
    const dialog = document.querySelector('.dialog')?.getBoundingClientRect();
    const nav = document
      .querySelector('.poem-graph-back')
      ?.getBoundingClientRect();
    const view = container.getBoundingClientRect();
    let top = Math.max(view.top, nav?.bottom ?? view.top);
    let bottom = view.bottom;
    if (dialog) {
      if (dialog.top - top > bottom - dialog.bottom) bottom = dialog.top;
      else top = Math.max(top, dialog.bottom);
    }
    const room = {
      left: view.left + FIT_MARGIN,
      right: view.right - FIT_MARGIN,
      top: top + FIT_MARGIN,
      bottom: bottom - FIT_MARGIN,
    };
    return room.right > room.left && room.bottom > room.top ? room : null;
  }

  /** Moves the view to zoom `k` at `x`, `y`, gliding there unless still. */
  function moveTo(k: number, x: number, y: number) {
    const from = zoomTransform(svg);
    const id = ++fitting;
    const start = performance.now();
    const step = (time: number) => {
      if (id !== fitting) return;
      const t = still ? 1 : Math.min((time - start) / FIT_MS, 1);
      // Eased out: quick, then settling.
      const e = 1 - (1 - t) ** 3;
      const at = (a: number, b: number) => a + (b - a) * e;
      select(svg).call(
        zoomer.transform,
        zoomIdentity
          .translate(at(from.x, x), at(from.y, y))
          .scale(at(from.k, k))
      );
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const hide = (node = shown) => {
    if (!node || shown !== node) return;
    setUnshown();
    return dialogs.close();
  };
  function setUnshown() {
    shown = null;
    refocus();
    // Back to where it was before it zoomed out for the dialog.
    if (before) {
      moveTo(before.k, before.x, before.y);
      before = null;
    }
  }
  // Which kind of pointer pressed last, so a click knows if it was a tap.
  let pointer = 'mouse';
  container.addEventListener(
    'pointerdown',
    (e) => {
      pointer = e.pointerType;
      if (!(e.target as Element).closest('.poem-graph-node')) void hide();
    },
    { capture: true }
  );
  // Its close button and Esc, too. Only for `shown`'s own dialog, not when
  // another poem's replaces it.
  disposer.add(
    dialogs.events.on('open', ({ view, anchor }) => {
      shownView = anchor === shown?.anchor ? view : null;
    })
  );
  disposer.add(
    dialogs.events.on('close', ({ view }) => {
      if (shown && view === shownView) setUnshown();
    })
  );
  // Esc puts away the tooltip (see tooltip.ts), and with it the focus.
  disposer.listen(document, 'keydown', (e) => {
    if (e.key !== 'Escape' || (!hovered && !tabbed)) return;
    hovered = tabbed = null;
    refocus();
  });
  for (const node of nodes) {
    node.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      hovered = node;
      refocus();
    });
    node.el.addEventListener('pointerleave', () => {
      if (hovered !== node) return;
      hovered = null;
      refocus();
    });
    // From the keyboard only: a tap focuses the poem too, but has its
    // dialog for that.
    node.el.addEventListener('focus', () => {
      if (!node.el.matches(':focus-visible')) return;
      tabbed = node;
      refocus();
    });
    node.el.addEventListener('blur', () => {
      if (tabbed !== node) return;
      tabbed = null;
      refocus();
    });
    node.el.addEventListener('click', (e) => {
      // Modified clicks (a new tab, say) still go straight to the poem.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // A mouse or the keyboard (no pointer: detail 0) has its title
      // showing already, so it goes to read it.
      const tap = e.detail > 0 && pointer !== 'mouse';
      if (!tap) {
        if (!node.read) e.preventDefault();
        return;
      }
      e.preventDefault();
      void (shown === node ? hide() : show(node));
    });
  }
  loaded(container);
  return () => disposer.dispose();
}

/**
 * Fires `edge` now and then: its speck crosses it at `FIRE_SPEED`, then
 * it waits its own while (see `FIRE_GAP`), the first time from a random
 * point in that, so links don't fire together. The speck only moves while
 * it's crossing; the rest of the time there's nothing to redraw. Stops for
 * good when `signal` aborts.
 */
function fireNowAndThen(edge: Edge, signal: AbortSignal): void {
  const wait = () =>
    ((FIRE_GAP.min + Math.random() * (FIRE_GAP.max - FIRE_GAP.min)) /
      FIRE_SPEED) *
    1000;
  const fire = () => {
    const { source, target } = edge;
    const length = Math.hypot(
      (target.x ?? 0) - (source.x ?? 0),
      (target.y ?? 0) - (source.y ?? 0)
    );
    // Its glow only while it crosses: a glow over every link's speck at
    // once covers the whole web, and that's costly to draw.
    edge.flow.classList.add('is-firing');
    const crossing = edge.flow.animate(
      [{ strokeDashoffset: SPECK + 2 }, { strokeDashoffset: -length - 2 }],
      { duration: ((length + SPECK + 4) / FIRE_SPEED) * 1000 }
    );
    signal.addEventListener('abort', () => crossing.cancel(), { once: true });
    crossing.finished.then(
      () => {
        edge.flow.classList.remove('is-firing');
        timer = setTimeout(fire, wait());
      },
      () => undefined
    );
  };
  let timer = setTimeout(fire, Math.random() * wait());
  signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
}

/**
 * A poem's title (or `LOCKED_TITLE`), to go under its star: in lines of
 * at most `LABEL_WIDTH` letters, broken between words.
 */
function titleLabel(title: string, read: boolean): SVGGElement {
  const lines: string[] = [];
  for (const word of title.split(' ')) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= LABEL_WIDTH) {
      lines[last] += ` ${word}`;
    } else {
      lines.push(word);
    }
  }
  const text = svgEl('text', { 'text-anchor': 'middle' });
  lines.forEach((line, i) => {
    const span = svgEl('tspan', {
      x: '0',
      y: String(LABEL_TOP + i * LABEL_LINE),
    });
    span.textContent = line;
    text.append(span);
  });
  const label = svgEl('g', {
    class: read ? 'poem-graph-label' : 'poem-graph-label is-locked',
  });
  label.append(text);
  return label;
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

/**
 * Every link in a table, for checking them: the debug key shows it.
 * Returns a function that takes it away.
 */
function installDebugTable(): Cleanup {
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
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== DEBUG_KEY || e.repeat || e.ctrlKey || e.metaKey) return;
    panel.hidden = !panel.hidden;
  };
  document.addEventListener('keydown', onKey);
  return () => {
    panel.remove();
    document.removeEventListener('keydown', onKey);
  };
}
