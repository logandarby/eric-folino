# TODO

Nothing right now.

- edit video for enter screen
- make some kind of navigation page... i don't think /iris will work.
- poem wiki (proof of concept at /poems/, see README):
  - a page layout per poem, picked at random
  - slowly unlock portions of the graph, to encourage exploration

Maybe what we could use for graphs:

> Yes. For the smooth, springy repositioning you describe, I’d start with d3-force + Canvas. d3-force handles the physics—links pull together, nodes repel, and velocity damping gives motion a sense of inertia—while Canvas keeps you from creating a DOM element for every node. Its many-body force uses a quadtree-based approximation, which helps as graphs grow.
> If you’d rather start with a ready-made component, try force-graph (or react-force-graph for React). It combines Canvas rendering with d3-force, supports dynamically changing graphs, and exposes the simulation settings for tuning the motion.
