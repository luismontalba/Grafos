document.addEventListener('DOMContentLoaded', init);

// starting
function init() {
  loadFromLocalStorage();
  fixCanvas();
  fixDraw();
  updateView();
}

function fixDraw() {
  const allNodes = nodes.get();
  allNodes.forEach(node => {
    nodes.update({id: node.id, shape: 'box'});
  });
  debouncedSaveToLocalStorage();
}

// Auxiliar tools
// Debuncing function
const debounce = (func, wait) => {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

// Function formating dates
function formatDate (date) {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd}`;
}

//Function long formating dates
function formatLongDate (date) {
  const shortDate = formatDate(date);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return shortDate+`--${hh}-${mm}-${ss}`;
}

// Function to add days to a date 
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Dating variables
const today = new Date();
const getTodayDate = () => formatDate(today);
const getTodayLongDate = () => formatLongDate(today);

// Building the view
// HTML references
const container = document.getElementById('mynetwork');
const filterContainer = document.getElementById('filterContainer');
const filterTagsContainer = document.getElementById('filterTagsContainer');
const updateToday = document.getElementById('updateToday');
const optimizeDates = document.getElementById('optimizeDates');
const detailContainer = document.getElementById('detailContainer');
const labelInput = document.getElementById('labelInput');
const dateInput = document.getElementById('dateInput');
const cdateInput = document.getElementById('cdateInput');
const timeInput = document.getElementById('timeInput');
const descriptionInput = document.getElementById('descriptionInput');
const saveDetailButton = document.getElementById('saveDetailButton');
const tagInput = document.getElementById('tagInput');
const addTagButton = document.getElementById('addTagButton');
const tagsList = document.getElementById('tagsList');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');

// Creating a network
const nodes = new vis.DataSet([
  {id: 1, label: 'Node 1\n2025-01-01', date: '2025-01-01', cdate: '', time: '0',description: 'Descripción del Nodo 1', tags: ['tag1']},
  {id: 2, label: 'Node 2\n2025-02-01', date: '2025-02-01', cdate: '', time: '40', description: 'Descripción del Nodo 2', tags: ['tag2']},
  {id: 3, label: 'Node 3\n2025-03-01', date: '2025-03-01', cdate: '', time: '0', description: 'Descripción del Nodo 3', tags: ['tag3']},
  {id: 4, label: 'Node 4\n2025-04-01', date: '2025-04-01', cdate: '', time: '10', description: 'Descripción del Nodo 4', tags: ['tag4']},
  {id: 5, label: 'Node 5\n2025-05-01', date: '2025-05-01', cdate: '', time: '0', description: 'Descripción del Nodo 5', tags: ['tag5']}
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
    hover: false,
    multiselect: true,
    dragView: true,
    selectable: true,
    selectConnectedEdges: false,
  },
  manipulation: {
    enabled: true,
    addNode: function (data, callback) {
      data.label = `Nuevo Nodo\n${getTodayDate()}`;
      data.date = getTodayDate();
      data.cdate = '';
      data.time = '0';
      data.description = '';
      data.tags = [];
      callback(data);
      updateView();
    },
    addEdge: function (data, callback) {
      if (data.from !== data.to) {
        data.arrows = 'to';
        callback(data);
        updateView();
      }
    }
  },
  physics: {
    enabled: false,
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

// Updating the view
function updateView() {
  sortNodesByDate();
  alertEdges();
  dateCalc();
  updateTagsFilter();
  debouncedSaveToLocalStorage();
}

// Function sorting nodes by date
function sortNodesByDate() {
  const allNodes = nodes.get();
  allNodes.sort((a, b) => {
    const dateComparison = new Date(a.date) - new Date(b.date);
    return dateComparison !== 0 ? dateComparison : b.y - a.y;
  });
  let xPosition = -allNodes.length * 75;
  let yPosition = allNodes.length * 75;
  let date = new Date(0);
  let children = [];
  allNodes.forEach(node => {
    const connectedNodes = network.getConnectedNodes(node.id, 'to');
    if (node.date > date) {
      children = connectedNodes;
      xPosition += 125;
    } else {
      children.push(...connectedNodes);
      if (children.flat().includes(node.id)) {
        xPosition += 125;
      } 
    }
    yPosition -= 75;
    date = node.date;
    nodes.update({ id: node.id, x: xPosition, y: yPosition });
  });
}

// Function alerting impossible edges going from future to past
function alertEdges() {
  const allNodes = nodes.get();
  const allEdges = edges.get();
  allEdges.forEach(edge => {
    const from = edge.from;
    const to = edge.to;
    const nodeFrom = allNodes.find(node => node.id === from);
    const nodeTo = allNodes.find(node => node.id === to);
    edges.update({
      id: edge.id,
      color: { color: nodeFrom.date > nodeTo.date || nodeFrom.y < nodeTo.y ? "red" : "blue" }
    });
  });
}

// Function calculating date
function dateCalc() {
  const allNodes = nodes.get();
  allNodes.sort((a, b) => {
    const dateComparison = new Date(a.date) - new Date(b.date);
    return dateComparison !== 0 ? dateComparison : b.y - a.y;
  });
  allNodes.forEach(node => {
    const parentsIds = network.getConnectedNodes(node.id, 'from');
    const parentsNodes = nodes.get(parentsIds);
    if (parentsNodes.length > 0) {
      const datesFromParents = parentsNodes.map(parent => addDays(new Date(parent.date), Number(node.time)));
      const newCdate = formatDate(new Date(Math.max.apply(null, datesFromParents)));
      nodes.update({
        id: node.id,
        cdate: newCdate,
        font: { color: new Date(node.date) < new Date(node.cdate) ? "red" : "#343434" }
      });
    } else {
      nodes.update({
        id: node.id,
        cdate: node.date,
        font: { color: "#343434" }
      });
    }
    const criticalParents = parentsNodes.filter(parent => parent.date === formatDate(addDays(new Date(node.cdate), -Number(node.time))));
    const parentsEdgesIds = network.getConnectedEdges(node.id);
    const parentsEdges = edges.get(parentsEdgesIds);
    parentsEdges.forEach(edge => {
      edges.update({
        id: edge.id,
        color: { color: criticalParents.map(parent => parent.id).includes(edge.from) && new Date(node.date) < new Date(node.cdate) ? "red" : "blue" }
      });
    });
  });
}

// Function updating box with tags to be filtered
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

// Working with network
// Event saving node position
network.on("dragEnd", function (params) {
  params.nodes.forEach(nodeId => {
    const position = network.getPositions([nodeId])[nodeId];
    nodes.update({ id: nodeId, x: position.x, y: position.y });
  });
  updateView();
});

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

// Event updating to today date
updateToday.addEventListener('click', function(event) {
  const today = getTodayDate();
  const allNodes = nodes.get();
  allNodes.forEach(node => {
    if (node.date < today) {
      nodes.update({
        id: node.id,
        date: today,
        label: `${node.label.split('\n')[0]}\n${today}`
      });
    }
  })
  updateView();
});

// Event optimizing dates
optimizeDates.addEventListener('click', function(event) {
  const allNodes = nodes.get();
  allNodes.sort((a, b) => {
    const dateComparison = new Date(a.date) - new Date(b.date);
    return dateComparison !== 0 ? dateComparison : b.y - a.y;
  });
  allNodes.forEach(node => {
    const getNode = nodes.get(node.id);
    dateCalc();
    nodes.update({id: getNode.id, date: getNode.cdate, label: `${getNode.label.split('\n')[0]}\n${getNode.cdate}`,});
  });
  updateView();
});

// Woking with details
// Event displaying node details
let selectedNodeId = null;
network.on("click", function (params) {
  if (params.nodes.length === 1) {
    selectedNodeId = params.nodes[0];
    const node = nodes.get(selectedNodeId);
    detailContainer.style.display = 'block';
    labelInput.value = node.label.split('\n')[0];
    dateInput.value = node.date;
    dateInput.style.color = new Date(node.date) < new Date(node.cdate) ? 'red' : 'black';
    cdateInput.value = node.cdate;
    timeInput.value = node.time;
    descriptionInput.value = node.description;
    updateTagsList(node.tags);
  } else {
    detailContainer.style.display = 'none';
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

// Event saving node details
saveDetailButton.addEventListener('click', function() {
  if (selectedNodeId !== null) {
    const newLabel = labelInput.value;
    const newDate = dateInput.value;
    const newTime = timeInput.value;
    const newDescription = descriptionInput.value;
    const newTags = getTagsFromUI();
    nodes.update({
      id: selectedNodeId,
      label: `${newLabel}\n${newDate}`,
      date: newDate,
      time: newTime,
      description: newDescription,
      tags: newTags
    });
    detailContainer.style.display = 'none';
    dateCalc(); // Tu update with cdate calculated
    updateView();
  }
});

// Managing persistence
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

// Exporting datos to JSON file
exportButton.addEventListener('click', function() {
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
importButton.addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(event) {
    const graphData = JSON.parse(event.target.result);
    nodes.clear();
    nodes.add(graphData.nodes);
    edges.clear();
    edges.add(graphData.edges);
    updateView();
  };
  reader.readAsText(file);
});
