
import { fetchJSON, renderProjects } from './global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load existing projects
const loadedProjects = await fetchJSON('./lib/projects.json');

const projects = Array.isArray(loadedProjects)
  ? loadedProjects.filter(project =>
      !String(project.title ?? '')
        .toLowerCase()
        .includes('placeholder')
    )
  : [];

// DSC 106 Lab 07: Bikewatching
projects.unshift({
  title: 'Bikewatching — Boston Bluebikes Traffic Visualization',
  year: 2026,
  image: 'bikewatching.png',
  description:
    'Interactive map of March 2024 Bluebikes traffic in Boston and Cambridge, featuring bike lanes, station activity, time filtering, and arrival/departure patterns.',
  background:
    'Explore how bicycle traffic varies by location and time of day.',
  methods: [
    'Mapped bike lanes and stations with Mapbox GL JS and SVG.',
    'Used D3 to size and color station markers by trip activity.',
    'Added interactive time filtering and station tooltips.'
  ],
  takeaways: [
    'Explore trip volume and the balance of arrivals and departures across stations.'
  ],
  tools: 'JavaScript, D3.js, Mapbox GL JS, SVG, HTML, CSS',
  url: 'https://maggieshao596.github.io/bikewatching/'
});

// Elements
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

const colors = d3.scaleOrdinal(d3.schemeTableau10);

let query = '';
let selectedYear = null;

// Search projects
function matchesSearch(project) {
  return Object.values(project)
    .flat()
    .join(' ')
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

// Filter by search and year
function getFilteredProjects() {
  return projects.filter(project =>
    matchesSearch(project) &&
    (
      selectedYear === null ||
      String(project.year ?? 'Unknown') === selectedYear
    )
  );
}

// Toggle selected year
function toggleYear(year) {
  selectedYear = selectedYear === year ? null : year;
  updateProjects();
}

// Render pie chart and legend
function renderPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  const data = d3.rollups(
    projectsGiven,
    values => values.length,
    d => String(d.year ?? 'Unknown')
  ).map(([label, value]) => ({
    label,
    value
  }));

  const total = d3.sum(data, d => d.value);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  pie(data).forEach(slice => {
    const year = slice.data.label;

    const percentage = total
      ? slice.data.value / total * 100
      : 0;

    svg.append('path')
      .attr('d', arc(slice))
      .attr('fill', colors(year))
      .classed('selected', selectedYear === year)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', `${year}: ${percentage.toFixed(1)}%`)
      .on('click', () => toggleYear(year))
      .on('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleYear(year);
        }
      });

    const [x, y] = arc.centroid(slice);

    svg.append('text')
      .attr('class', 'percentage-label')
      .attr('x', x)
      .attr('y', y)
      .text(`${percentage.toFixed(1)}%`);
  });

  data.forEach(item => {
    const year = item.label;

    const percentage = total
      ? item.value / total * 100
      : 0;

    const li = legend.append('li')
      .style('--color', colors(year))
      .classed('selected', selectedYear === year)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', `Filter projects from ${year}`)
      .on('click', () => toggleYear(year))
      .on('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleYear(year);
        }
      });

    li.append('span')
      .attr('class', 'swatch');

    li.append('span')
      .text(
        `${year} (${item.value}, ${percentage.toFixed(1)}%)`
      );
  });
}

// Update project cards
function updateProjects() {
  const filteredProjects = getFilteredProjects();

  renderProjects(
    filteredProjects,
    projectsContainer,
    'h2'
  );

  // Ensure project links appear correctly
  const cards = projectsContainer
    ?.querySelectorAll('.project-card') ?? [];

  filteredProjects.forEach((project, i) => {
    const destination = project.url || project.link;

    if (!destination || !cards[i]) return;

    let anchor = cards[i].querySelector('.project-link');

    if (!anchor) {
      anchor = document.createElement('a');
      anchor.className = 'project-link';
      cards[i].append(anchor);
    }

    anchor.href = destination;

    anchor.textContent = project.title.startsWith('Bikewatching')
      ? 'View Interactive Visualization →'
      : 'View Project →';

    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  });

  if (projectsTitle) {
    projectsTitle.textContent =
      `Projects (${filteredProjects.length})`;
  }

  renderPieChart(
    projects.filter(matchesSearch)
  );
}

// Search bar interaction
if (searchInput) {
  searchInput.addEventListener('input', event => {
    query = event.target.value;

    const availableYears = projects
      .filter(matchesSearch)
      .map(project =>
        String(project.year ?? 'Unknown')
      );

    if (
      selectedYear !== null &&
      !availableYears.includes(selectedYear)
    ) {
      selectedYear = null;
    }

    updateProjects();
  });
}

// Initialize
updateProjects();

