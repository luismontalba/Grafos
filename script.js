document.addEventListener('DOMContentLoaded', init);

function init() {
  loadFromLocalStorage();
  sortNodesByDate();
  fixCanvas();
  redraw();
  updateTagsFilter();
}

function redraw() {
	const allNodes = nodes.get();
	allNodes.forEach(node => {
	  nodes.update({id: node.id, shape: 'box'});
	});
	debouncedSaveToLocalStorage();
}

// Dating variables
const today = new Date();
const yyyy = today.getFullYear();
const MM = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const hh = String(today.getHours()).padStart(2, '0');
const mm = String(today.getMinutes()).padStart(2, '0');
const ss = String(today.getSeconds()).padStart(2, '0');
const getTodayDate = () => `${yyyy}-${MM}-${dd}`;
const getTodayLongDate = () => `${getTodayDate()}--${hh}-${mm}-${ss}`;

// HTML references
const container = document.getElementById('mynetwork');
const filterContainer = document.getElementById('filterContainer');
const filterTagsContainer = document.getElementById('filterTagsContainer');
const detailContainer = document.getElementById('detailContainer');
const labelInput = document.getElementById('labelInput');
const dateInput = document.getElementById('dateInput');
const descriptionInput = document.getElementById('descriptionInput');
const saveDetailButton = document.getElementById('saveDetailButton');
const tagInput = document.getElementById('tagInput');
const addTagButton = document.getElementById('addTagButton');
const tagsList = document.getElementById('tagsList');

// Debuncing function
const debounce = (func, wait) => {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

// Creating a network
const nodes = new vis.DataSet([
  {id: 1, label: 'Node 1\n2025-01-01', date: '2025-01-01', description: 'Descripción del Nodo 1', tags: ['tag1']},
  {id: 2, label: 'Node 2\n2025-02-01', date: '2025-02-01', description: 'Descripción del Nodo 2', tags: ['tag2']},
  {id: 3, label: 'Node 3\n2025-03-01', date: '2025-03-01', description: 'Descripción del Nodo 3', tags: ['tag3']},
  {id: 4, label: 'Node 4\n2025-04-01', date: '2025-04-01', description: 'Descripción del Nodo 4', tags: ['tag4']},
  {id: 5, label: 'Node 5\n2025-05-01', date: '2025-05-01', description: 'Descripción del Nodo 5', tags: ['tag5']}
]);

const edges = new vis.DataSet([
  {from: 1, to: 3, arrows: 'to'},
  {from: 1, to: 2, arrows: 'to'},
  {from: 2, to: 4, arrows: 'to'},
  {from: 2, to: 5, arrows: 'to'},
  {from: 4, to: 5, arrows: 'to'}
]);

const data = { nodes, edges };
const options = {
  interaction: {
    hover: true,
    multiselect: true,
    dragView: true
  },
  manipulation: {
    enabled: true,
    addNode: function (data, callback) {
      data.label = `Nuevo Nodo\n${getTodayDate()}`;
      data.date = getTodayDate();
      data.description = '';
      data.tags = [];
      callback(data);
      sortNodesByDate();
      debouncedSaveToLocalStorage();
    },
    addEdge: function (data, callback) {
      if (data.from !== data.to) {
        data.arrows = 'to';
        callback(data);
        sortNodesByDate();
        alertEdges();
        debouncedSaveToLocalStorage();
      }
    }
  },
  physics: {
    enabled: false,
    solver: 'forceAtlas2Based',
    forceAtlas2Based: {
      gravitationalConstant: -50,
      centralGravity: 0.01,
      springLength: 100,
      springConstant: 0.08,
    },
    minVelocity: 3,
    timestep: 0.35
  },
  nodes: { shape: 'box' },
  edges: {
    smooth: {
      type: 'continuous',
      forceDirection: 'none',
      roundness: 0.5
    }
  },
  layout: { randomSeed: 3 }
};

const network = new vis.Network(container, data, options);

function fixCanvas() {
  const canvas = document.getElementsByTagName('canvas')[0];
  canvas.setAttribute('height', '10000');
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
}

// Function sorting node by date
function sortNodesByDate() {
  const allNodes = nodes.get();
  allNodes.sort((a, b) => new Date(a.date) - new Date(b.date));
  let xPosition = -allNodes.length * 75;
  allNodes.forEach(node => {
    nodes.update({ id: node.id, x: xPosition });
    xPosition += 150;
  });
}

// Event saving node position
network.on("dragEnd", function (params) {
  params.nodes.forEach(nodeId => {
    const position = network.getPositions([nodeId])[nodeId];
    nodes.update({ id: nodeId, x: position.x, y: position.y });
  });
  sortNodesByDate();
  debouncedSaveToLocalStorage();
});

// Function alerting impossible edges going from future to past
function alertEdges() {
  const allNodes = nodes.get();
  const allEdges = edges.get();
  allEdges.forEach(edge => {
    const from = edge.from;
    const to = edge.to;
    const nodeFrom = allNodes.find(node => node.id === from);
    const nodeTo = allNodes.find(node => node.id === to);
    const dateFrom = nodeFrom.date;
    const dateTo = nodeTo.date;
    edges.update({
      id: edge.id,
      color: { color: dateFrom > dateTo ? "red" : "blue" }
    });
  });
}

// Displaying box with tags to be filtered
let tagsChecked = [];
function updateTagsFilter() {
  filterTagsContainer.innerHTML = '';
  const allNodes = nodes.get();
  const allTags = new Set();
  allNodes.forEach(node => {
    if (node.tags && Array.isArray(node.tags)) {
      node.tags.forEach(tag => allTags.add(tag));
    }
  });
  const arrayAllTags = Array.from(allTags).sort();
  arrayAllTags.forEach(tag => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = tag;
    checkbox.name = 'filterTag';
    checkbox.value = tag;
    if (tagsChecked.includes(tag)) {
      checkbox.checked = true;
    }
    const label = document.createElement('label');
    label.htmlFor = tag;
    label.appendChild(document.createTextNode(tag));
    const br = document.createElement('br');
    filterTagsContainer.appendChild(checkbox);
    filterTagsContainer.appendChild(label);
    filterTagsContainer.appendChild(br);
  });
}

// Event filtering nodes by selected tags
filterTagsContainer.addEventListener("change", function(event) {
  const allNodes = nodes.get();
  if (event.target.checked) {
    tagsChecked.push(event.target.value);
  } else {
    tagsChecked = tagsChecked.filter(item => item !== event.target.value);
  }
  allNodes.forEach(node => {
    nodes.update({id: node.id, shape: 'box'});
    node.tags.forEach(tag => {
      if (tagsChecked.includes(tag)) {
        nodes.update({id: node.id, shape: 'ellipse'});
      }
    });
  });
  debouncedSaveToLocalStorage();
});

// Event displaying node details
let selectedNodeId = null;
network.on("click", function (params) {
  if (params.nodes.length === 1) {
    selectedNodeId = params.nodes[0];
    const node = nodes.get(selectedNodeId);
    detailContainer.style.display = 'block';
    labelInput.value = node.label.split('\n')[0];
    dateInput.value = node.date;
    descriptionInput.value = node.description;
    updateTagsList(node.tags);
  }
});

// Event saving node details
saveDetailButton.addEventListener('click', function() {
  if (selectedNodeId !== null) {
    const newLabel = labelInput.value;
    const newDate = dateInput.value;
    const newDescription = descriptionInput.value;
    const newTags = getTagsFromUI();
    nodes.update({
      id: selectedNodeId,
      label: `${newLabel}\n${newDate}`,
      date: newDate,
      description: newDescription,
      tags: newTags
    });
    detailContainer.style.display = 'none';
    sortNodesByDate();
    alertEdges();
    updateTagsFilter();
    debouncedSaveToLocalStorage();
  }
});

// Managing tags in node details
addTagButton.addEventListener('click', function() {
  if (selectedNodeId !== null) {
    const tag = tagInput.value.trim();
    if (tag) {
      const node = nodes.get(selectedNodeId);
      if (!node.tags.includes(tag)) {
        node.tags.push(tag);
        nodes.update(node);
        updateTagsList(node.tags);
        tagInput.value = '';
      }
    }
  }
});

function updateTagsList(tags) {
  tagsList.innerHTML = '';
  tags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    const deleteButton = document.createElement('span');
    deleteButton.className = 'delete-tag';
    deleteButton.textContent = 'x';
    deleteButton.addEventListener('click', function() {
      const node = nodes.get(selectedNodeId);
      node.tags = node.tags.filter(t => t !== tag);
      nodes.update(node);
      updateTagsList(node.tags);
    });
    tagElement.appendChild(deleteButton);
    tagsList.appendChild(tagElement);
  });
}

function getTagsFromUI() {
  const tags = [];
  tagsList.querySelectorAll('.tag').forEach(tagElement => {
    tags.push(tagElement.textContent.slice(0, -1));
  });
  return tags;
}

// Loading from local Storage
function loadFromLocalStorage() {
  const storedData = localStorage.getItem('graphData');
  if (storedData) {
    const graphData = JSON.parse(storedData);
    nodes.clear();
    nodes.add(graphData.nodes);
    edges.clear();
    edges.add(graphData.edges);
  }
}

// Saving to local storage
function saveToLocalStorage() {
  const graphData = {
    nodes: nodes.get(),
    edges: edges.get()
  };
  localStorage.setItem('graphData', JSON.stringify(graphData));
}
const debouncedSaveToLocalStorage = debounce(saveToLocalStorage, 1000);
document.getElementById('saveButton').addEventListener('click', debouncedSaveToLocalStorage);

// Clearing local storage
document.getElementById('clearButton').addEventListener('click', () => localStorage.clear());

// Exporting datos to JSON file
document.getElementById('exportButton').addEventListener('click', function() {
  const graphData = {
    nodes: nodes.get().map(node => {
      const position = network.getPositions([node.id])[node.id];
      return {...node, x: position.x, y: position.y};
    }),
    edges: edges.get()
  };
  const fileName = window.location.pathname.split('/').pop().split('.').slice(0, -1).join('.');
  const blob = new Blob([JSON.stringify(graphData)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_${getTodayLongDate()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Importing data from JSON file
document.getElementById('importButton').addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(event) {
    const graphData = JSON.parse(event.target.result);
    nodes.clear();
    nodes.add(graphData.nodes);
    edges.clear();
    edges.add(graphData.edges);
    sortNodesByDate();
    alertEdges();
    debouncedSaveToLocalStorage();
  };
  reader.readAsText(file);
});
