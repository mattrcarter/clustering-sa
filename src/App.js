import "./styles.css";

export default function App() {
  return (
    <div className="App">
      <h1>Clustering</h1>
      <button onClick={() => cluster(false)}>Cluster</button>
      <button onClick={() => cluster(true)}>Cluster with animation</button>
      <div
        className="sticky yellow"
        data-cluster="1"
        style={{ left: 250, top: 750 }}
      >
        Sticky 1
      </div>
      <div
        className="sticky yellow"
        data-cluster="1"
        style={{ left: 275, top: 275 }}
      >
        Sticky 2
      </div>
      <div
        className="sticky blue"
        data-cluster="2"
        style={{ left: 395, top: 265 }}
      >
        Sticky 3
      </div>
      <div
        className="sticky blue"
        data-cluster="2"
        style={{ left: 695, top: 465 }}
      >
        Sticky 4
      </div>
      <div
        className="sticky yellow"
        data-cluster="1"
        style={{ left: 605, top: 485 }}
      >
        Sticky 5
      </div>
    </div>
  );
}

const DIFFERENT_CLUSTER_OVERLAP_COEFFICIENT = 4;
const CLUSTER_BOUNDING_BOX_COEFFICIENT = 3;
const OVERLAP_COEFFICIENT = 2;

function cluster(async) {
  const stickies = Array.from(document.querySelectorAll(".sticky")).map((s) => {
    const rect = s.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      cluster: s.getAttribute("data-cluster")
    };
  });

  async ? annealAsync(stickies) : anneal(stickies);
}

function annealAsync(stickies) {
  let T = 1.0;
  let T_min = 0.7; //0.00001;
  let alpha = 0.9;
  let iterationsPerTemp = 500;

  let oldCost = calculateCost(stickies);

  setTimeout(() => {
    annealAsyncWorker(stickies, oldCost, T, T_min, alpha, 0, iterationsPerTemp);
  }, 0);
}

function annealAsyncWorker(
  stickies,
  bestCost,
  temp,
  tempMin,
  alpha,
  i,
  iterationsPerTemp
) {
  console.log("temp", temp);
  console.log("i", i);

  if (i < iterationsPerTemp) {
    i++;
  } else {
    i = 0;
    temp *= alpha;
  }

  if (temp > tempMin) {
    const best = evalNeighbor(stickies, bestCost, temp);
    stickies = best.stickies;
    bestCost = best.bestCost;

    setTimeout(() => {
      annealAsyncWorker(
        stickies,
        bestCost,
        temp,
        tempMin,
        alpha,
        i,
        iterationsPerTemp
      );
    }, 0);
  }
}

function anneal(stickies) {
  let T = 1.0;
  let T_min = 0.2; //0.00001;
  let alpha = 0.9;

  let oldCost = calculateCost(stickies);

  while (T > T_min) {
    let i = 1;
    while (i <= 500) {
      const best = evalNeighbor(stickies, oldCost, T);
      stickies = best.stickies;
      oldCost = best.bestCost;
      i++;
    }

    T = T * alpha;
  }
}

function evalNeighbor(stickies, bestCost, T) {
  const { newSolution, stickyIndex, axis, distance } = createNewSolution(
    stickies
  );
  const newCost = calculateCost(newSolution);

  const ap = calcAP(bestCost, newCost, T);

  if (ap > Math.random()) {
    stickies = newSolution;
    bestCost = newCost;

    const stickyElement = document.querySelectorAll(".sticky")[stickyIndex];
    if (axis === 0) {
      stickyElement.style.left =
        parseInt(stickyElement.style.left, 10) + distance + "px";
    } else {
      stickyElement.style.top =
        parseInt(stickyElement.style.top, 10) + distance + "px";
    }
  }

  return { stickies, bestCost };
}

function createNewSolution(stickies) {
  const newSolution = JSON.parse(JSON.stringify(stickies));

  const stickyIndex = Math.floor(Math.random() * stickies.length);
  const axis = Math.round(Math.random());
  const distance = Math.random() <= 0.5 ? -5 : 5;

  if (axis === 0) {
    newSolution[stickyIndex].left = newSolution[stickyIndex].left + distance;
    newSolution[stickyIndex].right = newSolution[stickyIndex].right + distance;
  } else {
    newSolution[stickyIndex].top = newSolution[stickyIndex].top + distance;
    newSolution[stickyIndex].bottom =
      newSolution[stickyIndex].bottom + distance;
  }

  return { newSolution, stickyIndex, axis, distance };
}

function calculateCost(stickies) {
  const overlapCost = overlapOf(stickies);
  const clusterBoundingBoxesCost = clusterBoundingBoxes(stickies);
  const boundingBoxCost = totalBoundingBox(stickies);

  return overlapCost + clusterBoundingBoxesCost + boundingBoxCost;
}

function overlapOf(stickies) {
  let intersection = 0;
  for (let i = 0; i < stickies.length; i++) {
    for (let j = i + 1; j < stickies.length; j++) {
      const s1 = stickies[i];
      const s2 = stickies[j];
      intersection +=
        Math.max(0, Math.min(s1.right, s2.right) - Math.max(s1.left, s2.left)) *
        Math.max(0, Math.min(s1.bottom, s2.bottom) - Math.max(s1.top, s2.top));

      if (s1.cluster !== s2.cluster) {
        intersection *= DIFFERENT_CLUSTER_OVERLAP_COEFFICIENT;
      }
    }
  }
  return intersection * OVERLAP_COEFFICIENT;
}

function clusterBoundingBoxes(stickies) {
  const groupedStickies = stickies.reduce((acc, curr) => {
    if (!acc.has(curr.cluster)) {
      acc.set(curr.cluster, []);
    }
    acc.get(curr.cluster).push(curr);
    return acc;
  }, new Map());

  let cost = 0;
  groupedStickies.forEach((g) => {
    const rights = g.map((s) => s.right);
    const lefts = g.map((s) => s.left);
    const bottoms = g.map((s) => s.bottom);
    const tops = g.map((s) => s.top);
    cost +=
      (Math.max(...rights) - Math.min(...lefts)) *
      (Math.max(...bottoms) - Math.min(...tops)) *
      CLUSTER_BOUNDING_BOX_COEFFICIENT;
  });

  return cost;
}

function totalBoundingBox(stickies) {
  const rights = stickies.map((s) => s.right);
  const lefts = stickies.map((s) => s.left);
  const bottoms = stickies.map((s) => s.bottom);
  const tops = stickies.map((s) => s.top);
  return (
    (Math.max(...rights) - Math.min(...lefts)) *
    (Math.max(...bottoms) - Math.min(...tops))
  );
}

function calcAP(oldCost, newCost, T) {
  return Math.exp(-(newCost - oldCost) / T);
}
